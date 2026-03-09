import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Response } from "express";
import type { Pool } from "pg";
import {
  createStudentHandler,
  deleteStudentHandler,
  getStudentByIdHandler,
  getStudentsHandler,
  updateStudentHandler,
} from "./src/controller/students.ts";
import {
  startStudentsQueueWorker,
  stopStudentsQueueWorker,
  subscribeStudentsUpdates,
} from "./src/worker/students.ts";
import { closeRedisConnection, ensureRedisConnection } from "./src/util/cache.ts";
import { closeDatabase, connectDatabase, ensureStudentsTable } from "./src/util/database.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number.parseInt(process.env.PORT || "3000", 10);

interface AppLike {
  use: (...args: unknown[]) => unknown;
  get: (route: string, handler: (...args: unknown[]) => unknown) => unknown;
  post: (route: string, handler: (...args: unknown[]) => unknown) => unknown;
  put: (route: string, handler: (...args: unknown[]) => unknown) => unknown;
  delete: (route: string, handler: (...args: unknown[]) => unknown) => unknown;
  listen?: (port: number, callback: () => void) => { close: (cb: () => void) => void };
}

interface RouteDependencies {
  subscribeStudentsUpdates: typeof subscribeStudentsUpdates;
}

interface RuntimeDependencies {
  connectDatabase: typeof connectDatabase;
  ensureRedisConnection: typeof ensureRedisConnection;
  ensureStudentsTable: typeof ensureStudentsTable;
  startStudentsQueueWorker: typeof startStudentsQueueWorker;
  stopStudentsQueueWorker: typeof stopStudentsQueueWorker;
  closeRedisConnection: typeof closeRedisConnection;
  closeDatabase: typeof closeDatabase;
  createApp: () => AppLike;
  configureRoutes: typeof configureRoutes;
  log: (message: string) => void;
  onSignal: (signal: NodeJS.Signals, listener: () => void) => void;
  exit: (code: number) => void;
}

const defaultRouteDependencies: RouteDependencies = {
  subscribeStudentsUpdates,
};

const defaultRuntimeDependencies: RuntimeDependencies = {
  connectDatabase,
  ensureRedisConnection,
  ensureStudentsTable,
  startStudentsQueueWorker,
  stopStudentsQueueWorker,
  closeRedisConnection,
  closeDatabase,
  createApp: () => express(),
  configureRoutes,
  log: (message: string) => console.log(message),
  onSignal: (signal: NodeJS.Signals, listener: () => void) => {
    process.on(signal, listener);
  },
  exit: (code: number) => {
    process.exit(code);
  },
};

export function configureRoutes(
  app: AppLike,
  pool: Pool,
  routeDependencies: RouteDependencies = defaultRouteDependencies
): () => void {
  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/", (_request, response) => {
    response.sendFile(path.join(publicDir, "index.html"));
  });

  app.get("/api/students", getStudentsHandler(pool));

  const sseClients = new Set<Response>();
  const unsubscribeStudentsUpdates = routeDependencies.subscribeStudentsUpdates((event) => {
    const data = JSON.stringify(event);
    for (const client of sseClients) {
      client.write(`event: student-updated\n`);
      client.write(`data: ${data}\n\n`);
    }
  });

  app.get("/api/students/events", (_request, response) => {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    response.write("retry: 3000\n\n");

    sseClients.add(response);

    response.on("close", () => {
      sseClients.delete(response);
    });
  });

  app.get("/api/students/:id", getStudentByIdHandler(pool));

  app.post("/api/students", createStudentHandler(pool));
  app.put("/api/students/:id", updateStudentHandler(pool));
  app.delete("/api/students/:id", deleteStudentHandler(pool));

  return unsubscribeStudentsUpdates;
}

export async function main(runtimeDependencies: RuntimeDependencies = defaultRuntimeDependencies) {
  const pool = await runtimeDependencies.connectDatabase();
  await runtimeDependencies.ensureRedisConnection();
  await runtimeDependencies.ensureStudentsTable(pool);
  await runtimeDependencies.startStudentsQueueWorker(pool);

  const app = runtimeDependencies.createApp();
  const unsubscribeStudentsUpdates = runtimeDependencies.configureRoutes(app, pool);

  const server = app.listen?.(port, () => {
    runtimeDependencies.log(`API running at http://localhost:${port}`);
  });

  if (!server) {
    throw new Error("Unable to start server");
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    unsubscribeStudentsUpdates();
    server.close(async () => {
      await runtimeDependencies.stopStudentsQueueWorker();
      await runtimeDependencies.closeRedisConnection();
      await runtimeDependencies.closeDatabase(pool);
      runtimeDependencies.exit(0);
    });
  };

  runtimeDependencies.onSignal("SIGINT", shutdown);
  runtimeDependencies.onSignal("SIGTERM", shutdown);
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }
  return import.meta.url === pathToFileURL(entrypoint).href;
}

if (isDirectExecution()) {
  main().catch(async (error) => {
    console.error(error);
    await closeRedisConnection();
    await closeDatabase();
    process.exit(1);
  });
}
