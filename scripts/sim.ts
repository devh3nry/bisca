// Simulação de partidas completas pra validar o motor.
// Rodar com: npx tsx scripts/sim.ts

import {
  blockedCards,
  canSwapTrump,
  createRoom,
  deal,
  playCard,
  rematch,
  swapCardFor,
  swapTrump,
} from "../lib/room";
import { newDeck, sumPoints } from "../lib/bisca";

let swapsDone = 0;

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
      // Sempre que der, troca o 2 de trunfo — assim a troca entra em muitas
      // partidas e os invariantes do fim continuam tendo que bater.
      if (canSwapTrump(room, seat)) {
        const two = swapCardFor(room)!;
        const turned = room.trump!;
        const swap = swapTrump(room, seat);
        if (!swap.ok) throw new Error(swap.error);
        if (room.trump !== two) throw new Error("carta virada não ficou o 2");
        if (!hand.includes(turned)) throw new Error("mão não recebeu o trunfo");
        if (hand.includes(two)) throw new Error("o 2 ficou na mão");
        if (hand.length !== 3) throw new Error("a troca alterou o tamanho da mão");
        if (canSwapTrump(room, seat)) throw new Error("troca repetível");
        swapsDone++;
      }

      // Respeita as cartas travadas (ás de trunfo sem o 7 ter saído).
      const bloqueadas = blockedCards(room, seat);
      const jogaveis = hand.filter((c) => !bloqueadas[c]);
      if (jogaveis.length === 0) {
        throw new Error(`Lugar ${seat} ficou sem carta jogável`);
      }

      const card = jogaveis[Math.floor(Math.random() * jogaveis.length)];
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

    // O placar do jogo só pode crescer, e cada prêmio tem que estar refletido.
    const somaPremios = room.awards.reduce((t, a) => t + a.points, 0);
    if (somaPremios !== room.matchPoints[0] + room.matchPoints[1]) {
      throw new Error("prêmios não batem com o placar do jogo");
    }
    // Num empate ninguém ganha a mão nem leva capote — mas sete volteada e
    // rela já foram pagas durante o jogo e continuam valendo.
    if (
      room.winner === -1 &&
      room.awards.some((a) => a.kind === "vitoria" || a.kind === "capote")
    ) {
      throw new Error("empate não pode render vitória nem capote");
    }
    if (room.awards.some((a) => a.kind !== "vitoria" && a.kind !== "capote")) {
      if (size !== 4) throw new Error("volteada/rela fora do 2v2");
    }

    // A revanche tem que deixar o estado jogável de novo.
    rematch(room);
    const phaseAfterRematch: string = room.phase;
    if (phaseAfterRematch !== "playing" || room.hands.some((h) => h.length !== 3)) {
      throw new Error("Revanche deixou estado inválido");
    }
  }
  console.log(`OK: ${games} partidas de ${size} jogadores`);
}

simulate(2, 500);
simulate(4, 500);
if (swapsDone < 100) throw new Error(`só ${swapsDone} trocas — cobertura fraca`);
console.log(`Trocas do 2 de trunfo exercitadas: ${swapsDone}`);
console.log("Todos os invariantes passaram.");
