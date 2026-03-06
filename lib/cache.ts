import 'server-only';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
  return redis;
}

const DEFAULT_TTL = 900; // 15 minutes

export function hashQuery(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export async function getCachedQuery(sql: string): Promise<{ data: Record<string, unknown>[]; cachedAt: string } | null> {
  const r = getRedis();
  if (!r) return null;
  const key = `query:${hashQuery(sql)}`;
  return r.get<{ data: Record<string, unknown>[]; cachedAt: string }>(key);
}

export async function setCachedQuery(sql: string, data: Record<string, unknown>[], ttl: number = DEFAULT_TTL): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = `query:${hashQuery(sql)}`;
  await r.set(key, { data, cachedAt: new Date().toISOString() }, { ex: ttl });
}

export async function invalidateQuery(sql: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const key = `query:${hashQuery(sql)}`;
  await r.del(key);
}
