import test from "node:test";
import assert from "node:assert/strict";
import * as studentsService from "./students.ts";

const {
  deleteAllStudent,
  deleteStudent,
  insertStudent,
  selectAllUsers,
  selectUserById,
  updateStudentEmail,
  updateStudentName,
  updateStudent,
  updateStudentPartial,
} = studentsService;

const pool = {} as never;

function setDeps(overrides: Parameters<typeof studentsService.__setStudentsServiceDependenciesForTests>[0]) {
  studentsService.__setStudentsServiceDependenciesForTests(overrides);
}

test.beforeEach(() => {
  studentsService.__resetStudentsServiceDependenciesForTests();
});

test("insertStudent writes DB and refreshes cache", async () => {
  const calls: string[] = [];

  setDeps({
    executeDbQuery: (async () => ({ rows: [{ id: "s1" }], rowCount: 1 })) as never,
    getStudentsListCacheKey: (() => "students:all") as never,
    getStudentCacheKey: ((id: string) => `student:${id}`) as never,
    invalidateCache: (async () => {
      calls.push("invalidate");
    }) as never,
    writeCache: (async () => {
      calls.push("write");
    }) as never,
  });

  const id = await insertStudent(pool, "s1", "Ana", "A", "ana@test.com");

  assert.strictEqual(id, "s1");
  assert.deepStrictEqual(calls, ["invalidate", "write"]);
});

test("selectUserById returns cached student when available", async () => {
  let queriedDb = false;

  setDeps({
    getStudentCacheKey: ((id: string) => `student:${id}`) as never,
    readCache: (async () => ({ id: "s2", name: "Joao", grade: "B", email: "j@test.com" })) as never,
    executeDbQuery: (async () => {
      queriedDb = true;
      return { rows: [], rowCount: 0 };
    }) as never,
  });

  const result = await selectUserById(pool, "s2");

  assert.ok(result);
  assert.strictEqual(result?.id, "s2");
  assert.strictEqual(queriedDb, false);
});

test("selectUserById queries DB and caches when cache miss", async () => {
  let cacheWrites = 0;

  setDeps({
    getStudentCacheKey: ((id: string) => `student:${id}`) as never,
    readCache: (async () => null) as never,
    executeDbQuery: (async () => ({
      rows: [{ id: "s3", name: "Lu", grade: "A", email: "lu@test.com" }],
      rowCount: 1,
    })) as never,
    writeCache: (async () => {
      cacheWrites += 1;
    }) as never,
  });

  const result = await selectUserById(pool, "s3");

  assert.strictEqual(result?.id, "s3");
  assert.strictEqual(cacheWrites, 1);
});

test("updateStudent returns false when row is missing", async () => {
  setDeps({
    executeDbQuery: (async () => ({ rows: [], rowCount: 0 })) as never,
  });

  const result = await updateStudent(pool, "missing", "N", "C", "n@test.com");

  assert.strictEqual(result, false);
});

test("updateStudentPartial returns null when payload has no valid fields", async () => {
  const result = await updateStudentPartial(pool, "s4", {});
  assert.strictEqual(result, null);
});

test("updateStudentPartial updates and invalidates cache", async () => {
  let invalidated = 0;

  setDeps({
    executeDbQuery: (async () => ({
      rows: [{ id: "s4", name: "Novo", grade: "B", email: "novo@test.com" }],
      rowCount: 1,
    })) as never,
    getStudentCacheKey: ((id: string) => `student:${id}`) as never,
    getStudentsListCacheKey: (() => "students:all") as never,
    invalidateCache: (async () => {
      invalidated += 1;
    }) as never,
  });

  const result = await updateStudentPartial(pool, "s4", { name: "Novo" });

  assert.strictEqual(result?.name, "Novo");
  assert.strictEqual(invalidated, 1);
});

test("deleteStudent handles not found and success", async () => {
  let calls = 0;

  setDeps({
    executeDbQuery: (async () => {
      calls += 1;
      if (calls === 1) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [{ id: "s5" }], rowCount: 1 };
    }) as never,
    getStudentCacheKey: ((id: string) => `student:${id}`) as never,
    getStudentsListCacheKey: (() => "students:all") as never,
    invalidateCache: (async () => undefined) as never,
  });

  const first = await deleteStudent(pool, "s5");
  const second = await deleteStudent(pool, "s5");

  assert.strictEqual(first, false);
  assert.strictEqual(second, true);
});

test("deleteAllStudent clears list and pattern cache", async () => {
  const called: string[] = [];

  setDeps({
    executeDbQuery: (async () => {
      called.push("db");
      return { rows: [], rowCount: 0 };
    }) as never,
    getStudentsListCacheKey: (() => "students:all") as never,
    invalidateCache: (async () => {
      called.push("invalidate-list");
    }) as never,
    invalidateByPattern: (async () => {
      called.push("invalidate-pattern");
    }) as never,
  });

  await deleteAllStudent(pool);

  assert.deepStrictEqual(called, ["db", "invalidate-list", "invalidate-pattern"]);
});

test("selectAllUsers returns cached list before database", async () => {
  let queried = false;

  setDeps({
    getStudentsListCacheKey: (() => "students:all") as never,
    readCache: (async () => [{ id: "s1", name: "A", grade: "A", email: "a@test.com" }]) as never,
    executeDbQuery: (async () => {
      queried = true;
      return { rows: [], rowCount: 0 };
    }) as never,
  });

  const rows = await selectAllUsers(pool);

  assert.strictEqual(rows.length, 1);
  assert.strictEqual(queried, false);
});

test("updateStudentName and updateStudentEmail return true when row exists", async () => {
  studentsService.__setStudentsServiceDependenciesForTests({
    executeDbQuery: (async () => ({ rows: [{ id: "s6" }], rowCount: 1 })) as never,
    getStudentCacheKey: ((id: string) => `student:${id}`) as never,
    getStudentsListCacheKey: (() => "students:all") as never,
    invalidateCache: (async () => undefined) as never,
  });

  const nameResult = await updateStudentName(pool, "s6", "Nome");
  const emailResult = await updateStudentEmail(pool, "s6", "nome@test.com");

  assert.strictEqual(nameResult, true);
  assert.strictEqual(emailResult, true);
});
