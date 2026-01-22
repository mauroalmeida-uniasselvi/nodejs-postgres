import { Client } from "pg";
import { insertStudent } from "./src/insert.ts";
import { selectUserById, selectAllUsers } from "./src/select.ts";
import { updateStudentName } from "./src/update.ts";
import { deleteStudent } from "./src/delete.ts";

// Environment variables
const host = process.env.PG_HOST || "localhost";
const port = parseInt(process.env.PG_PORT || "5432");
const user = process.env.PG_USER || "uniasselvi";
const password = process.env.PG_PASSWORD || "uniasselvi";
const database = process.env.PG_DATABASE || "uniasselvi_db";

async function main() {
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        grade INT,
        email VARCHAR(100)
      )
    `);

    // CREATE: Insert a user
    const userId = await insertStudent(client, "John", "Doe", 10, "john@example.com");
    console.log("User created with ID:", userId);

    // READ: Select the user
    const user = await selectUserById(client, userId);
    console.log("User read:", user);

    // UPDATE: Update the user's name
    await updateStudentName(client, userId, "Jane");
    console.log("User updated");

    // READ: Select updated user
    const updatedUser = await selectUserById(client, userId);
    console.log("Updated user:", updatedUser);

    // DELETE: Delete the user
    await deleteStudent(client, userId);
    console.log("User deleted");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
    console.log("Connection closed");
  }
}

main();
