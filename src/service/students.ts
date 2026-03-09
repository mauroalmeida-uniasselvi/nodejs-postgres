import { Pool } from "pg";
import {
	getStudentCacheKey,
	getStudentsListCacheKey,
	invalidateByPattern,
	invalidateCache,
	readCache,
	writeCache,
} from "../util/cache.ts";
import { executeDbQuery, logDb } from "../util/database.ts";

export interface Student {
	id: string;
	name: string;
	grade: string;
	email: string;
}

interface StudentUpdateInput {
	name?: string;
	grade?: string;
	email?: string;
}

interface StudentsServiceDependencies {
	getStudentCacheKey: typeof getStudentCacheKey;
	getStudentsListCacheKey: typeof getStudentsListCacheKey;
	invalidateByPattern: typeof invalidateByPattern;
	invalidateCache: typeof invalidateCache;
	readCache: typeof readCache;
	writeCache: typeof writeCache;
	executeDbQuery: typeof executeDbQuery;
	logDb: typeof logDb;
}

const defaultDependencies: StudentsServiceDependencies = {
	getStudentCacheKey,
	getStudentsListCacheKey,
	invalidateByPattern,
	invalidateCache,
	readCache,
	writeCache,
	executeDbQuery,
	logDb,
};

const dependencies: StudentsServiceDependencies = { ...defaultDependencies };

export function __setStudentsServiceDependenciesForTests(
	overrides: Partial<StudentsServiceDependencies>
): void {
	Object.assign(dependencies, overrides);
}

export function __resetStudentsServiceDependenciesForTests(): void {
	Object.assign(dependencies, defaultDependencies);
}

function isCacheDebugEnabled(): boolean {
	return (process.env.CACHE_DEBUG || "false").toLowerCase() === "true";
}

function logCache(message: string): void {
	if (isCacheDebugEnabled()) {
		console.log(message);
	}
}

async function invalidateStudentCache(id: string): Promise<void> {
	await dependencies.invalidateCache([
		dependencies.getStudentCacheKey(id),
		dependencies.getStudentsListCacheKey(),
	]);
}

export async function insertStudent(
	pool: Pool,
	id: string,
	name: string,
	grade: string,
	email: string
): Promise<string> {
	const result = await dependencies.executeDbQuery<{ id: string }>(
		pool,
		"INSERT INTO students (id, name, grade, email) VALUES ($1, $2, $3, $4) RETURNING id",
		[id, name, grade, email]
	);

	const newStudentId = result.rows[0].id as string;

	await dependencies.invalidateCache([dependencies.getStudentsListCacheKey()]);
	await dependencies.writeCache(dependencies.getStudentCacheKey(newStudentId), {
		id: newStudentId,
		name,
		grade,
		email,
	});

	return newStudentId;
}

export async function selectUserById(pool: Pool, id: string): Promise<Student | null> {
	const cacheKey = dependencies.getStudentCacheKey(id);
	const cachedStudent = await dependencies.readCache<Student>(cacheKey);
	if (cachedStudent) {
		logCache(`[CACHE][selectUserById] source=redis id=${id}`);
		return cachedStudent;
	}

	dependencies.logDb(`selectUserById source=postgres id=${id}`);
	const result = await dependencies.executeDbQuery<Student>(pool, "SELECT * FROM students WHERE id = $1", [id]);
	const student = result.rows[0] || null;

	if (student) {
		await dependencies.writeCache(cacheKey, student);
	}

	return student;
}

export async function selectAllUsers(pool: Pool): Promise<Student[]> {
	const cacheKey = dependencies.getStudentsListCacheKey();
	const cachedStudents = await dependencies.readCache<Student[]>(cacheKey);
	if (cachedStudents) {
		logCache("[CACHE][selectAllUsers] source=redis");
		return cachedStudents;
	}

	dependencies.logDb("selectAllUsers source=postgres");
	const result = await dependencies.executeDbQuery<Student>(pool, "SELECT * FROM students");
	await dependencies.writeCache(cacheKey, result.rows);
	return result.rows;
}

export async function updateStudent(
	pool: Pool,
	id: string,
	name: string,
	grade: string,
	email: string
): Promise<boolean> {
	const result = await dependencies.executeDbQuery(
		pool,
		"UPDATE students SET name = $1, grade = $2, email = $3 WHERE id = $4 RETURNING id",
		[name, grade, email, id]
	);

	if (!result.rowCount) {
		return false;
	}

	await invalidateStudentCache(id);
	return true;
}

export async function updateStudentName(
	pool: Pool,
	id: string,
	name: string
): Promise<boolean> {
	const result = await dependencies.executeDbQuery(pool, "UPDATE students SET name = $1 WHERE id = $2 RETURNING id", [name, id]);
	if (!result.rowCount) {
		return false;
	}
	await invalidateStudentCache(id);
	return true;
}

export async function updateStudentEmail(
	pool: Pool,
	id: string,
	email: string
): Promise<boolean> {
	const result = await dependencies.executeDbQuery(pool, "UPDATE students SET email = $1 WHERE id = $2 RETURNING id", [email, id]);
	if (!result.rowCount) {
		return false;
	}
	await invalidateStudentCache(id);
	return true;
}

export async function updateStudentPartial(
	pool: Pool,
	id: string,
	payload: StudentUpdateInput
): Promise<Student | null> {
	const updates: string[] = [];
	const values: unknown[] = [];

	if (typeof payload.name === "string") {
		values.push(payload.name);
		updates.push(`name = $${values.length}`);
	}

	if (typeof payload.grade === "string") {
		values.push(payload.grade);
		updates.push(`grade = $${values.length}`);
	}

	if (typeof payload.email === "string") {
		values.push(payload.email);
		updates.push(`email = $${values.length}`);
	}

	if (updates.length === 0) {
		return null;
	}

	values.push(id);

	const result = await dependencies.executeDbQuery<Student>(
		pool,
		`UPDATE students SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
		values
	);

	if (!result.rowCount) {
		return null;
	}

	await invalidateStudentCache(id);
	return result.rows[0] ?? null;
}

export async function deleteStudent(pool: Pool, id: string): Promise<boolean> {
	const result = await dependencies.executeDbQuery(pool, "DELETE FROM students WHERE id = $1 RETURNING id", [id]);
	if (!result.rowCount) {
		return false;
	}
	await invalidateStudentCache(id);
	return true;
}

export async function deleteAllStudent(pool: Pool): Promise<void> {
	await dependencies.executeDbQuery(pool, "DELETE FROM students");
	await dependencies.invalidateCache([dependencies.getStudentsListCacheKey()]);
	await dependencies.invalidateByPattern("student:*");
}
