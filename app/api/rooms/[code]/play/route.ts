import { NextResponse } from "next/server";
import { playCard, toView } from "@/lib/room";
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
  const card = String(body.card ?? "");

  return withLock(code, async () => {
    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      return NextResponse.json(
        { error: "Não estás nesta sala." },
        { status: 403 }
      );
    }

    const result = playCard(room, player.seat, card);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, state: toView(room, playerId) },
        { status: result.status }
      );
    }

    await saveRoom(room);
    return NextResponse.json(toView(room, playerId));
  });
}
