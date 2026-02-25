import { insertStudent } from "./src/insert.ts";
import { selectUserById, selectAllUsers } from "./src/select.ts";
import { updateStudentName } from "./src/update.ts";
import { deleteStudent } from "./src/delete.ts";
import { closeRedisConnection, ensureRedisConnection } from "./src/service/cache.ts";
import { closeDatabase, connectDatabase, ensureStudentsTable } from "./src/service/db.ts";

async function main() {
  const client = await connectDatabase();

  try {
    await ensureRedisConnection();

    await ensureStudentsTable(client);

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
    await closeRedisConnection();
    await closeDatabase(client);
  }
}

main();
