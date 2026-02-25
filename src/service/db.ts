import "dotenv/config";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

const dbDebugEnabled = (process.env.DB_DEBUG || "false").toLowerCase() === "true";
const configuredHost = process.env.PG_HOST || "localhost";
const port = parseInt(process.env.PG_PORT || "5432");
const user = process.env.PG_USER || "uniasselvi";
const password = process.env.PG_PASSWORD || "uniasselvi";
const database = process.env.PG_DATABASE || "uniasselvi_db";

function getDbHosts(): string[] {
  const hosts = [configuredHost, "localhost", "postgres"];
  return Array.from(new Set(hosts.filter((hostValue) => hostValue && hostValue.trim().length > 0)));
}

function sanitizeSql(queryText: string): string {
  return queryText.replace(/\s+/g, " ").trim();
}

export function logDb(message: string): void {
  if (!dbDebugEnabled) {
    return;
  }

  console.log(`[DB] ${message}`);
}

let dbPool: Pool | null = null;

export function createDbPool(): Pool {
  return createDbPoolForHost(configuredHost);
}

function createDbPoolForHost(host: string): Pool {
  return new Pool({
    host,
    port,
    user,
    password,
    database,
  });
}

export async function connectDatabase(): Promise<Pool> {
  if (dbPool) {
    return dbPool;
  }

  const hosts = getDbHosts();
  let lastError: unknown = null;

  for (const host of hosts) {
    const candidatePool = createDbPoolForHost(host);

    try {
      await candidatePool.query("SELECT 1");
      dbPool = candidatePool;
      console.log(`Connected to PostgreSQL (${host})`);
      logDb("PostgreSQL connection established");
      return dbPool;
    } catch (error) {
      lastError = error;
      await candidatePool.end().catch(() => undefined);
      console.warn(`Failed to connect to PostgreSQL host '${host}', trying next host...`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to connect to PostgreSQL");
}

export async function ensureStudentsTable(pool: Pool): Promise<void> {
  await executeDbQuery(pool, `
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      grade VARCHAR(100),
      email VARCHAR(100)
    )
  `);

  await executeDbQuery(pool, `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'grade'
          AND data_type <> 'character varying'
      ) THEN
        ALTER TABLE students
        ALTER COLUMN grade TYPE VARCHAR(100)
        USING grade::text;
      END IF;
    END
    $$;
  `);
}

export async function closeDatabase(pool?: Pool): Promise<void> {
  const targetPool = pool ?? dbPool;

  if (!targetPool) {
    return;
  }

  await targetPool.end();
  if (dbPool === targetPool) {
    dbPool = null;
  }

  logDb("PostgreSQL connection closed");
  console.log("Connection closed");
}

export async function executeDbQuery<T extends QueryResultRow = QueryResultRow>(
  pool: Pool,
  queryText: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  const startedAt = Date.now();
  const sql = sanitizeSql(queryText);

  try {
    logDb(`QUERY sql="${sql}" params=${JSON.stringify(values)}`);
    const result = await pool.query<T>(queryText, values);
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