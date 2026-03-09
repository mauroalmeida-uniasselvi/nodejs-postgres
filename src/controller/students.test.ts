import test from "node:test";
import assert from "node:assert/strict";
import { createStudentsController } from "./students.ts";
import { createMockResponse } from "../test-utils/mocks.ts";

const pool = {} as never;

function createBaseDependencies() {
  return {
    selectAllUsers: async (): Promise<Array<{ id: string; name: string; grade: string; email: string }>> => [],
    selectUserById: async () => null,
    enqueueCreateStudentOperation: async () => ({ operationId: "op", type: "create", studentId: "1", status: "queued", attempts: 0, updatedAt: "now" }),
    enqueueUpdateStudentOperation: async () => ({ operationId: "op", type: "update", studentId: "1", status: "queued", attempts: 0, updatedAt: "now" }),
    enqueueDeleteStudentOperation: async () => ({ operationId: "op", type: "delete", studentId: "1", status: "queued", attempts: 0, updatedAt: "now" }),
  };
}

test("getStudents returns 200 with list", async () => {
  const dependencies = createBaseDependencies();
  dependencies.selectAllUsers = async () => [{ id: "1", name: "Ana", grade: "A", email: "a@test.com" }];

  const controller = createStudentsController(pool, dependencies as never);
  const response = createMockResponse();

  await controller.getStudents({} as never, response as never, () => undefined);

  assert.strictEqual(response.statusCode, 200);
  assert.deepStrictEqual(response.jsonPayload, [{ id: "1", name: "Ana", grade: "A", email: "a@test.com" }]);
});

test("getById validates id and returns 400", async () => {
  const controller = createStudentsController(pool, createBaseDependencies() as never);
  const response = createMockResponse();

  await controller.getById({ params: { id: "   " } } as never, response as never, () => undefined);

  assert.strictEqual(response.statusCode, 400);
  assert.deepStrictEqual(response.jsonPayload, { error: "Invalid id" });
});

test("getById returns 404 when student does not exist", async () => {
  const controller = createStudentsController(pool, createBaseDependencies() as never);
  const response = createMockResponse();

  await controller.getById({ params: { id: "not-found" } } as never, response as never, () => undefined);

  assert.strictEqual(response.statusCode, 404);
  assert.deepStrictEqual(response.jsonPayload, { error: "Student not found" });
});

test("create validates payload and returns 400", async () => {
  const controller = createStudentsController(pool, createBaseDependencies() as never);
  const response = createMockResponse();

  await controller.create({ body: { id: 1 } } as never, response as never, () => undefined);

  assert.strictEqual(response.statusCode, 400);
  assert.deepStrictEqual(response.jsonPayload, { error: "Invalid payload" });
});

test("create enqueues operation and returns 202", async () => {
  const controller = createStudentsController(pool, createBaseDependencies() as never);
  const response = createMockResponse();

  await controller.create({ body: { id: "1", name: "A", grade: "A", email: "a@test.com" } } as never, response as never, () => undefined);

  assert.strictEqual(response.statusCode, 202);
});

test("update requires at least one field", async () => {
  const controller = createStudentsController(pool, createBaseDependencies() as never);
  const response = createMockResponse();

  await controller.update({ params: { id: "1" }, body: {} } as never, response as never, () => undefined);

  assert.strictEqual(response.statusCode, 400);
  assert.deepStrictEqual(response.jsonPayload, { error: "Payload must include at least one field" });
});

test("remove validates id and returns 202 for valid payload", async () => {
  const controller = createStudentsController(pool, createBaseDependencies() as never);

  const badResponse = createMockResponse();
  await controller.remove({ params: { id: "" } } as never, badResponse as never, () => undefined);
  assert.strictEqual(badResponse.statusCode, 400);

  const goodResponse = createMockResponse();
  await controller.remove({ params: { id: "1" } } as never, goodResponse as never, () => undefined);
  assert.strictEqual(goodResponse.statusCode, 202);
});

test("internal errors are mapped to 500", async () => {
  const dependencies = createBaseDependencies();
  dependencies.selectAllUsers = async () => {
    throw new Error("boom");
  };

  const controller = createStudentsController(pool, dependencies as never);
  const response = createMockResponse();

  await controller.getStudents({} as never, response as never, () => undefined);

  assert.strictEqual(response.statusCode, 500);
  assert.deepStrictEqual(response.jsonPayload, { error: "Internal server error" });
});
