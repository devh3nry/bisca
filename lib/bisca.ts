// Motor da Bisca de 3 (variante portuguesa clássica, baralho de 40).
// Carta = "RS" onde R = rank (A,2,3,4,5,6,7,J,Q,K) e S = naipe (S,H,D,C).

export type Suit = "S" | "H" | "D" | "C";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "J" | "Q" | "K";
export type Card = string;

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "J", "Q", "K"];

/** Pontos de cada carta. Total do baralho = 120. */
export const POINTS: Record<Rank, number> = {
  A: 11,
  "7": 10,
  K: 4,
  Q: 3,
  J: 2,
  "6": 0,
  "5": 0,
  "4": 0,
  "3": 0,
  "2": 0,
};

/** Força relativa dentro do mesmo naipe: Ás > 7 > Rei > Dama > Valete > 6..2. */
const STRENGTH: Record<Rank, number> = {
  A: 10,
  "7": 9,
  K: 8,
  Q: 7,
  J: 6,
  "6": 5,
  "5": 4,
  "4": 3,
  "3": 2,
  "2": 1,
};

export function rankOf(card: Card): Rank {
  return card.slice(0, -1) as Rank;
}

export function suitOf(card: Card): Suit {
  return card.slice(-1) as Suit;
}

export function pointsOf(card: Card): number {
  return POINTS[rankOf(card)];
}

export function sumPoints(cards: Card[]): number {
  return cards.reduce((total, card) => total + pointsOf(card), 0);
}

export function newDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push(rank + suit);
  }
  return deck;
}

/** Fisher-Yates. Devolve um novo array. */
export function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Decide quem venceu a vaza. `plays` está na ordem em que as cartas foram
 * jogadas, começando pelo jogador que saiu.
 */
export function trickWinner(
  plays: { seat: number; card: Card }[],
  trumpSuit: Suit
): number {
  const ledSuit = suitOf(plays[0].card);
  let best = plays[0];

  for (const play of plays.slice(1)) {
    const bestSuit = suitOf(best.card);
    const playSuit = suitOf(play.card);

    if (playSuit === bestSuit) {
      if (STRENGTH[rankOf(play.card)] > STRENGTH[rankOf(best.card)]) best = play;
    } else if (playSuit === trumpSuit) {
      // Trunfo corta qualquer naipe que não seja trunfo.
      best = play;
    } else if (bestSuit !== trumpSuit && playSuit === ledSuit) {
      // Só pode acontecer se `best` já não fosse do naipe de saída.
      best = play;
    }
  }

  return best.seat;
}

/** Equipa de um lugar: em 4 jogadores, 0+2 contra 1+3. Em 2, cada um é a sua. */
export function teamOf(seat: number, size: number): number {
  return size === 4 ? seat % 2 : seat;
}
