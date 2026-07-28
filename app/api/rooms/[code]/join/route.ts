import { NextResponse } from "next/server";
import { deal, newId, toView } from "@/lib/room";
import { getRoom, saveRoom, withLock } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 16) || "Jogador";
  const existingId = body.playerId ? String(body.playerId) : null;

  return withLock(code, async () => {
    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "Mesa não encontrada." },
        { status: 404 }
      );
    }

    // Reentrada (refresh da página, troca de rede): mantém o lugar.
    const known = existingId
      ? room.players.find((p) => p.id === existingId)
      : null;
    if (known) {
      return NextResponse.json({
        playerId: known.id,
        state: toView(room, known.id),
      });
    }

    if (room.players.length >= room.size) {
      return NextResponse.json({ error: "A mesa já está cheia." }, { status: 409 });
    }

    const taken = new Set(room.players.map((p) => p.seat));
    let seat = 0;
    while (taken.has(seat)) seat++;

    const playerId = newId();
    room.players.push({ id: playerId, name, seat });
    room.version++;

    if (room.players.length === room.size && room.phase === "lobby") {
      deal(room, 0);
    }

    await saveRoom(room);
    return NextResponse.json({ playerId, state: toView(room, playerId) });
  });
}
