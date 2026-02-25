import { Client } from "pg";
import {
  getStudentCacheKey,
  getStudentsListCacheKey,
  invalidateCache,
  writeCache,
} from "./cache.ts";

export async function insertStudent(
  client: Client,
  firstName: string,
  lastName: string,
  grade: number,
  email: string
): Promise<number> {
  const result = await client.query(
    "INSERT INTO students (first_name, last_name, grade, email) VALUES ($1, $2, $3, $4) RETURNING id",
    [firstName, lastName, grade, email]
  );

  const newStudentId = result.rows[0].id as number;

  await invalidateCache([getStudentsListCacheKey()]);
  await writeCache(getStudentCacheKey(newStudentId), {
    id: newStudentId,
    first_name: firstName,
    last_name: lastName,
    grade,
    email,
  });

  return newStudentId;
}
