import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deleteStudent,
  insertStudent,
  selectAllUsers,
  selectUserById,
  updateStudentPartial,
} from "./src/controller/students.ts";
import { closeRedisConnection, ensureRedisConnection } from "./src/service/cache.ts";
import { closeDatabase, connectDatabase, ensureStudentsTable } from "./src/service/db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number.parseInt(process.env.PORT || "3000", 10);

function parseId(value: string): string | null {
  const id = value.trim();
  if (!id) {
    return null;
  }
  return id;
}

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

  app.get("/api/students", async (_request, response) => {
    try {
      const students = await selectAllUsers(pool);
      response.status(200).json(students);
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/students/:id", async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid id" });
      return;
    }

    try {
      const student = await selectUserById(pool, id);
      if (!student) {
        response.status(404).json({ error: "Student not found" });
        return;
      }

      response.status(200).json(student);
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/students", async (request, response) => {
    const { id, name, grade, email } = request.body as {
      id?: unknown;
      name?: unknown;
      grade?: unknown;
      email?: unknown;
    };

    if (
      typeof id !== "string"
      || typeof name !== "string"
      || typeof grade !== "string"
      || typeof email !== "string"
    ) {
      response.status(400).json({ error: "Invalid payload" });
      return;
    }

    try {
      const studentId = await insertStudent(pool, id, name, grade, email);
      const student = await selectUserById(pool, studentId);
      response.status(201).json(student);
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/students/:id", async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid id" });
      return;
    }

    const payload = request.body as {
      name?: unknown;
      grade?: unknown;
      email?: unknown;
    };

    const updatePayload: {
      name?: string;
      grade?: string;
      email?: string;
    } = {};

    if (typeof payload.name === "string") {
      updatePayload.name = payload.name;
    }
    if (typeof payload.grade === "string") {
      updatePayload.grade = payload.grade;
    }
    if (typeof payload.email === "string") {
      updatePayload.email = payload.email;
    }

    if (Object.keys(updatePayload).length === 0) {
      response.status(400).json({ error: "Payload must include at least one field" });
      return;
    }

    try {
      const student = await updateStudentPartial(pool, id, updatePayload);
      if (!student) {
        response.status(404).json({ error: "Student not found" });
        return;
      }

      response.status(200).json(student);
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/students/:id", async (request, response) => {
    const id = parseId(request.params.id);
    if (!id) {
      response.status(400).json({ error: "Invalid id" });
      return;
    }

    try {
      const deleted = await deleteStudent(pool, id);
      if (!deleted) {
        response.status(404).json({ error: "Student not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: "Internal server error" });
    }
  });

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
