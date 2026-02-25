import { Client, type QueryResult, type QueryResultRow } from "pg";

const dbDebugEnabled = (process.env.DB_DEBUG || "false").toLowerCase() === "true";
const host = process.env.PG_HOST || "localhost";
const port = parseInt(process.env.PG_PORT || "5432");
const user = process.env.PG_USER || "uniasselvi";
const password = process.env.PG_PASSWORD || "uniasselvi";
const database = process.env.PG_DATABASE || "uniasselvi_db";

function sanitizeSql(queryText: string): string {
  return queryText.replace(/\s+/g, " ").trim();
}

export function logDb(message: string): void {
  if (!dbDebugEnabled) {
    return;
  }

  console.log(`[DB] ${message}`);
}

export function createDbClient(): Client {
  return new Client({
    host,
    port,
    user,
    password,
    database,
  });
}

export async function connectDatabase(): Promise<Client> {
  const client = createDbClient();
  await client.connect();
  console.log("Connected to PostgreSQL");
  logDb("PostgreSQL connection established");
  return client;
}

export async function ensureStudentsTable(client: Client): Promise<void> {
  await executeDbQuery(client, `
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      grade INT,
      email VARCHAR(100)
    )
  `);
}

export async function closeDatabase(client: Client): Promise<void> {
  await client.end();
  logDb("PostgreSQL connection closed");
  console.log("Connection closed");
}

export async function executeDbQuery<T extends QueryResultRow = QueryResultRow>(
  client: Client,
  queryText: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  const startedAt = Date.now();
  const sql = sanitizeSql(queryText);

  try {
    logDb(`QUERY sql="${sql}" params=${JSON.stringify(values)}`);
    const result = await client.query<T>(queryText, values);
    const durationMs = Date.now() - startedAt;
    logDb(`RESULT rows=${result.rowCount ?? 0} durationMs=${durationMs}`);
    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "unknown error";
    logDb(`ERROR sql="${sql}" durationMs=${durationMs} error=${errorMessage}`);
    throw error;
  }
}