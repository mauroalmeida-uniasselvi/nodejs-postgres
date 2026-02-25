import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStudentHandler,
  deleteStudentHandler,
  getStudentByIdHandler,
  getStudentsHandler,
  updateStudentHandler,
} from "./src/controller/studants.ts";
import { closeRedisConnection, ensureRedisConnection } from "./src/util/cache.ts";
import { closeDatabase, connectDatabase, ensureStudentsTable } from "./src/util/database.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number.parseInt(process.env.PORT || "3000", 10);

async function main() {
  const pool = await connectDatabase();
  await ensureRedisConnection();
  await ensureStudentsTable(pool);

  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/", (_request, response) => {
    response.sendFile(path.join(publicDir, "index.html"));
  });

  app.get("/api/students", getStudentsHandler(pool));
  app.get("/api/students/:id", getStudentByIdHandler(pool));
  app.post("/api/students", createStudentHandler(pool));
  app.put("/api/students/:id", updateStudentHandler(pool));
  app.delete("/api/students/:id", deleteStudentHandler(pool));

  const server = app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    server.close(async () => {
      await closeRedisConnection();
      await closeDatabase(pool);
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (error) => {
  console.error(error);
  await closeRedisConnection();
  await closeDatabase();
  process.exit(1);
});
