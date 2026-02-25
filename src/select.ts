import { Client } from "pg";
import {
  getStudentCacheKey,
  getStudentsListCacheKey,
  readCache,
  writeCache,
} from "./service/cache.ts";
import { executeDbQuery, logDb } from "./service/db.ts";

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade: number;
  email: string;
}

export async function selectUserById(client: Client, id: number): Promise<Student | null> {
  const cacheKey = getStudentCacheKey(id);
  const cachedStudent = await readCache<Student>(cacheKey);
  if (cachedStudent) {
    if ((process.env.CACHE_DEBUG || "false").toLowerCase() === "true") {
      console.log(`[CACHE][selectUserById] source=redis id=${id}`);
    }
    return cachedStudent;
  }

  logDb(`selectUserById source=postgres id=${id}`);
  const result = await executeDbQuery<Student>(client, "SELECT * FROM students WHERE id = $1", [id]);
  const student = result.rows[0] || null;

  if (student) {
    await writeCache(cacheKey, student);
  }

  return student;
}

export async function selectAllUsers(client: Client): Promise<Student[]> {
  const cacheKey = getStudentsListCacheKey();
  const cachedStudents = await readCache<Student[]>(cacheKey);
  if (cachedStudents) {
    if ((process.env.CACHE_DEBUG || "false").toLowerCase() === "true") {
      console.log("[CACHE][selectAllUsers] source=redis");
    }
    return cachedStudents;
  }

  logDb("selectAllUsers source=postgres");
  const result = await executeDbQuery<Student>(client, "SELECT * FROM students");
  await writeCache(cacheKey, result.rows);
  return result.rows;
}
