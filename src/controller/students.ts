import { Pool } from "pg";
import {
	getStudentCacheKey,
	getStudentsListCacheKey,
	invalidateByPattern,
	invalidateCache,
	readCache,
	writeCache,
} from "../service/cache.ts";
import { executeDbQuery, logDb } from "../service/db.ts";

export interface Student {
	id: number;
	first_name: string;
	last_name: string;
	grade: string;
	email: string;
}

interface StudentUpdateInput {
	first_name?: string;
	last_name?: string;
	grade?: string;
	email?: string;
}

export async function insertStudent(
	pool: Pool,
	firstName: string,
	lastName: string,
	grade: string,
	email: string
): Promise<number> {
	const result = await executeDbQuery<{ id: number }>(
		pool,
		"INSERT INTO students (first_name, last_name, grade, email) VALUES ($1, $2, $3, $4) RETURNING id",
		[firstName, lastName, grade, email]
	);

	const newStudentId = result.rows[0].id as number;

	await invalidateCache([getStudentsListCacheKey()]);
	await writeCache(getStudentCacheKey(newStudentId), {
		id: newStudentId,
		first_name: firstName,
		last_name: lastName,
		grade,
		email,
	});

	return newStudentId;
}

export async function selectUserById(pool: Pool, id: number): Promise<Student | null> {
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
	id: number,
	firstName: string,
	lastName: string,
	grade: string,
	email: string
): Promise<boolean> {
	const result = await executeDbQuery(
		pool,
		"UPDATE students SET first_name = $1, last_name = $2, grade = $3, email = $4 WHERE id = $5 RETURNING id",
		[firstName, lastName, grade, email, id]
	);

	if (!result.rowCount) {
		return false;
	}

	await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
	return true;
}

export async function updateStudentName(
	pool: Pool,
	id: number,
	firstName: string
): Promise<boolean> {
	const result = await executeDbQuery(pool, "UPDATE students SET first_name = $1 WHERE id = $2 RETURNING id", [firstName, id]);
	if (!result.rowCount) {
		return false;
	}
	await invalidateCache([getStudentCacheKey(id), getStudentsListCacheKey()]);
	return true;
}

export async function updateStudentEmail(
	pool: Pool,
	id: number,
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
	id: number,
	payload: StudentUpdateInput
): Promise<Student | null> {
	const updates: string[] = [];
	const values: unknown[] = [];

	if (typeof payload.first_name === "string") {
		values.push(payload.first_name);
		updates.push(`first_name = $${values.length}`);
	}

	if (typeof payload.last_name === "string") {
		values.push(payload.last_name);
		updates.push(`last_name = $${values.length}`);
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

export async function deleteStudent(pool: Pool, id: number): Promise<boolean> {
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
