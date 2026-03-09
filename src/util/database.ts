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
let createDbPoolForHostImpl = (host: string): Pool => new Pool({
  host,
  port,
  user,
  password,
  database,
});

export function __setDbPoolForTests(pool: Pool | null): void {
  dbPool = pool;
}

export function __setCreateDbPoolForHostForTests(factory: ((host: string) => Pool) | null): void {
  createDbPoolForHostImpl = factory ?? ((host: string) => new Pool({
    host,
    port,
    user,
    password,
    database,
  }));
}

export function createDbPool(): Pool {
  return createDbPoolForHost(configuredHost);
}

function createDbPoolForHost(host: string): Pool {
  return createDbPoolForHostImpl(host);
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
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(200),
      grade VARCHAR(100),
      email VARCHAR(100)
    )
  `);

  await executeDbQuery(pool, `
    DO $$
    DECLARE
      primary_key_name text;
      has_id_column boolean;
      id_is_character_varying boolean;
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'name'
      ) THEN
        ALTER TABLE students ADD COLUMN name VARCHAR(200);
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'first_name'
      ) OR EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'last_name'
      ) THEN
        UPDATE students
        SET name = TRIM(CONCAT_WS(' ', COALESCE(first_name, ''), COALESCE(last_name, '')))
        WHERE (name IS NULL OR name = '')
          AND (COALESCE(first_name, '') <> '' OR COALESCE(last_name, '') <> '');
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'first_name'
      ) THEN
        ALTER TABLE students DROP COLUMN first_name;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'last_name'
      ) THEN
        ALTER TABLE students DROP COLUMN last_name;
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'id'
      ) INTO has_id_column;

      IF NOT has_id_column THEN
        ALTER TABLE students ADD COLUMN id VARCHAR(100);
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'id'
          AND data_type = 'character varying'
      ) INTO id_is_character_varying;

      IF NOT id_is_character_varying THEN
        ALTER TABLE students
        ALTER COLUMN id TYPE VARCHAR(100)
        USING id::text;
      END IF;

      ALTER TABLE students ALTER COLUMN id DROP DEFAULT;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'enrollment'
      ) THEN
        UPDATE students
        SET id = enrollment
        WHERE (id IS NULL OR id = '')
          AND (enrollment IS NOT NULL AND enrollment <> '');
      END IF;

      IF has_id_column THEN
        UPDATE students
        SET id = id::text
        WHERE (id IS NULL OR id = '');
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'matricula'
      ) THEN
        UPDATE students
        SET id = matricula
        WHERE (id IS NULL OR id = '')
          AND (matricula IS NOT NULL AND matricula <> '');
      END IF;

      SELECT conname
      INTO primary_key_name
      FROM pg_constraint
      WHERE conrelid = 'students'::regclass
        AND contype = 'p'
      LIMIT 1;

      IF primary_key_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE students DROP CONSTRAINT %I', primary_key_name);
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'enrollment'
      ) THEN
        ALTER TABLE students DROP COLUMN enrollment;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students'
          AND column_name = 'matricula'
      ) THEN
        ALTER TABLE students DROP COLUMN matricula;
      END IF;

      ALTER TABLE students ALTER COLUMN id SET NOT NULL;
      ALTER TABLE students ADD CONSTRAINT students_pkey PRIMARY KEY (id);
    END
    $$;
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