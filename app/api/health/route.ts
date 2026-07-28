import { NextResponse } from "next/server";
import { usingRedis } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Diz se o Redis está configurado — sem ele o multijogador não funciona. */
export async function GET() {
  return NextResponse.json({ redis: usingRedis });
}
