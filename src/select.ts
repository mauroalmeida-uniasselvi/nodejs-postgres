import { Client } from "pg";

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  grade: number;
  email: string;
}

export async function selectUserById(client: Client, id: number): Promise<Student | null> {
  const result = await client.query("SELECT * FROM students WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function selectAllUsers(client: Client): Promise<Student[]> {
  const result = await client.query("SELECT * FROM students");
  return result.rows;
}
