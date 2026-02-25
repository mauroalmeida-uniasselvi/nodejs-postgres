import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { Pool } from "pg";
import { deleteStudent, insertStudent, updateStudentPartial } from "../service/students.ts";
import { getRedisClient } from "../util/cache.ts";

const STUDENTS_QUEUE_KEY = "queue:students:write";
const OPERATION_STATUS_PREFIX = "queue:students:operation:";
const OPERATION_STATUS_TTL_SECONDS = 3600;
const MAX_RETRIES = 3;

type OperationType = "create" | "update" | "delete";
type OperationState = "queued" | "processing" | "processed" | "failed";

interface StudentCreatePayload {
	id: string;
	name: string;
	grade: string;
	email: string;
}

interface StudentUpdatePayload {
	id: string;
	name?: string;
	grade?: string;
	email?: string;
}

interface StudentDeletePayload {
	id: string;
}

type StudentOperationPayload = StudentCreatePayload | StudentUpdatePayload | StudentDeletePayload;

interface QueueMessage {
	operationId: string;
	type: OperationType;
	payload: StudentOperationPayload;
	attempts: number;
	queuedAt: string;
}

export interface OperationStatus {
	operationId: string;
	type: OperationType;
	studentId: string;
	status: OperationState;
	attempts: number;
	updatedAt: string;
	error?: string;
}

export interface StudentUpdatedEvent {
	operationId: string;
	type: OperationType;
	studentId: string;
	status: "processed";
}

class NonRetryableQueueError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NonRetryableQueueError";
	}
}

const events = new EventEmitter();

let workerRunning = false;
let workerLoop: Promise<void> | null = null;

function getOperationStatusKey(operationId: string): string {
	return `${OPERATION_STATUS_PREFIX}${operationId}`;
}

function getStudentId(payload: StudentOperationPayload): string {
	return payload.id;
}

async function saveOperationStatus(status: OperationStatus): Promise<void> {
	const redis = await getRedisClient();
	await redis.set(getOperationStatusKey(status.operationId), JSON.stringify(status), {
		EX: OPERATION_STATUS_TTL_SECONDS,
	});
}

function isOperationType(value: unknown): value is OperationType {
	return value === "create" || value === "update" || value === "delete";
}

function parseQueueMessage(raw: string): QueueMessage | null {
	try {
		const parsed = JSON.parse(raw) as Partial<QueueMessage>;
		if (
			typeof parsed.operationId !== "string"
			|| !isOperationType(parsed.type)
			|| typeof parsed.payload !== "object"
			|| parsed.payload === null
			|| typeof parsed.attempts !== "number"
			|| typeof parsed.queuedAt !== "string"
		) {
			return null;
		}

		if (typeof (parsed.payload as { id?: unknown }).id !== "string") {
			return null;
		}

		return {
			operationId: parsed.operationId,
			type: parsed.type,
			payload: parsed.payload as StudentOperationPayload,
			attempts: parsed.attempts,
			queuedAt: parsed.queuedAt,
		};
	} catch {
		return null;
	}
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return "unknown error";
}

function isRetryableError(error: unknown): boolean {
	return !(error instanceof NonRetryableQueueError);
}

async function processQueueMessage(pool: Pool, message: QueueMessage): Promise<void> {
	const studentId = getStudentId(message.payload);
	const attemptNumber = message.attempts + 1;

	await saveOperationStatus({
		operationId: message.operationId,
		type: message.type,
		studentId,
		status: "processing",
		attempts: attemptNumber,
		updatedAt: new Date().toISOString(),
	});

	try {
		switch (message.type) {
			case "create": {
				const payload = message.payload as StudentCreatePayload;
				await insertStudent(pool, payload.id, payload.name, payload.grade, payload.email);
				break;
			}
			case "update": {
				const payload = message.payload as StudentUpdatePayload;
				const updatedStudent = await updateStudentPartial(pool, payload.id, {
					name: payload.name,
					grade: payload.grade,
					email: payload.email,
				});
				if (!updatedStudent) {
					throw new NonRetryableQueueError("Student not found");
				}
				break;
			}
			case "delete": {
				const payload = message.payload as StudentDeletePayload;
				const deleted = await deleteStudent(pool, payload.id);
				if (!deleted) {
					throw new NonRetryableQueueError("Student not found");
				}
				break;
			}
			default:
				throw new NonRetryableQueueError("Invalid operation type");
		}

		await saveOperationStatus({
			operationId: message.operationId,
			type: message.type,
			studentId,
			status: "processed",
			attempts: attemptNumber,
			updatedAt: new Date().toISOString(),
		});

		events.emit("student-updated", {
			operationId: message.operationId,
			type: message.type,
			studentId,
			status: "processed",
		} satisfies StudentUpdatedEvent);
	} catch (error) {
		if (isRetryableError(error) && attemptNumber < MAX_RETRIES) {
			await saveOperationStatus({
				operationId: message.operationId,
				type: message.type,
				studentId,
				status: "queued",
				attempts: attemptNumber,
				updatedAt: new Date().toISOString(),
				error: toErrorMessage(error),
			});

			const redis = await getRedisClient();
			const retryMessage: QueueMessage = {
				...message,
				attempts: attemptNumber,
			};
			await redis.lPush(STUDENTS_QUEUE_KEY, JSON.stringify(retryMessage));
			return;
		}

		await saveOperationStatus({
			operationId: message.operationId,
			type: message.type,
			studentId,
			status: "failed",
			attempts: attemptNumber,
			updatedAt: new Date().toISOString(),
			error: toErrorMessage(error),
		});
	}
}

