// Testes das regras da casa: ás travado, sete volteada, rela e capote.
// Rodar com: npx tsx scripts/regras.ts

import {
  BLOCK_ACE_REASON,
  blockedCards,
  createRoom,
  deal,
  playCard,
  rematch,
  trumpAllowed,
} from "../lib/room";
import { MATCH_TARGET, type Room } from "../lib/types";

let checks = 0;

function ok(condition: boolean, label: string) {
  checks++;
  if (!condition) throw new Error(`FALHOU: ${label}`);
}

/** Monta uma mesa com mãos fixas, pra testar situação por situação. */
function mesa(size: 2 | 4, hands: string[][], trump: string, deck: string[] = []) {
  const room = createRoom("TEST", size, "host");
  for (let seat = 0; seat < size; seat++) {
    room.players.push({ id: `p${seat}`, name: `P${seat}`, seat });
  }
  room.hands = hands.map((h) => h.slice());
  room.trump = trump;
  room.trumpSuit = trump.slice(-1) as Room["trumpSuit"];
  room.trumpTaken = true;
  room.deck = deck;
  room.phase = "playing";
  room.leader = 0;
  room.turn = 0;
  return room;
}

// ---------- a carta virada nunca pode ser ás nem 7 ----------

{
  const vistos = new Map<string, number>();
  for (let i = 0; i < 3000; i++) {
    const room = createRoom("TEST", 2, "host");
    for (let seat = 0; seat < 2; seat++) {
      room.players.push({ id: `p${seat}`, name: `P${seat}`, seat });
    }
    deal(room, 0);

    const rank = room.trump!.slice(0, -1);
    vistos.set(rank, (vistos.get(rank) ?? 0) + 1);
    ok(rank !== "A", "carta virada nunca é ás");
    ok(rank !== "7", "carta virada nunca é 7");
    ok(trumpAllowed(room.trump!), "trumpAllowed concorda com o que foi dado");

    // e o baralho tem que continuar completo depois do reembaralhamento
    const todas = [...room.deck, room.trump!, ...room.hands.flat()];
    ok(todas.length === 40, "40 cartas depois de redistribuir");
    ok(new Set(todas).size === 40, "sem carta repetida depois de redistribuir");
  }

  // Os 8 valores permitidos têm que aparecer — senão o filtro comeu demais.
  const esperados = ["2", "3", "4", "5", "6", "J", "Q", "K"];
  for (const rank of esperados) {
    ok(vistos.has(rank), `carta virada ${rank} aparece em algum momento`);
  }
  console.log(
    "  viradas em 3000 mãos:",
    [...vistos.entries()].sort().map(([r, n]) => `${r}=${n}`).join(" ")
  );
}

// ---------- ás de trunfo não pode puxar ----------

{
  const room = mesa(2, [["AS", "3H", "4D"], ["2S", "5H", "6D"]], "KS");

  ok(blockedCards(room, 0).AS === BLOCK_ACE_REASON, "ás bloqueado ao puxar");
  const tentativa = playCard(room, 0, "AS");
  ok(!tentativa.ok, "servidor recusa puxar com o ás de trunfo");

  // Respondendo, o ás é livre.
  ok(playCard(room, 0, "3H").ok, "puxa outra carta");
  ok(
    Object.keys(blockedCards(room, 1)).length === 0,
    "quem responde não tem carta bloqueada"
  );
  ok(playCard(room, 1, "2S").ok, "responde normalmente");
}

{
  // Depois do 7 de trunfo sair, o ás libera.
  const room = mesa(2, [["7S", "AS", "4D"], ["2S", "5H", "6D"]], "KS");
  ok(playCard(room, 0, "7S").ok, "joga o 7 de trunfo");
  ok(room.sevenTrumpPlayed, "marcou que o 7 de trunfo saiu");
  playCard(room, 1, "2S");
  const puxador = room.turn;
  if (puxador === 0) {
    ok(
      blockedCards(room, 0).AS === undefined,
      "ás liberado depois do 7 de trunfo"
    );
  }
}

{
  // Última carta na mão: o ás tem que poder sair, senão o jogo trava.
  const room = mesa(2, [["AS"], ["2H"]], "KS");
  ok(
    Object.keys(blockedCards(room, 0)).length === 0,
    "ás sozinho na mão não trava"
  );
  ok(playCard(room, 0, "AS").ok, "joga o ás sendo a única carta");
}

