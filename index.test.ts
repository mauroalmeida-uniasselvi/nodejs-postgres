import test from "node:test";
import assert from "node:assert/strict";
import { configureRoutes, main } from "./index.ts";

type AppMock = {
  routes: Record<string, (...args: unknown[]) => unknown>;
  used: unknown[][];
  use: (...args: unknown[]) => undefined;
  get: (route: string, handler: (...args: unknown[]) => unknown) => undefined;
  post: (route: string, handler: (...args: unknown[]) => unknown) => undefined;
  put: (route: string, handler: (...args: unknown[]) => unknown) => undefined;
  delete: (route: string, handler: (...args: unknown[]) => unknown) => undefined;
  listen?: (_port: number, callback: () => void) => { close: (cb: () => void) => void };
};

function createAppMock(): AppMock {
  const routes: Record<string, (...args: unknown[]) => unknown> = {};
  const used: unknown[][] = [];

  return {
    routes,
    used,
    use: (...args: unknown[]) => {
      used.push(args);
      return undefined;
    },
    get: (route: string, handler: (...args: unknown[]) => unknown) => {
      routes[`GET ${route}`] = handler;
      return undefined;
    },
    post: (route: string, handler: (...args: unknown[]) => unknown) => {
      routes[`POST ${route}`] = handler;
      return undefined;
    },
    put: (route: string, handler: (...args: unknown[]) => unknown) => {
      routes[`PUT ${route}`] = handler;
      return undefined;
    },
    delete: (route: string, handler: (...args: unknown[]) => unknown) => {
      routes[`DELETE ${route}`] = handler;
      return undefined;
    },
  };
}

function createResponseMock() {
  const headers = new Map<string, string>();
  const bodyChunks: string[] = [];
  let closeHandler: (() => void) | null = null;

  return {
    headers,
    bodyChunks,
    setHeader(key: string, value: string) {
      headers.set(key, value);
    },
    flushHeaders() {
      return undefined;
    },
    write(chunk: string) {
      bodyChunks.push(chunk);
      return true;
    },
    on(event: string, handler: () => void) {
      if (event === "close") {
        closeHandler = handler;
      }
      return this;
    },
    triggerClose() {
      if (closeHandler) {
        closeHandler();
      }
    },
  };
}

test("configureRoutes registers all API endpoints", () => {
  const app = createAppMock();

  const unsubscribe = configureRoutes(app as never, {} as never);

  assert.ok(unsubscribe);
  assert.ok(app.routes["GET /"]);
  assert.ok(app.routes["GET /api/students"]);
  assert.ok(app.routes["GET /api/students/events"]);
  assert.ok(app.routes["GET /api/students/:id"]);
  assert.ok(app.routes["POST /api/students"]);
  assert.ok(app.routes["PUT /api/students/:id"]);
  assert.ok(app.routes["DELETE /api/students/:id"]);
  assert.strictEqual(app.used.length, 2);
});

test("SSE route sets headers and writes retry hint", () => {
  const app = createAppMock();
  configureRoutes(app as never, {} as never);

  const response = createResponseMock();
  const handler = app.routes["GET /api/students/events"];
  assert.ok(handler);

  handler({} as never, response as never);

  assert.strictEqual(response.headers.get("Content-Type"), "text/event-stream");
  assert.strictEqual(response.headers.get("Cache-Control"), "no-cache");
  assert.strictEqual(response.headers.get("Connection"), "keep-alive");
  assert.strictEqual(response.bodyChunks[0], "retry: 3000\n\n");
});

test("SSE subscription broadcasts events to connected clients", () => {
  const app = createAppMock();
  let notify: ((event: unknown) => void) | undefined;

  configureRoutes(app as never, {} as never, {
    subscribeStudentsUpdates: ((listener: (event: unknown) => void) => {
      notify = listener;
      return () => undefined;
    }) as never,
  });

  const response = createResponseMock();
  const sseHandler = app.routes["GET /api/students/events"];
  assert.ok(sseHandler);

  sseHandler({} as never, response as never);
  if (notify) {
    notify({ operationId: "op-1", status: "processed" });
  }

  assert.strictEqual(response.bodyChunks.some((chunk) => chunk.includes("event: student-updated")), true);
  assert.strictEqual(response.bodyChunks.some((chunk) => chunk.includes("\"operationId\":\"op-1\"")), true);
});

test("main bootstraps app and shutdown flow", async () => {
  const calls: string[] = [];
  let signalHandlers: Record<string, () => void> = {};

  const app = createAppMock();
  app.listen = (_port: number, callback: () => void) => {
    callback();
    return {
      close: (cb: () => void) => {
        calls.push("server-close");
        cb();
      },
    };
  };

  await main({
    connectDatabase: async () => {
      calls.push("connect-db");
      return {} as never;
    },
    ensureRedisConnection: async () => {
      calls.push("ensure-redis");
    },
    ensureStudentsTable: async () => {
      calls.push("ensure-table");
    },
    startStudentsQueueWorker: async () => {
      calls.push("start-worker");
    },
    stopStudentsQueueWorker: async () => {
      calls.push("stop-worker");
    },
    closeRedisConnection: async () => {
      calls.push("close-redis");
    },
    closeDatabase: async () => {
      calls.push("close-db");
    },
    createApp: () => app as never,
    configureRoutes: () => {
      calls.push("configure-routes");
      return () => {
        calls.push("unsubscribe-updates");
      };
    },
    log: () => {
      calls.push("log");
    },
    onSignal: (signal: NodeJS.Signals, listener: () => void) => {
      signalHandlers[signal] = listener;
    },
    exit: () => {
      calls.push("exit");
    },
  });

  signalHandlers.SIGINT?.();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.strictEqual(calls.includes("connect-db"), true);
  assert.strictEqual(calls.includes("configure-routes"), true);
  assert.strictEqual(calls.includes("unsubscribe-updates"), true);
  assert.strictEqual(calls.includes("stop-worker"), true);
  assert.strictEqual(calls.includes("close-redis"), true);
  assert.strictEqual(calls.includes("close-db"), true);
  assert.strictEqual(calls.includes("exit"), true);
});
