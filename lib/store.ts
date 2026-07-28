import { Redis } from "@upstash/redis";
import type { Room } from "./types";

const TTL_SECONDS = 60 * 60 * 6; // salas expiram 6h depois da última jogada

/**
 * A integração da Vercel batiza as variáveis de formas diferentes conforme por
 * onde o Redis foi criado: `UPSTASH_REDIS_REST_URL`, `KV_REST_API_URL`, ou com
 * o prefixo que a pessoa escolher no diálogo de conexão. Em vez de exigir um
 * nome exato, procuramos pelo sufixo — assim qualquer prefixo funciona.
 */
function findEnv(suffixes: string[]): { name: string; value: string } | null {
  for (const suffix of suffixes) {
    for (const [name, value] of Object.entries(process.env)) {
      if (value && name.endsWith(suffix)) return { name, value };
    }
  }
  return null;
}

const restUrl = findEnv([
  "UPSTASH_REDIS_REST_URL",
  "KV_REST_API_URL",
  "REDIS_REST_URL",
  "REST_API_URL",
]);

const restToken = findEnv([
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_TOKEN",
  "REDIS_REST_TOKEN",
  "REST_API_TOKEN",
]);

// O cliente é HTTP: um `REDIS_URL` no formato rediss:// não serve aqui.
const hasUpstash =
  !!restUrl && !!restToken && restUrl.value.startsWith("https://");

const redis = hasUpstash
  ? new Redis({ url: restUrl!.value, token: restToken!.value })
  : null;

/** Só os nomes das variáveis encontradas — nunca os valores. */
export const redisEnvNames = {
  url: restUrl?.name ?? null,
  token: restToken?.name ?? null,
};

// Fallback em memória pro `next dev` sem Redis configurado. Não sobrevive a
// mais de uma instância — em produção configure sempre o Upstash.
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
 * Serializa as escritas de uma sala. Sem isso, dois jogadores entrando ao
 * mesmo tempo podem se sobrepor (read-modify-write).
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

  // Não pegamos o lock a tempo: seguimos em frente em vez de derrubar a
  // jogada. O jogo é por turnos, então a colisão real é rara.
  return fn();
}
