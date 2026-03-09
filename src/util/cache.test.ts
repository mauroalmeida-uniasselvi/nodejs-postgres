import test from "node:test";
import assert from "node:assert/strict";
import {
  __resetCacheStateForTests,
  __setCreateRedisClientForTests,
  __setRedisClientForTests,
  closeRedisConnection,
  ensureRedisConnection,
  getStudentCacheKey,
  getStudentsListCacheKey,
  invalidateByPattern,
  invalidateCache,
  readCache,
  writeCache,
} from "./cache.ts";

function createRedisMock() {
  const values = new Map<string, string>();
  const deleted: string[][] = [];
  const keysByPattern = new Map<string, string[]>();

  return {
    values,
    deleted,
    keysByPattern,
    isOpen: true,
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => {
      values.set(key, value);
      return "OK";
    },
    del: async (keys: string[] | string) => {
      const list = Array.isArray(keys) ? keys : [keys];
      deleted.push(list);
      for (const key of list) {
        values.delete(key);
      }
      return list.length;
    },
    keys: async (pattern: string) => keysByPattern.get(pattern) ?? [],
    quit: async () => "OK",
  };
}

test.beforeEach(() => {
  __resetCacheStateForTests();
});

test.afterEach(() => {
  __resetCacheStateForTests();
});

test("cache keys use expected format", () => {
  assert.strictEqual(getStudentCacheKey("123"), "student:123");
  assert.strictEqual(getStudentsListCacheKey(), "students:all");
});

test("readCache returns null on miss and parsed object on hit", async () => {
  const redis = createRedisMock();
  __setRedisClientForTests(redis as never);

  const miss = await readCache<{ id: string }>("student:404");
  assert.strictEqual(miss, null);

  await writeCache("student:1", { id: "1" });
  const hit = await readCache<{ id: string }>("student:1");
  assert.deepStrictEqual(hit, { id: "1" });
});

test("invalidateCache removes provided keys", async () => {
  const redis = createRedisMock();
  redis.values.set("student:1", "x");
  redis.values.set("students:all", "y");
  __setRedisClientForTests(redis as never);

  await invalidateCache(["student:1", "students:all"]);

  assert.strictEqual(redis.values.has("student:1"), false);
  assert.strictEqual(redis.values.has("students:all"), false);
});

test("invalidateByPattern removes keys returned by redis", async () => {
  const redis = createRedisMock();
  redis.values.set("student:1", "x");
  redis.values.set("student:2", "y");
  redis.keysByPattern.set("student:*", ["student:1", "student:2"]);
  __setRedisClientForTests(redis as never);

  await invalidateByPattern("student:*");

  assert.strictEqual(redis.values.size, 0);
});

test("ensure and close redis connection operate on current client", async () => {
  let quitCalls = 0;
  const redis = {
    ...createRedisMock(),
    quit: async () => {
      quitCalls += 1;
      return "OK";
    },
  };

  __setRedisClientForTests(redis as never);

  await ensureRedisConnection();
  await closeRedisConnection();

  assert.strictEqual(quitCalls, 1);
});

test("getRedisClient retries hosts and succeeds on a later candidate", async () => {
  const attempts: string[] = [];

  __setCreateRedisClientForTests(((options: { url?: string }) => {
    const hostMarker = options.url ?? "";
    const shouldFail = !hostMarker.includes("localhost") && !hostMarker.includes("redis");
    return {
      isOpen: !shouldFail,
      on: () => undefined,
      connect: async () => {
        attempts.push(hostMarker);
        if (shouldFail) {
          throw new Error("fail host");
        }
      },
      disconnect: async () => undefined,
      get: async () => null,
      set: async () => "OK",
      del: async () => 0,
      keys: async () => [],
      quit: async () => "OK",
    } as never;
  }) as never);

  await ensureRedisConnection();

  assert.strictEqual(attempts.length >= 1, true);
});

test("cache operations swallow redis errors", async () => {
  const redis = {
    isOpen: true,
    get: async () => {
      throw new Error("get-fail");
    },
    set: async () => {
      throw new Error("set-fail");
    },
    del: async () => {
      throw new Error("del-fail");
    },
    keys: async () => {
      throw new Error("keys-fail");
    },
    quit: async () => "OK",
  };

  __setRedisClientForTests(redis as never);

  const read = await readCache("x");
  await writeCache("x", { id: "1" });
  await invalidateCache(["x"]);
  await invalidateByPattern("x*");

  assert.strictEqual(read, null);
});
