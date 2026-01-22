import { Client } from "pg";

export async function deleteStudent(client: Client, id: number): Promise<void> {
  await client.query("DELETE FROM students WHERE id = $1", [id]);
}

export async function deleteAllStudent(client: Client): Promise<void> {
  await client.query("DELETE FROM students");
}
