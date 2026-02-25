import type { Request, RequestHandler, Response } from "express";
import type { Pool } from "pg";
import {
    deleteStudent,
    insertStudent,
    selectAllUsers,
    selectUserById,
    updateStudentPartial,
} from "../service/students.ts";

function parseId(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return null;
    }

    if (typeof value !== "string") {
        return null;
    }

    const id = value.trim();
    if (!id) {
        return null;
    }
    return id;
}

export function getStudentsHandler(pool: Pool): RequestHandler {
    return async (_request: Request, response: Response) => {
        try {
            const students = await selectAllUsers(pool);
            response.status(200).json(students);
        } catch (error) {
            console.error(error);
            response.status(500).json({ error: "Internal server error" });
        }
    };
}

export function getStudentByIdHandler(pool: Pool): RequestHandler {
    return async (request: Request, response: Response) => {
        const id = parseId(request.params.id);
        if (!id) {
            response.status(400).json({ error: "Invalid id" });
            return;
        }

        try {
            const student = await selectUserById(pool, id);
            if (!student) {
                response.status(404).json({ error: "Student not found" });
                return;
            }

            response.status(200).json(student);
        } catch (error) {
            console.error(error);
            response.status(500).json({ error: "Internal server error" });
        }
    };
}

export function createStudentHandler(pool: Pool): RequestHandler {
    return async (request: Request, response: Response) => {
        const { id, name, grade, email } = request.body as {
            id?: unknown;
            name?: unknown;
            grade?: unknown;
            email?: unknown;
        };

        if (
            typeof id !== "string"
            || typeof name !== "string"
            || typeof grade !== "string"
            || typeof email !== "string"
        ) {
            response.status(400).json({ error: "Invalid payload" });
            return;
        }

        try {
            const studentId = await insertStudent(pool, id, name, grade, email);
            const student = await selectUserById(pool, studentId);
            response.status(201).json(student);
        } catch (error) {
            console.error(error);
            response.status(500).json({ error: "Internal server error" });
        }
    };
}

export function updateStudentHandler(pool: Pool): RequestHandler {
    return async (request: Request, response: Response) => {
        const id = parseId(request.params.id);
        if (!id) {
            response.status(400).json({ error: "Invalid id" });
            return;
        }

        const payload = request.body as {
            name?: unknown;
            grade?: unknown;
            email?: unknown;
        };

        const updatePayload: {
            name?: string;
            grade?: string;
            email?: string;
        } = {};

        if (typeof payload.name === "string") {
            updatePayload.name = payload.name;
        }
        if (typeof payload.grade === "string") {
            updatePayload.grade = payload.grade;
        }
        if (typeof payload.email === "string") {
            updatePayload.email = payload.email;
        }

        if (Object.keys(updatePayload).length === 0) {
            response.status(400).json({ error: "Payload must include at least one field" });
            return;
        }

        try {
            const student = await updateStudentPartial(pool, id, updatePayload);
            if (!student) {
                response.status(404).json({ error: "Student not found" });
                return;
            }

            response.status(200).json(student);
        } catch (error) {
            console.error(error);
            response.status(500).json({ error: "Internal server error" });
        }
    };
}

export function deleteStudentHandler(pool: Pool): RequestHandler {
    return async (request: Request, response: Response) => {
        const id = parseId(request.params.id);
        if (!id) {
            response.status(400).json({ error: "Invalid id" });
            return;
        }

        try {
            const deleted = await deleteStudent(pool, id);
            if (!deleted) {
                response.status(404).json({ error: "Student not found" });
                return;
            }

            response.status(204).send();
        } catch (error) {
            console.error(error);
            response.status(500).json({ error: "Internal server error" });
        }
    };
}
