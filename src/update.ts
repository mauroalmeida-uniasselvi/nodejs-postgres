import { Client } from "pg";

export async function updateStudent(
  client: Client,
  id: number,
  firstName: string,
  lastName: string,
  grade: number,
  email: string
): Promise<void> {
  await client.query(
    "UPDATE students SET first_name = $1, last_name = $2, grade = $3, email = $4 WHERE id = $5",
    [firstName, lastName, grade, email, id]
  );
}

export async function updateStudentName(
  client: Client,
  id: number,
  firstName: string
): Promise<void> {
  await client.query("UPDATE students SET first_name = $1 WHERE id = $2", [firstName, id]);
}

export async function updateStudentEmail(
  client: Client,
  id: number,
  email: string
): Promise<void> {
  await client.query("UPDATE students SET email = $1 WHERE id = $2", [email, id]);
}
