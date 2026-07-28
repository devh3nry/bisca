import { NextResponse } from "next/server";
import { redisEnvNames, usingRedis } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Diz se o Redis está ligado — sem ele o multijogador não funciona. Mostra
 * também os NOMES das variáveis de ambiente que parecem ser de Redis, pra dar
 * pra ver de fora se a integração usou um nome inesperado. Valores nunca.
 */
export async function GET() {
  const candidates = Object.keys(process.env)
    .filter((name) => /REDIS|KV_|UPSTASH/i.test(name))
    .sort();

  return NextResponse.json({
    redis: usingRedis,
    usando: redisEnvNames,
    variaveisEncontradas: candidates,
  });
}
