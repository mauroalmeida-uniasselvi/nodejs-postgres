import "dotenv/config";
import { createClient, type RedisClientType } from "redis";

const configuredRedisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const redisPassword = process.env.REDIS_PASSWORD || "uniasselvi";
const cacheTtlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || "300");
const cacheDebugEnabled = (process.env.CACHE_DEBUG || "false").toLowerCase() === "true";

let redisClient: RedisClientType | null = null;
let redisConnectionPromise: Promise<RedisClientType> | null = null;

const STUDENT_KEY_PREFIX = "student:";
const STUDENTS_LIST_KEY = "students:all";

function logCache(message: string): void {
  if (!cacheDebugEnabled) {
    return;
  }
  console.log(`[CACHE] ${message}`);
}

function getRedisHosts(): string[] {
  const hosts = [configuredRedisHost, "localhost", "redis"];
  return Array.from(new Set(hosts.filter((hostValue) => hostValue && hostValue.trim().length > 0)));
}

function createRedisUrl(host: string) {
  const passwordSection = redisPassword ? `:${redisPassword}@` : "";
  return `redis://${passwordSection}${host}:${redisPort}`;
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

  redisConnectionPromise = (async () => {
    const hosts = getRedisHosts();
    let lastError: unknown = null;

    for (const host of hosts) {
      const candidate = createClient({
        url: createRedisUrl(host),
      }) as RedisClientType;

      candidate.on("error", (error) => {
        logCache(`Redis error (${host}): ${error.message}`);
      });

      try {
        await candidate.connect();
        redisClient = candidate;
        logCache(`Redis connection established (${host})`);
        return candidate;
      } catch (error) {
        lastError = error;
        await candidate.disconnect().catch(() => undefined);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Unable to connect to Redis");
  })().finally(() => {
    redisConnectionPromise = null;
  });

  return redisConnectionPromise as Promise<RedisClientType>;
}

export async function ensureRedisConnection(): Promise<void> {
  try {
    await getRedisClient();
    console.log("Connected to Redis");
    logCache("Cache layer enabled");
  } catch (error) {
    console.warn("Redis unavailable. Continuing without cache.", error);
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (!redisClient?.isOpen) {
    return;
  }

  await redisClient.quit();
  logCache("Redis connection closed");
  redisClient = null;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const cachedValue = await client.get(key);
    if (!cachedValue) {
      logCache(`MISS key=${key}`);
      return null;
    }
    logCache(`HIT key=${key}`);
    return JSON.parse(cachedValue) as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown error";
    logCache(`READ_ERROR key=${key} error=${errorMessage}`);
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.set(key, JSON.stringify(value), {
      EX: cacheTtlSeconds,
    });
    logCache(`WRITE key=${key} ttl=${cacheTtlSeconds}s`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown error";
    logCache(`WRITE_ERROR key=${key} error=${errorMessage}`);
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
    logCache(`INVALIDATE keys=${keys.join(",")}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown error";
    logCache(`INVALIDATE_ERROR keys=${keys.join(",")} error=${errorMessage}`);
    // Ignore cache errors and keep the database flow
  }
}

export async function invalidateByPattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      logCache(`INVALIDATE_PATTERN pattern=${pattern} keys=${keys.length}`);
      return;
    }
    logCache(`INVALIDATE_PATTERN pattern=${pattern} keys=0`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown error";
    logCache(`INVALIDATE_PATTERN_ERROR pattern=${pattern} error=${errorMessage}`);
    // Ignore cache errors and keep the database flow
  }
}