async function runWorker(pool: Pool): Promise<void> {
	const baseRedis = await getRedisClient();
	const redisWorker = baseRedis.duplicate();
	await redisWorker.connect();

	try {
		while (workerRunning) {
			const result = await redisWorker.brPop(STUDENTS_QUEUE_KEY, 5);
			if (!result) {
				continue;
			}

			const message = parseQueueMessage(result.element);
			if (!message) {
				continue;
			}

			await processQueueMessage(pool, message);
		}
	} finally {
		if (redisWorker.isOpen) {
			await redisWorker.quit();
		}
	}
}

export async function enqueueCreateStudentOperation(payload: StudentCreatePayload): Promise<OperationStatus> {
	const operationId = randomUUID();
	const message: QueueMessage = {
		operationId,
		type: "create",
		payload,
		attempts: 0,
		queuedAt: new Date().toISOString(),
	};

	const status: OperationStatus = {
		operationId,
		type: "create",
		studentId: payload.id,
		status: "queued",
		attempts: 0,
		updatedAt: new Date().toISOString(),
	};

	await saveOperationStatus(status);

	const redis = await getRedisClient();
	await redis.lPush(STUDENTS_QUEUE_KEY, JSON.stringify(message));

	return status;
}

export async function enqueueUpdateStudentOperation(payload: StudentUpdatePayload): Promise<OperationStatus> {
	const operationId = randomUUID();
	const message: QueueMessage = {
		operationId,
		type: "update",
		payload,
		attempts: 0,
		queuedAt: new Date().toISOString(),
	};

	const status: OperationStatus = {
		operationId,
		type: "update",
		studentId: payload.id,
		status: "queued",
		attempts: 0,
		updatedAt: new Date().toISOString(),
	};

	await saveOperationStatus(status);

	const redis = await getRedisClient();
	await redis.lPush(STUDENTS_QUEUE_KEY, JSON.stringify(message));

	return status;
}

export async function enqueueDeleteStudentOperation(payload: StudentDeletePayload): Promise<OperationStatus> {
	const operationId = randomUUID();
	const message: QueueMessage = {
		operationId,
		type: "delete",
		payload,
		attempts: 0,
		queuedAt: new Date().toISOString(),
	};

	const status: OperationStatus = {
		operationId,
		type: "delete",
		studentId: payload.id,
		status: "queued",
		attempts: 0,
		updatedAt: new Date().toISOString(),
	};

	await saveOperationStatus(status);

	const redis = await getRedisClient();
	await redis.lPush(STUDENTS_QUEUE_KEY, JSON.stringify(message));

	return status;
}

export function subscribeStudentsUpdates(listener: (event: StudentUpdatedEvent) => void): () => void {
	events.on("student-updated", listener);
	return () => {
		events.off("student-updated", listener);
	};
}

export async function startStudentsQueueWorker(pool: Pool): Promise<void> {
	if (workerRunning) {
		return;
	}

	workerRunning = true;
	workerLoop = runWorker(pool).catch((error) => {
		console.error("Students queue worker stopped due to error", error);
	});
}

export async function stopStudentsQueueWorker(): Promise<void> {
	if (!workerRunning) {
		return;
	}

	workerRunning = false;

	if (workerLoop) {
		await workerLoop;
		workerLoop = null;
	}
}

