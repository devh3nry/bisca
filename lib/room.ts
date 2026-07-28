import {
  newDeck,
  shuffle,
  sumPoints,
  suitOf,
  teamOf,
  trickWinner,
  type Card,
} from "./bisca";
import type { Play, PlayerView, Room } from "./types";

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
  const teams = 2; // 1v1 ou 2v2 — são sempre duas equipas
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
    lastTrick: null,
    lastWinner: null,
    winner: null,
    version: 1,
    updatedAt: Date.now(),
    log: [],
  };
}

function pushLog(room: Room, line: string) {
  room.log.unshift(line);
  if (room.log.length > 40) room.log.length = 40;
}

/** Reparte o baralho e arranca a partida. O primeiro a jogar é `firstSeat`. */
export function deal(room: Room, firstSeat = 0): void {
  const deck = shuffle(newDeck());

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
  room.lastTrick = null;
  room.lastWinner = null;
  room.winner = null;
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

export function playCard(room: Room, seat: number, card: Card): PlayResult {
  if (room.phase !== "playing") {
    return { ok: false, error: "A partida não está a decorrer.", status: 409 };
  }
  if (room.turn !== seat) {
    return { ok: false, error: "Não é a tua vez.", status: 409 };
  }
  const hand = room.hands[seat];
  const index = hand.indexOf(card);
  if (index === -1) {
    return { ok: false, error: "Não tens essa carta.", status: 400 };
  }

  hand.splice(index, 1);
  room.table.push({ seat, card });

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
  room.lastTrick = plays;
  room.lastWinner = winnerSeat;
  room.table = [];

  pushLog(
    room,
    `${nameOf(room, winnerSeat)} levou a vaza${points ? ` (+${points})` : ""}.`
  );

  // Compra: o vencedor tira primeiro, depois os restantes pela ordem da mesa.
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

function finish(room: Room): void {
  room.phase = "done";
  const [a, b] = room.scores;
  room.winner = a === b ? -1 : a > b ? 0 : 1;
  pushLog(
    room,
    room.winner === -1
      ? `Empate a ${a} pontos.`
      : `Fim de partida: ${a} — ${b}.`
  );
}

/** Recomeça mantendo os jogadores. Quem saiu primeiro passa ao lugar seguinte. */
export function rematch(room: Room): void {
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
    scores: room.scores,
    tricks: room.tricks,
    lastTrick: room.lastTrick,
    lastWinner: room.lastWinner,
    winner: room.winner,
    version: room.version,
    log: room.log,
  };
}
