import { NextResponse } from "next/server";
import { rematch, toView } from "@/lib/room";
import { getRoom, saveRoom, withLock } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.playerId ?? "");

  return withLock(code, async () => {
    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "Mesa não encontrada." },
        { status: 404 }
      );
    }
    if (!room.players.some((p) => p.id === playerId)) {
      return NextResponse.json(
        { error: "Você não está nesta mesa." },
        { status: 403 }
      );
    }
    if (room.phase !== "done") {
      return NextResponse.json(
        { error: "A partida ainda não terminou." },
        { status: 409 }
      );
    }

    rematch(room);
    await saveRoom(room);
    return NextResponse.json(toView(room, playerId));
  });
}
