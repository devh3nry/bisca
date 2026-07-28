import { NextResponse } from "next/server";
import { createRoom, newCode, newId, toView } from "@/lib/room";
import { getRoom, saveRoom } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const size = body.size === 4 ? 4 : 2;
  const name = String(body.name ?? "").trim().slice(0, 16) || "Jogador";

  let code = newCode();
  for (let attempt = 0; attempt < 5 && (await getRoom(code)); attempt++) {
    code = newCode();
  }

  const playerId = newId();
  const room = createRoom(code, size, playerId);
  room.players.push({ id: playerId, name, seat: 0 });
  await saveRoom(room);

  return NextResponse.json({ code, playerId, state: toView(room, playerId) });
}
