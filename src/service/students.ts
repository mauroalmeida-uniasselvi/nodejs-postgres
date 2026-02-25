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

export async function insertStudent(
	pool: Pool,
	id: string,
	name: string,
	grade: string,
	email: string
): Promise<string> {
	const result = await executeDbQuery<{ id: string }>(
		pool,
		"INSERT INTO students (id, name, grade, email) VALUES ($1, $2, $3, $4) RETURNING id",
		[id, name, grade, email]
	);

	const newStudentId = result.rows[0].id as string;

	await invalidateCache([getStudentsListCacheKey()]);
	await writeCache(getStudentCacheKey(newStudentId), {
		id: newStudentId,
		name,
		grade,
		email,
	});

	return newStudentId;
}

export async function selectUserById(pool: Pool, id: string): Promise<Student | null> {
	const cacheKey = getStudentCacheKey(id);
	const cachedStudent = await readCache<Student>(cacheKey);
	if (cachedStudent) {
		if ((process.env.CACHE_DEBUG || "false").toLowerCase() === "true") {
			console.log(`[CACHE][selectUserById] source=redis id=${id}`);
		}
		return cachedStudent;
	}

	logDb(`selectUserById source=postgres id=${id}`);
	const result = await executeDbQuery<Student>(pool, "SELECT * FROM students WHERE id = $1", [id]);
	const student = result.rows[0] || null;

	if (student) {
		await writeCache(cacheKey, student);
	}

	return student;
}

export async function selectAllUsers(pool: Pool): Promise<Student[]> {
	const cacheKey = getStudentsListCacheKey();
	const cachedStudents = await readCache<Student[]>(cacheKey);
	if (cachedStudents) {
		if ((process.env.CACHE_DEBUG || "false").toLowerCase() === "true") {
			console.log("[CACHE][selectAllUsers] source=redis");
		}
		return cachedStudents;
	}

	logDb("selectAllUsers source=postgres");
	const result = await executeDbQuery<Student>(pool, "SELECT * FROM students");
	await writeCache(cacheKey, result.rows);
	return result.rows;
}

export async function updateStudent(
	pool: Pool,
	id: string,
	name: string,
	grade: string,
	email: string
): Promise<boolean> {
	const result = await executeDbQuery(
		pool,
		"UPDATE students SET name = $1, grade = $2, email = $3 WHERE id = $4 RETURNING id",
		[name, grade, email, id]
	);

	if (!result.rowCount) {
		return false;
	}

	await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
	return true;
}

export async function updateStudentName(
	pool: Pool,
	id: string,
	name: string
): Promise<boolean> {
	const result = await executeDbQuery(pool, "UPDATE students SET name = $1 WHERE id = $2 RETURNING id", [name, id]);
	if (!result.rowCount) {
		return false;
	}
	await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
	return true;
}

export async function updateStudentEmail(
	pool: Pool,
	id: string,
	email: string
): Promise<boolean> {
	const result = await executeDbQuery(pool, "UPDATE students SET email = $1 WHERE id = $2 RETURNING id", [email, id]);
	if (!result.rowCount) {
		return false;
	}
	await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
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

	const result = await executeDbQuery<Student>(
		pool,
		`UPDATE students SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
		values
	);

	if (!result.rowCount) {
		return null;
	}

	await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
	return result.rows[0] ?? null;
}

export async function deleteStudent(pool: Pool, id: string): Promise<boolean> {
	const result = await executeDbQuery(pool, "DELETE FROM students WHERE id = $1 RETURNING id", [id]);
	if (!result.rowCount) {
		return false;
	}
	await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
	return true;
}

export async function deleteAllStudent(pool: Pool): Promise<void> {
	await executeDbQuery(pool, "DELETE FROM students");
	await invalidateCache([getStudentsListCacheKey()]);
	await invalidateByPattern("student:*");
}
