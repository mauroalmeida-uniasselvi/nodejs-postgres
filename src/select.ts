import { Client } from "pg";
import {
  getStudentCacheKey,
  getStudentsListCacheKey,
  readCache,
  writeCache,
} from "./cache.ts";

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
    return cachedStudent;
  }

  const result = await client.query("SELECT * FROM students WHERE id = $1", [id]);
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
    return cachedStudents;
  }

  const result = await client.query("SELECT * FROM students");
  await writeCache(cacheKey, result.rows);
  return result.rows;
}
