import {
  newDeck,
  rankOf,
  shuffle,
  sumPoints,
  suitOf,
  teamOf,
  trickWinner,
  type Card,
} from "./bisca";
import type { Award, Play, PlayerView, Room } from "./types";
import { MATCH_TARGET } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I/O/0/1

export function newCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createRoom(code: string, size: 2 | 4, hostId: string): Room {
  const teams = 2; // 1v1 ou 2v2 — são sempre dois times
  return {
    code,
    size,
    phase: "lobby",
    players: [],
    hostId,
    deck: [],
    hands: Array.from({ length: size }, () => []),
    trump: null,
    trumpSuit: null,
    trumpTaken: false,
    table: [],
    leader: 0,
    turn: 0,
    piles: Array.from({ length: teams }, () => []),
    scores: Array(teams).fill(0),
    tricks: Array(teams).fill(0),
    wonBySeat: Array(size).fill(0),
    lastTrick: null,
    lastWinner: null,
    winner: null,
    sevenTrumpPlayed: false,
    matchPoints: Array(teams).fill(0),
    matchWinner: null,
    awards: [],
    version: 1,
    updatedAt: Date.now(),
    log: [],
  };
}

function pushLog(room: Room, line: string) {
  room.log.unshift(line);
  if (room.log.length > 40) room.log.length = 40;
}

/** A carta virada não pode ser ás nem 7 — se sair, embaralha tudo de novo. */
export function trumpAllowed(card: Card): boolean {
  const rank = rankOf(card);
  return rank !== "A" && rank !== "7";
}

/** Distribui as cartas e começa a partida. O primeiro a jogar é `firstSeat`. */
export function deal(room: Room, firstSeat = 0): void {
  let deck = shuffle(newDeck());
  let redeals = 0;

  // 8 das 40 cartas são ás ou 7, então isso resolve em pouquíssimas tentativas.
  // O limite é só uma trava de segurança pra nunca virar laço infinito.
  while (!trumpAllowed(deck[deck.length - 1]) && redeals < 100) {
    deck = shuffle(newDeck());
    redeals++;
  }

  room.hands = Array.from({ length: room.size }, () => []);
  for (let round = 0; round < 3; round++) {
    for (let seat = 0; seat < room.size; seat++) {
      room.hands[seat].push(deck.shift()!);
    }
  }

  room.trump = deck.pop()!; // carta virada: fica no fundo do monte
  room.trumpSuit = suitOf(room.trump);
  room.trumpTaken = false;
  room.deck = deck;

  room.table = [];
  room.leader = firstSeat;
  room.turn = firstSeat;
  room.piles = room.piles.map(() => []);
  room.scores = room.scores.map(() => 0);
  room.tricks = room.tricks.map(() => 0);
  room.wonBySeat = Array(room.size).fill(0);
  room.lastTrick = null;
  room.lastWinner = null;
  room.winner = null;
  room.sevenTrumpPlayed = false;
  room.awards = [];
  room.phase = "playing";
  room.log = [];
  pushLog(room, `Partida iniciada — trunfo de ${suitName(room.trumpSuit)}.`);
}

function suitName(suit: string): string {
  return (
    { S: "espadas", H: "copas", D: "ouros", C: "paus" }[suit] ?? suit
  );
}

function nameOf(room: Room, seat: number): string {
  return room.players.find((p) => p.seat === seat)?.name ?? `Lugar ${seat + 1}`;
}

/** Tira uma carta do monte; a última a sair é a carta do trunfo. */
function draw(room: Room): Card | null {
  if (room.deck.length > 0) return room.deck.shift()!;
  if (room.trump && !room.trumpTaken) {
    room.trumpTaken = true;
    return room.trump;
  }
  return null;
}

export type PlayResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** A carta que permite trocar pelo trunfo: o 2 do naipe de trunfo. */
export function swapCardFor(room: Room): Card | null {
  return room.trumpSuit ? `2${room.trumpSuit}` : null;
}

/**
 * Quem tiver o 2 de trunfo pode trocá-lo pela carta virada. Vale em qualquer
 * momento da partida (não só na primeira rodada), desde que seja a sua vez, ainda
 * não tenha jogado a carta da vaza e o trunfo ainda não tenha sido comprado.
 */
