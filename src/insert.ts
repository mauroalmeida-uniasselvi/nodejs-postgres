import { Client } from "pg";

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
  return result.rows[0].id;
}
