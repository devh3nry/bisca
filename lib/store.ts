import { Redis } from "@upstash/redis";
import type { Room } from "./types";

const TTL_SECONDS = 60 * 60 * 6; // salas morrem 6h depois do último toque

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

// Fallback em memória para `next dev` sem Redis configurado. Não sobrevive a
// mais de uma instância — em produção configura sempre o Upstash.
const memory = globalThis as unknown as {
  __biscaRooms?: Map<string, { room: Room; expiresAt: number }>;
};
if (!memory.__biscaRooms) memory.__biscaRooms = new Map();
const rooms = memory.__biscaRooms;

export const usingRedis = hasUpstash;

function key(code: string) {
  return `bisca:room:${code}`;
}

export async function getRoom(code: string): Promise<Room | null> {
  if (redis) {
    return (await redis.get<Room>(key(code))) ?? null;
  }
  const entry = rooms.get(code);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    rooms.delete(code);
    return null;
  }
  return entry.room;
}

export async function saveRoom(room: Room): Promise<void> {
  room.updatedAt = Date.now();
  if (redis) {
    await redis.set(key(room.code), room, { ex: TTL_SECONDS });
    return;
  }
  rooms.set(room.code, {
    room,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
}

export async function roomExists(code: string): Promise<boolean> {
  return (await getRoom(code)) !== null;
}

/**
 * Serializa as escritas de uma sala. Sem isto, dois jogadores a entrarem ao
 * mesmo tempo podem sobrepor-se (read-modify-write).
 */
export async function withLock<T>(
  code: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!redis) return fn();

  const lockKey = `bisca:lock:${code}`;
  const token = Math.random().toString(36).slice(2);

  for (let attempt = 0; attempt < 25; attempt++) {
    const acquired = await redis.set(lockKey, token, { nx: true, px: 3000 });
    if (acquired) {
      try {
        return await fn();
      } finally {
        const current = await redis.get<string>(lockKey);
        if (current === token) await redis.del(lockKey);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  // Não conseguimos o lock a tempo: seguimos em frente em vez de falhar a
  // jogada. O jogo é por turnos, por isso a colisão real é rara.
  return fn();
}
