// Simulação de partidas completas para validar o motor.
// Correr com: npx tsx scripts/sim.ts

import { createRoom, deal, playCard, rematch } from "../lib/room";
import { newDeck, sumPoints } from "../lib/bisca";

function simulate(size: 2 | 4, games: number) {
  for (let game = 0; game < games; game++) {
    const room = createRoom("TEST", size, "host");
    for (let seat = 0; seat < size; seat++) {
      room.players.push({ id: `p${seat}`, name: `P${seat}`, seat });
    }
    deal(room, 0);

    let moves = 0;
    while (room.phase === "playing") {
      const seat = room.turn;
      const hand = room.hands[seat];
      if (hand.length === 0) throw new Error(`Vez do lugar ${seat} sem cartas`);
      const card = hand[Math.floor(Math.random() * hand.length)];
      const result = playCard(room, seat, card);
      if (!result.ok) throw new Error(result.error);
      if (++moves > 200) throw new Error("Partida não termina");
    }

    // Invariantes
    const total = room.scores[0] + room.scores[1];
    if (total !== 120) throw new Error(`Pontos = ${total}, esperado 120`);

    const seen = [...room.piles[0], ...room.piles[1]];
    if (seen.length !== 40) throw new Error(`${seen.length} cartas nos montes`);
    if (new Set(seen).size !== 40) throw new Error("Cartas duplicadas");

    const tricks = room.tricks[0] + room.tricks[1];
    if (tricks !== 40 / size) throw new Error(`${tricks} vazas`);

    if (sumPoints(newDeck()) !== 120) throw new Error("Baralho não vale 120");

    // A revanche tem de deixar o estado jogável outra vez.
    rematch(room);
    if (room.phase !== "playing" || room.hands.some((h) => h.length !== 3)) {
      throw new Error("Revanche deixou estado inválido");
    }
  }
  console.log(`OK: ${games} partidas de ${size} jogadores`);
}

simulate(2, 500);
simulate(4, 500);
console.log("Todos os invariantes passaram.");
