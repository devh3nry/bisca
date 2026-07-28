"use client";

import { rankOf, suitOf, type Card as CardCode, type Suit } from "@/lib/bisca";
import { Court } from "./Court";

const GLYPH: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const IS_RED: Record<Suit, boolean> = { S: false, H: true, D: true, C: false };

// Grade de naipes, no sistema de coordenadas do viewBox 0 0 250 350.
// Recuada dos cantos porque o índice de canto é grande, pra dar pra ler de longe.
// As fileiras começam bem abaixo do índice de canto: quando o naipe do índice
// ficava na mesma altura da primeira fileira, um 4 parecia ter 3 pintas em cima.
const COL = { L: 90, C: 125, R: 160 };
const ROW = [100, 126, 151, 175, 199, 224, 250];

type Pip = { x: number; y: number; scale?: number };

const LAYOUTS: Record<string, Pip[]> = {
  A: [{ x: COL.C, y: ROW[3], scale: 2.4 }],
  "2": [
    { x: COL.C, y: ROW[0] },
    { x: COL.C, y: ROW[6] },
  ],
  "3": [
    { x: COL.C, y: ROW[0] },
    { x: COL.C, y: ROW[3] },
    { x: COL.C, y: ROW[6] },
  ],
  "4": [
    { x: COL.L, y: ROW[0] },
    { x: COL.R, y: ROW[0] },
    { x: COL.L, y: ROW[6] },
    { x: COL.R, y: ROW[6] },
  ],
  "5": [
    { x: COL.L, y: ROW[0] },
    { x: COL.R, y: ROW[0] },
    { x: COL.C, y: ROW[3] },
    { x: COL.L, y: ROW[6] },
    { x: COL.R, y: ROW[6] },
  ],
  "6": [
    { x: COL.L, y: ROW[0] },
    { x: COL.R, y: ROW[0] },
    { x: COL.L, y: ROW[3] },
    { x: COL.R, y: ROW[3] },
    { x: COL.L, y: ROW[6] },
    { x: COL.R, y: ROW[6] },
  ],
  "7": [
    { x: COL.L, y: ROW[0] },
    { x: COL.R, y: ROW[0] },
    { x: COL.C, y: 137 },
    { x: COL.L, y: ROW[3] },
    { x: COL.R, y: ROW[3] },
    { x: COL.L, y: ROW[6] },
    { x: COL.R, y: ROW[6] },
  ],
};

function CornerIndex({
  rank,
  glyph,
  flipped,
}: {
  rank: string;
  glyph: string;
  flipped: boolean;
}) {
  return (
    <g
      transform={
        flipped ? "rotate(180 125 175) translate(0 0)" : undefined
      }
    >
      <text
        x={34}
        y={58}
        textAnchor="middle"
        fontSize={56}
        fontWeight={700}
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        {rank}
      </text>
      <text x={34} y={99} textAnchor="middle" fontSize={42}>
        {glyph}
      </text>
    </g>
  );
}

export function PlayingCard({
  code,
  width = 96,
  className = "",
}: {
  code: CardCode;
  width?: number;
  className?: string;
}) {
  const rank = rankOf(code);
  const suit = suitOf(code);
  const glyph = GLYPH[suit];
  const color = IS_RED[suit] ? "#c8102e" : "#1a1a1a";
  const pips = LAYOUTS[rank];

  return (
    <svg
      viewBox="0 0 250 350"
      width={width}
      height={(width * 350) / 250}
      className={`card-svg ${className}`}
      role="img"
      aria-label={`${rank} de ${suit}`}
    >
      <rect
        x={2}
        y={2}
        width={246}
        height={346}
        rx={16}
        fill="#ffffff"
        stroke="#d8d2c4"
        strokeWidth={3}
      />
      <rect
        x={16}
        y={16}
        width={218}
        height={318}
        rx={10}
        fill="#fbf6e4"
        stroke="#e6dfcb"
        strokeWidth={2}
      />
      <g style={{ color }} fill={color}>
        <CornerIndex rank={rank} glyph={glyph} flipped={false} />
        <CornerIndex rank={rank} glyph={glyph} flipped />
        {pips ? (
          pips.map((pip, i) => (
            <text
              key={i}
              x={pip.x}
              y={pip.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={54 * (pip.scale ?? 1)}
              transform={
                pip.y > 175 ? `rotate(180 ${pip.x} ${pip.y})` : undefined
              }
            >
              {glyph}
            </text>
          ))
        ) : (
          <Court rank={rank} glyph={glyph} />
        )}
      </g>
    </svg>
  );
}

export function CardBack({
  width = 96,
  className = "",
}: {
  width?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 250 350"
      width={width}
      height={(width * 350) / 250}
      className={`card-svg ${className}`}
      role="img"
      aria-label="Carta virada"
    >
      <defs>
        <pattern
          id="card-back-weave"
          width={18}
          height={18}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={18} height={18} fill="#8c1c2b" />
          <path d="M0 9 H18 M9 0 V18" stroke="#b03144" strokeWidth={3} />
        </pattern>
      </defs>
      <rect
        x={2}
        y={2}
        width={246}
        height={346}
        rx={16}
        fill="#ffffff"
        stroke="#d8d2c4"
        strokeWidth={3}
      />
      <rect
        x={16}
        y={16}
        width={218}
        height={318}
        rx={10}
        fill="url(#card-back-weave)"
      />
      <rect
        x={16}
        y={16}
        width={218}
        height={318}
        rx={10}
        fill="none"
        stroke="#fdf8e6"
        strokeWidth={4}
      />
    </svg>
  );
}
