import test from "node:test";
import assert from "node:assert/strict";
import {
  __setCreateDbPoolForHostForTests,
  __setDbPoolForTests,
  closeDatabase,
  connectDatabase,
  createDbPool,
  ensureStudentsTable,
  executeDbQuery,
} from "./database.ts";

function createPoolMock() {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  let ended = 0;

  return {
    queries,
    get ended() {
      return ended;
    },
    query: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      if (sql === "SELECT 1") {
        return { rows: [{ ok: 1 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    end: async () => {
      ended += 1;
    },
  };
}

test.beforeEach(() => {
  __setDbPoolForTests(null);
  __setCreateDbPoolForHostForTests(null);
});

test.afterEach(async () => {
  __setDbPoolForTests(null);
  __setCreateDbPoolForHostForTests(null);
  await closeDatabase();
});

test("executeDbQuery forwards SQL and params", async () => {
  const pool = createPoolMock();

  const result = await executeDbQuery(pool as never, "SELECT * FROM x WHERE id = $1", [1]);

  assert.strictEqual(result.rowCount, 0);
  assert.strictEqual(pool.queries.length, 1);
  assert.strictEqual(pool.queries[0].values[0], 1);
});

test("createDbPool uses overridable pool factory", () => {
  const pool = createPoolMock();
  __setCreateDbPoolForHostForTests(() => pool as never);

  const created = createDbPool();

  assert.strictEqual(created, pool);
});

test("connectDatabase returns cached pool on second call", async () => {
  const pool = createPoolMock();
  let factoryCalls = 0;

  __setCreateDbPoolForHostForTests(() => {
    factoryCalls += 1;
    return pool as never;
  });

  const first = await connectDatabase();
  const second = await connectDatabase();

  assert.strictEqual(first, second);
  assert.strictEqual(factoryCalls, 1);
  assert.strictEqual(pool.queries[0].sql, "SELECT 1");
});

test("ensureStudentsTable executes migration statements", async () => {
  const pool = createPoolMock();

  await ensureStudentsTable(pool as never);

  assert.strictEqual(pool.queries.length, 3);
  assert.ok(pool.queries[0].sql.includes("CREATE TABLE IF NOT EXISTS students"));
});

test("closeDatabase ends explicit pool", async () => {
  const pool = createPoolMock();

  await closeDatabase(pool as never);

  assert.strictEqual(pool.ended, 1);
});

test("connectDatabase falls back to next host when first fails", async () => {
  const factoryCalls: string[] = [];
  let created = 0;

  __setCreateDbPoolForHostForTests((host: string) => {
    created += 1;
    factoryCalls.push(host);
    const pool = createPoolMock();
    if (created === 1) {
      return {
        ...pool,
        query: async () => {
          throw new Error("first host failed");
        },
      } as never;
    }
    return pool as never;
  });

  const connected = await connectDatabase();
  assert.ok(connected);
  assert.strictEqual(factoryCalls.length >= 2, true);
});

test("executeDbQuery rethrows query errors", async () => {
  const pool = {
    query: async () => {
      throw new Error("query failed");
    },
  };

  await assert.rejects(async () => {
    await executeDbQuery(pool as never, "SELECT 1");
  }, /query failed/);
});