export function canSwapTrump(room: Room, seat: number): boolean {
  if (room.phase !== "playing") return false;
  if (room.turn !== seat) return false;
  if (!room.trump || room.trumpTaken) return false;
  const swapCard = swapCardFor(room);
  return !!swapCard && room.hands[seat].includes(swapCard);
}

export function swapTrump(room: Room, seat: number): PlayResult {
  if (!canSwapTrump(room, seat)) {
    return {
      ok: false,
      error: "Você não pode trocar o trunfo agora.",
      status: 409,
    };
  }

  const swapCard = swapCardFor(room)!;
  const hand = room.hands[seat];
  hand[hand.indexOf(swapCard)] = room.trump!;

  pushLog(room, `${nameOf(room, seat)} trocou o ${swapCard[0]} pelo trunfo.`);
  room.trump = swapCard;
  room.version++;
  return { ok: true };
}

export const BLOCK_ACE_REASON =
  "Não dá pra puxar com o ás de trunfo antes do 7 de trunfo sair.";

/**
 * Cartas que o jogador não pode jogar agora, com o motivo. Hoje só existe uma
 * proibição: puxar (sair na vaza) com o ás de trunfo antes do 7 de trunfo ter
 * aparecido. Respondendo a outra carta o ás é livre — e se for a única carta
 * na mão também, senão o jogador travava sem ter o que jogar.
 */
export function blockedCards(room: Room, seat: number): Record<string, string> {
  if (room.phase !== "playing" || room.turn !== seat) return {};
  if (room.table.length > 0) return {}; // não está puxando
  if (room.sevenTrumpPlayed || !room.trumpSuit) return {};

  const hand = room.hands[seat];
  if (hand.length <= 1) return {};

  const ace = `A${room.trumpSuit}`;
  return hand.includes(ace) ? { [ace]: BLOCK_ACE_REASON } : {};
}

export function playCard(room: Room, seat: number, card: Card): PlayResult {
  if (room.phase !== "playing") {
    return { ok: false, error: "A partida não está em andamento.", status: 409 };
  }
  if (room.turn !== seat) {
    return { ok: false, error: "Não é a sua vez.", status: 409 };
  }
  const hand = room.hands[seat];
  const index = hand.indexOf(card);
  if (index === -1) {
    return { ok: false, error: "Você não tem essa carta.", status: 400 };
  }

  const blockReason = blockedCards(room, seat)[card];
  if (blockReason) {
    return { ok: false, error: blockReason, status: 409 };
  }

  hand.splice(index, 1);
  room.table.push({ seat, card });
  if (card === `7${room.trumpSuit}`) room.sevenTrumpPlayed = true;

  if (room.table.length < room.size) {
    room.turn = (room.turn + 1) % room.size;
    room.version++;
    return { ok: true };
  }

  resolveTrick(room);
  room.version++;
  return { ok: true };
}

function resolveTrick(room: Room): void {
  const plays: Play[] = room.table;
  const winnerSeat = trickWinner(plays, room.trumpSuit!);
  const winnerTeam = teamOf(winnerSeat, room.size);
  const cards = plays.map((p) => p.card);
  const points = sumPoints(cards);

  room.piles[winnerTeam].push(...cards);
  room.scores[winnerTeam] += points;
  room.tricks[winnerTeam]++;
  room.wonBySeat[winnerSeat] += cards.length;
  room.lastTrick = plays;
  room.lastWinner = winnerSeat;
  room.table = [];

  pushLog(
    room,
    `${nameOf(room, winnerSeat)} levou a vaza${points ? ` (+${points})` : ""}.`
  );

  // Sete volteada e rela só existem em dupla, e valem ponto na hora.
  if (room.size === 4) {
    const lead = plays[0];
    if (rankOf(lead.card) === "7" && winnerSeat === lead.seat) {
      award(room, {
        kind: "sete-volteada",
        team: winnerTeam,
        points: 1,
        text: `${nameOf(room, lead.seat)} volteou o ${lead.card[0]}`,
      });
    }

    const winningPlay = plays.find((p) => p.seat === winnerSeat)!;
    const releou =
      rankOf(winningPlay.card) === "A" &&
      plays.some(
        (p) =>
          rankOf(p.card) === "7" &&
          teamOf(p.seat, room.size) !== winnerTeam
      );
    if (releou) {
      award(room, {
        kind: "rela",
        team: winnerTeam,
        points: 1,
        text: `${nameOf(room, winnerSeat)} deu rela (ás em cima do 7)`,
      });
    }
  }

  // Compra: o vencedor tira primeiro, depois os demais na ordem da mesa.
  if (room.deck.length > 0 || !room.trumpTaken) {
    for (let i = 0; i < room.size; i++) {
      const seat = (winnerSeat + i) % room.size;
      const card = draw(room);
      if (card) room.hands[seat].push(card);
    }
  }

  room.leader = winnerSeat;
  room.turn = winnerSeat;

  if (room.hands.every((hand) => hand.length === 0)) finish(room);
}

