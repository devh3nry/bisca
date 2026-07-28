import type { Card, Suit } from "./bisca";

export type Phase = "lobby" | "playing" | "done";

export type Player = {
  id: string;
  name: string;
  seat: number;
};

export type Play = { seat: number; card: Card };

export type Room = {
  code: string;
  size: 2 | 4;
  phase: Phase;
  players: Player[];
  hostId: string;

  deck: Card[];
  hands: Card[][]; // por lugar
  trump: Card | null; // carta virada (fica por baixo do monte)
  trumpSuit: Suit | null;
  trumpTaken: boolean;

  table: Play[]; // vaza em curso, na ordem em que foi jogada
  leader: number; // lugar que saiu na vaza atual
  turn: number; // lugar de quem joga agora

  piles: Card[][]; // cartas ganhas, por equipa
  scores: number[]; // pontos por equipa
  tricks: number[]; // vazas ganhas por equipa

  lastTrick: Play[] | null;
  lastWinner: number | null;
  winner: number | null; // equipa vencedora, ou -1 em caso de empate

  version: number;
  updatedAt: number;
  log: string[];
};

/** O que cada jogador vê (sem as mãos dos adversários nem o monte). */
export type PlayerView = {
  code: string;
  size: 2 | 4;
  phase: Phase;
  you: { id: string; name: string; seat: number; team: number } | null;
  players: { name: string; seat: number; team: number; connected: true }[];
  hand: Card[];
  handCounts: number[];
  deckCount: number;
  trump: Card | null;
  trumpSuit: Suit | null;
  trumpTaken: boolean;
  table: Play[];
  leader: number;
  turn: number;
  yourTurn: boolean;
  canSwapTrump: boolean;
  scores: number[];
  tricks: number[];
  lastTrick: Play[] | null;
  lastWinner: number | null;
  winner: number | null;
  version: number;
  log: string[];
};