// ---------- sete volteada (só 2v2) ----------

{
  const room = mesa(
    4,
    [["7H"], ["2H"], ["3H"], ["4H"]],
    "KS",
    []
  );
  playCard(room, 0, "7H");
  playCard(room, 1, "2H");
  playCard(room, 2, "3H");
  playCard(room, 3, "4H");

  const volteada = room.awards.find((a) => a.kind === "sete-volteada");
  ok(!!volteada, "sete volteada rendeu ponto");
  ok(volteada!.team === 0, "ponto foi pro time de quem volteou");
}

{
  // O mesmo 7 cortado não pode dar volteada.
  const room = mesa(4, [["7H"], ["2S"], ["3H"], ["4H"]], "KS");
  playCard(room, 0, "7H");
  playCard(room, 1, "2S"); // trunfo corta
  playCard(room, 2, "3H");
  playCard(room, 3, "4H");
  ok(
    !room.awards.some((a) => a.kind === "sete-volteada"),
    "7 cortado não conta volteada"
  );
}

{
  // Em 1v1 não existe volteada.
  const room = mesa(2, [["7H"], ["2H"]], "KS");
  playCard(room, 0, "7H");
  playCard(room, 1, "2H");
  ok(
    !room.awards.some((a) => a.kind === "sete-volteada"),
    "1v1 não tem sete volteada"
  );
}

// ---------- rela ----------

{
  const room = mesa(4, [["7H"], ["AH"], ["3H"], ["4H"]], "KS");
  playCard(room, 0, "7H");
  playCard(room, 1, "AH"); // ás em cima do 7 do adversário
  playCard(room, 2, "3H");
  playCard(room, 3, "4H");

  const rela = room.awards.find((a) => a.kind === "rela");
  ok(!!rela, "rela rendeu ponto");
  ok(rela!.team === 1, "ponto da rela foi pro time do ás");
}

{
  // Ás por cima do 7 do PRÓPRIO parceiro não é rela.
  const room = mesa(4, [["7H"], ["3H"], ["AH"], ["4H"]], "KS");
  playCard(room, 0, "7H");
  playCard(room, 1, "3H");
  playCard(room, 2, "AH"); // parceiro do lugar 0
  playCard(room, 3, "4H");
  ok(
    !room.awards.some((a) => a.kind === "rela"),
    "ás em cima do 7 do parceiro não é rela"
  );
}

// ---------- capote ----------

{
  // Time 1 leva tudo: time 0 fica em 0, capote.
  const room = mesa(2, [["2H"], ["AH"]], "KS");
  playCard(room, 0, "2H");
  playCard(room, 1, "AH");

  ok(room.phase === "done", "mão terminou");
  ok(room.winner === 1, "time 1 ganhou a mão");
  const capote = room.awards.find((a) => a.kind === "capote");
  ok(!!capote, "capote pontuou no 1v1");
  ok(room.matchPoints[1] === 2, "vitória + capote = 2 pontos");
  ok(room.matchPoints[0] === 0, "perdedor não pontua");
}

// ---------- fim de jogo aos 4 pontos ----------

{
  const room = mesa(2, [["2H"], ["AH"]], "KS");
  room.matchPoints = [0, 2];
  playCard(room, 0, "2H");
  playCard(room, 1, "AH"); // +1 vitória +1 capote = 4
  ok(room.matchPoints[1] === MATCH_TARGET, "chegou ao alvo");
  ok(room.matchWinner === 1, "jogo encerrado com vencedor");

  rematch(room);
  ok(room.matchWinner === null, "revanche zerou o vencedor");
  ok(
    room.matchPoints.every((p) => p === 0),
    "revanche depois do fim zera o placar"
  );
  ok(room.phase === "playing", "revanche deixou jogável");
}

{
  // Enquanto o jogo não acabou, a próxima mão mantém o placar.
  const room = mesa(2, [["2H"], ["AH"]], "KS");
  playCard(room, 0, "2H");
  playCard(room, 1, "AH");
  const antes = room.matchPoints.slice();
  ok(room.matchWinner === null, "2 pontos ainda não fecham o jogo");
  rematch(room);
  ok(
    room.matchPoints.join() === antes.join(),
    "próxima mão preserva o placar do jogo"
  );
}

console.log(`Todas as ${checks} verificações de regra passaram.`);
