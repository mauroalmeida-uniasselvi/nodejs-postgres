import { Client } from "pg";
import {
  getStudentCacheKey,
  getStudentsListCacheKey,
  invalidateByPattern,
  invalidateCache,
} from "./cache.ts";

export async function deleteStudent(client: Client, id: number): Promise<void> {
  await client.query("DELETE FROM students WHERE id = $1", [id]);
  await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
}

export async function deleteAllStudent(client: Client): Promise<void> {
  await client.query("DELETE FROM students");
  await invalidateCache([getStudentsListCacheKey()]);
  await invalidateByPattern("student:*");
}
