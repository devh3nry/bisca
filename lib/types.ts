import type { Card, Suit } from "./bisca";

export const MATCH_TARGET = 4;

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

  table: Play[]; // vaza atual, na ordem em que foi jogada
  leader: number; // lugar que saiu na vaza atual
  turn: number; // lugar de quem joga agora

  piles: Card[][]; // cartas ganhas, por time
  scores: number[]; // pontos por time
  tricks: number[]; // vazas ganhas por time
  wonBySeat: number[]; // cartas no montinho de cada lugar (quem puxou a vaza)

  lastTrick: Play[] | null;
  lastWinner: number | null;
  winner: number | null; // time vencedor da mão, ou -1 em caso de empate

  // O ás de trunfo não pode puxar enquanto o 7 de trunfo não tiver saído.
  sevenTrumpPlayed: boolean;

  // Placar do jogo, separado dos 120 pontos das cartas.
  matchPoints: number[];
  matchWinner: number | null;
  awards: Award[]; // o que rendeu ponto na mão que acabou de terminar

  version: number;
  updatedAt: number;
  log: string[];
};

export type AwardKind = "vitoria" | "capote" | "sete-volteada" | "rela";

export type Award = {
  kind: AwardKind;
  team: number;
  points: number;
  text: string;
};

/** O que cada jogador enxerga (sem as mãos dos adversários nem o monte). */
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
  /** Cartas da sua mão que não dá pra jogar agora, com o motivo. */
  blocked: Record<string, string>;

  matchPoints: number[];
  matchTarget: number;
  matchWinner: number | null;
  awards: Award[];
  sevenTrumpPlayed: boolean;
  scores: number[];
  tricks: number[];
  wonBySeat: number[];
  lastTrick: Play[] | null;
  lastWinner: number | null;
  winner: number | null;
  version: number;
  log: string[];
};