/** Credita um ponto de jogo e registra pra mostrar na tela. */
function award(room: Room, entry: Award): void {
  room.matchPoints[entry.team] += entry.points;
  room.awards.push(entry);
  pushLog(room, `${entry.text} — ponto pro time.`);
}

const CAPOTE_LIMIT = 30; // fazer 30 ou menos é levar capote

function finish(room: Room): void {
  room.phase = "done";
  const [a, b] = room.scores;
  room.winner = a === b ? -1 : a > b ? 0 : 1;

  if (room.winner !== -1) {
    const loser = 1 - room.winner;
    const teamLabel = room.size === 4 ? "a dupla" : "";

    award(room, {
      kind: "vitoria",
      team: room.winner,
      points: 1,
      text: `Mão ganha por ${room.scores[room.winner]} a ${room.scores[loser]}`,
    });

    // Capote vale nas duas modalidades.
    if (room.scores[loser] <= CAPOTE_LIMIT) {
      award(room, {
        kind: "capote",
        team: room.winner,
        points: 1,
        text: `Capote! ${teamLabel} adversária ficou em ${room.scores[loser]}`.trim(),
      });
    }
  } else {
    pushLog(room, `Empate em ${a} pontos — ninguém pontua.`);
  }

  const best = Math.max(...room.matchPoints);
  if (best >= MATCH_TARGET) {
    room.matchWinner = room.matchPoints.indexOf(best);
    pushLog(room, `Fim de jogo: ${room.matchPoints.join(" — ")}.`);
  }
}

/**
 * Próxima mão com os mesmos jogadores; quem saiu primeiro passa pro lugar
 * seguinte. Se o jogo já acabou (alguém chegou aos pontos), zera o placar e
 * começa um jogo novo.
 */
export function rematch(room: Room): void {
  if (room.matchWinner !== null) {
    room.matchPoints = room.matchPoints.map(() => 0);
    room.matchWinner = null;
  }
  const first = (room.leader + 1) % room.size;
  deal(room, first);
  room.version++;
}

export function toView(room: Room, playerId: string | null): PlayerView {
  const me = room.players.find((p) => p.id === playerId) ?? null;
  const seat = me?.seat ?? -1;

  return {
    code: room.code,
    size: room.size,
    phase: room.phase,
    you: me
      ? { id: me.id, name: me.name, seat: me.seat, team: teamOf(me.seat, room.size) }
      : null,
    players: room.players
      .slice()
      .sort((x, y) => x.seat - y.seat)
      .map((p) => ({
        name: p.name,
        seat: p.seat,
        team: teamOf(p.seat, room.size),
        connected: true as const,
      })),
    hand: seat >= 0 ? room.hands[seat] ?? [] : [],
    handCounts: room.hands.map((hand) => hand.length),
    deckCount: room.deck.length + (room.trump && !room.trumpTaken ? 1 : 0),
    trump: room.trump,
    trumpSuit: room.trumpSuit,
    trumpTaken: room.trumpTaken,
    table: room.table,
    leader: room.leader,
    turn: room.turn,
    yourTurn: room.phase === "playing" && seat >= 0 && room.turn === seat,
    canSwapTrump: seat >= 0 && canSwapTrump(room, seat),
    blocked: seat >= 0 ? blockedCards(room, seat) : {},
    matchPoints: room.matchPoints,
    matchTarget: MATCH_TARGET,
    matchWinner: room.matchWinner,
    awards: room.awards,
    sevenTrumpPlayed: room.sevenTrumpPlayed,
    scores: room.scores,
    tricks: room.tricks,
    wonBySeat: room.wonBySeat,
    lastTrick: room.lastTrick,
    lastWinner: room.lastWinner,
    winner: room.winner,
    version: room.version,
    log: room.log,
  };
}
