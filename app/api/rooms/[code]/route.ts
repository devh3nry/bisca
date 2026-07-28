import { NextResponse } from "next/server";
import { toView } from "@/lib/room";
import { getRoom } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await getRoom(code.toUpperCase());
  if (!room) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }

  const playerId = new URL(request.url).searchParams.get("playerId");
  return NextResponse.json(toView(room, playerId));
}
