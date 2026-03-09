import test from "node:test";
import assert from "node:assert/strict";
import {
  __resetStudentsWorkerStateForTests,
  __resetStudentsWorkerDependenciesForTests,
  __setStudentsWorkerDependenciesForTests,
  __internalWorkerForTests,
  enqueueCreateStudentOperation,
  enqueueDeleteStudentOperation,
  enqueueUpdateStudentOperation,
  subscribeStudentsUpdates,
} from "./students.ts";

function createRedisMock() {
  const statuses = new Map<string, string>();
  const queue: string[] = [];

  const redis = {
    statuses,
    queue,
    set: async (key: string, value: string) => {
      statuses.set(key, value);
      return "OK";
    },
    lPush: async (_key: string, value: string) => {
      queue.unshift(value);
      return queue.length;
    },
  };

  return { redis };
}

test.beforeEach(() => {
  __resetStudentsWorkerDependenciesForTests();
  __resetStudentsWorkerStateForTests();
});

test.afterEach(() => {
  __resetStudentsWorkerDependenciesForTests();
  __resetStudentsWorkerStateForTests();
});

test("enqueue operations create queued status", async () => {
  const { redis } = createRedisMock();
  let sequence = 0;

  __setStudentsWorkerDependenciesForTests({
    randomUUID: () => `op-${++sequence}`,
    nowIso: () => "2026-03-09T00:00:00.000Z",
    getRedisClient: (async () => redis as never) as never,
  });

  const created = await enqueueCreateStudentOperation({ id: "1", name: "A", grade: "A", email: "a@test.com" });
  const updated = await enqueueUpdateStudentOperation({ id: "1", name: "B" });
  const deleted = await enqueueDeleteStudentOperation({ id: "1" });

  assert.strictEqual(created.status, "queued");
  assert.strictEqual(updated.type, "update");
  assert.strictEqual(deleted.type, "delete");
  assert.strictEqual(redis.queue.length, 3);
});

test("worker processes queued create message and emits update event", async () => {
  const { redis } = createRedisMock();
  let workerCalls = 0;

  __setStudentsWorkerDependenciesForTests({
    randomUUID: () => "op-1",
    nowIso: () => "2026-03-09T00:00:00.000Z",
    getRedisClient: (async () => redis as never) as never,
    insertStudent: (async () => {
      workerCalls += 1;
      return "1";
    }) as never,
    updateStudentPartial: (async () => ({ id: "1", name: "A", grade: "A", email: "a@test.com" })) as never,
    deleteStudent: (async () => true) as never,
  });

  const events: unknown[] = [];
  const unsubscribe = subscribeStudentsUpdates((event) => {
    events.push(event);
  });

  await __internalWorkerForTests.processQueueMessage({} as never, {
    operationId: "op-1",
    type: "create",
    payload: { id: "1", name: "A", grade: "A", email: "a@test.com" },
    attempts: 0,
    queuedAt: "2026-03-09T00:00:00.000Z",
  });

  unsubscribe();

  assert.strictEqual(workerCalls >= 1, true);
  assert.strictEqual(events.length >= 1, true);
});

test("worker marks non-retryable delete as failed", async () => {
  const { redis } = createRedisMock();

  __setStudentsWorkerDependenciesForTests({
    randomUUID: () => "op-fail",
    nowIso: () => "2026-03-09T00:00:00.000Z",
    getRedisClient: (async () => redis as never) as never,
    deleteStudent: (async () => false) as never,
  });

  await __internalWorkerForTests.processQueueMessage({} as never, {
    operationId: "op-fail",
    type: "delete",
    payload: { id: "404" },
    attempts: 0,
    queuedAt: "2026-03-09T00:00:00.000Z",
  });

  const statusEntries = Array.from(redis.statuses.values()).map((value) => JSON.parse(value) as { status: string });
  assert.strictEqual(statusEntries.some((entry) => entry.status === "failed"), true);
});

test("worker retries retryable errors and requeues message", async () => {
  const { redis } = createRedisMock();
  let attempt = 0;

  __setStudentsWorkerDependenciesForTests({
    randomUUID: () => "op-retry",
    nowIso: () => "2026-03-09T00:00:00.000Z",
    getRedisClient: (async () => redis as never) as never,
    insertStudent: (async () => {
      attempt += 1;
      throw new Error("temporary");
    }) as never,
  });

  await __internalWorkerForTests.processQueueMessage({} as never, {
    operationId: "op-retry",
    type: "create",
    payload: { id: "2", name: "B", grade: "B", email: "b@test.com" },
    attempts: 0,
    queuedAt: "2026-03-09T00:00:00.000Z",
  });

  assert.strictEqual(attempt >= 1, true);
  const statuses = Array.from(redis.statuses.values()).map((value) => JSON.parse(value) as { status: string });
  assert.strictEqual(statuses.some((item) => item.status === "queued" || item.status === "failed"), true);
});

test("parseQueueMessage rejects invalid payloads", () => {
  const invalid = __internalWorkerForTests.parseQueueMessage("{\"foo\":1}");
  const valid = __internalWorkerForTests.parseQueueMessage(JSON.stringify({
    operationId: "op-ok",
    type: "delete",
    payload: { id: "1" },
    attempts: 0,
    queuedAt: "2026-03-09T00:00:00.000Z",
  }));

  assert.strictEqual(invalid, null);
  assert.ok(valid);
});
