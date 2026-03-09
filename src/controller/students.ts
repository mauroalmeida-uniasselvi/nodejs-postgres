import type { Request, RequestHandler, Response } from "express";
import type { Pool } from "pg";
import {
    type Student,
    selectAllUsers,
    selectUserById,
} from "../service/students.ts";
import {
    type OperationStatus,
    enqueueCreateStudentOperation,
    enqueueDeleteStudentOperation,
    enqueueUpdateStudentOperation,
} from "../worker/students.ts";

type CreateStudentPayload = {
    id: string;
    name: string;
    grade: string;
    email: string;
};

type UpdateStudentPayload = {
    name?: string;
    grade?: string;
    email?: string;
};

interface StudentsControllerDependencies {
    selectAllUsers: (pool: Pool) => Promise<Student[]>;
    selectUserById: (pool: Pool, id: string) => Promise<Student | null>;
    enqueueCreateStudentOperation: (payload: CreateStudentPayload) => Promise<OperationStatus>;
    enqueueUpdateStudentOperation: (payload: { id: string } & UpdateStudentPayload) => Promise<OperationStatus>;
    enqueueDeleteStudentOperation: (payload: { id: string }) => Promise<OperationStatus>;
}

const defaultDependencies: StudentsControllerDependencies = {
    selectAllUsers,
    selectUserById,
    enqueueCreateStudentOperation,
    enqueueUpdateStudentOperation,
    enqueueDeleteStudentOperation,
};

function parseId(value: string | string[] | undefined): string | null {
    if (Array.isArray(value) || typeof value !== "string") {
        return null;
    }

    const id = value.trim();
    return id || null;
}

function withInternalError(handler: (request: Request, response: Response) => Promise<void>): RequestHandler {
    return async (request: Request, response: Response) => {
        try {
            await handler(request, response);
        } catch (error) {
            console.error(error);
            response.status(500).json({ error: "Internal server error" });
        }
    };
}

function parseCreatePayload(body: unknown): CreateStudentPayload | null {
    const payload = body as {
        id?: unknown;
        name?: unknown;
        grade?: unknown;
        email?: unknown;
    };

    if (
        typeof payload.id !== "string"
        || typeof payload.name !== "string"
        || typeof payload.grade !== "string"
        || typeof payload.email !== "string"
    ) {
        return null;
    }

    return {
        id: payload.id,
        name: payload.name,
        grade: payload.grade,
        email: payload.email,
    };
}

function parseUpdatePayload(body: unknown): UpdateStudentPayload | null {
    const payload = body as {
        name?: unknown;
        grade?: unknown;
        email?: unknown;
    };

    const updatePayload: UpdateStudentPayload = {
        ...(typeof payload.name === "string" ? { name: payload.name } : {}),
        ...(typeof payload.grade === "string" ? { grade: payload.grade } : {}),
        ...(typeof payload.email === "string" ? { email: payload.email } : {}),
    };

    return Object.keys(updatePayload).length > 0 ? updatePayload : null;
}

export function getStudentsHandler(pool: Pool): RequestHandler {
    return createStudentsController(pool).getStudents;
}

export function getStudentByIdHandler(pool: Pool): RequestHandler {
    return createStudentsController(pool).getById;
}

export function createStudentHandler(_pool: Pool): RequestHandler {
    return createStudentsController(_pool).create;
}

export function updateStudentHandler(_pool: Pool): RequestHandler {
    return createStudentsController(_pool).update;
}

export function deleteStudentHandler(_pool: Pool): RequestHandler {
    return createStudentsController(_pool).remove;
}

export function createStudentsController(
    pool: Pool,
    dependencies: StudentsControllerDependencies = defaultDependencies
): {
    getStudents: RequestHandler;
    getById: RequestHandler;
    create: RequestHandler;
    update: RequestHandler;
    remove: RequestHandler;
} {
    return {
        getStudents: withInternalError(async (_request: Request, response: Response) => {
            const students = await dependencies.selectAllUsers(pool);
            response.status(200).json(students);
        }),
        getById: withInternalError(async (request: Request, response: Response) => {
            const id = parseId(request.params.id);
            if (!id) {
                response.status(400).json({ error: "Invalid id" });
                return;
            }

            const student = await dependencies.selectUserById(pool, id);
            if (!student) {
                response.status(404).json({ error: "Student not found" });
                return;
            }

            response.status(200).json(student);
        }),
        create: withInternalError(async (request: Request, response: Response) => {
            const payload = parseCreatePayload(request.body);
            if (!payload) {
                response.status(400).json({ error: "Invalid payload" });
                return;
            }

            const operation = await dependencies.enqueueCreateStudentOperation(payload);
            response.status(202).json(operation);
        }),
        update: withInternalError(async (request: Request, response: Response) => {
            const id = parseId(request.params.id);
            if (!id) {
                response.status(400).json({ error: "Invalid id" });
                return;
            }

            const updatePayload = parseUpdatePayload(request.body);
            if (!updatePayload) {
                response.status(400).json({ error: "Payload must include at least one field" });
                return;
            }

            const operation = await dependencies.enqueueUpdateStudentOperation({ id, ...updatePayload });
            response.status(202).json(operation);
        }),
        remove: withInternalError(async (request: Request, response: Response) => {
            const id = parseId(request.params.id);
            if (!id) {
                response.status(400).json({ error: "Invalid id" });
                return;
            }

            const operation = await dependencies.enqueueDeleteStudentOperation({ id });
            response.status(202).json(operation);
        }),
    };
}
