import { createClient, type RedisClientType } from "redis";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const redisPassword = process.env.REDIS_PASSWORD || "uniasselvi";
const cacheTtlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || "300");

let redisClient: RedisClientType | null = null;
let redisConnectionPromise: Promise<RedisClientType> | null = null;

const STUDENT_KEY_PREFIX = "student:";
const STUDENTS_LIST_KEY = "students:all";

function createRedisUrl() {
  const passwordSection = redisPassword ? `:${redisPassword}@` : "";
  return `redis://${passwordSection}${redisHost}:${redisPort}`;
}

export function getStudentCacheKey(id: number): string {
  return `${STUDENT_KEY_PREFIX}${id}`;
}

export function getStudentsListCacheKey(): string {
  return STUDENTS_LIST_KEY;
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnectionPromise) {
    return redisConnectionPromise;
  }

  redisClient = createClient({
    url: createRedisUrl(),
  });

  redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  redisConnectionPromise = redisClient.connect().then(() => {
    if (!redisClient) {
      throw new Error("Redis client not initialized");
    }
    return redisClient;
  }).finally(() => {
    redisConnectionPromise = null;
  });

  return redisConnectionPromise;
}

export async function ensureRedisConnection(): Promise<void> {
  try {
    await getRedisClient();
    console.log("Connected to Redis");
  } catch (error) {
    console.warn("Redis unavailable. Continuing without cache.", error);
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (!redisClient?.isOpen) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const cachedValue = await client.get(key);
    if (!cachedValue) {
      return null;
    }
    return JSON.parse(cachedValue) as T;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(key, JSON.stringify(value), {
      EX: cacheTtlSeconds,
    });
  } catch {
    // Ignore cache errors and keep the database flow
  }
}

export async function invalidateCache(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  try {
    const client = await getRedisClient();
    await client.del(keys);
  } catch {
    // Ignore cache errors and keep the database flow
  }
}

export async function invalidateByPattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch {
    // Ignore cache errors and keep the database flow
  }
}