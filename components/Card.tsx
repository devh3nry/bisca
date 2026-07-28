"use client";

import { rankOf, suitOf, type Card as CardCode, type Suit } from "@/lib/bisca";

const GLYPH: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const IS_RED: Record<Suit, boolean> = { S: false, H: true, D: true, C: false };

// Grade de naipes, no sistema de coordenadas do viewBox 0 0 250 350.
const COL = { L: 76, C: 125, R: 174 };
const ROW = [78, 111, 143, 175, 207, 239, 272];

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
    { x: COL.C, y: 127 },
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
        x={26}
        y={48}
        textAnchor="middle"
        fontSize={40}
        fontWeight={700}
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        {rank}
      </text>
      <text x={26} y={84} textAnchor="middle" fontSize={32}>
        {glyph}
      </text>
    </g>
  );
}

/** Figura estilizada e simétrica (como nas cartas de verdade) pra J / Q / K. */
function Court({ rank, glyph }: { rank: string; glyph: string }) {
  return (
    <g>
      <rect
        x={58}
        y={56}
        width={134}
        height={238}
        rx={5}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
      <rect
        x={64}
        y={62}
        width={122}
        height={226}
        rx={3}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.55}
      />

      {[false, true].map((flipped) => (
        <g
          key={String(flipped)}
          transform={flipped ? "rotate(180 125 175)" : undefined}
        >
          {/* coroa */}
          <path
            d="M92 106 L92 84 L106 95 L125 70 L144 95 L158 84 L158 106 Z"
            fill="currentColor"
          />
          <circle cx={92} cy={80} r={5} fill="currentColor" />
          <circle cx={125} cy={64} r={6} fill="currentColor" />
          <circle cx={158} cy={80} r={5} fill="currentColor" />
          <rect
            x={90}
            y={110}
            width={70}
            height={7}
            rx={3}
            fill="currentColor"
          />

          {/* inicial */}
          <text
            x={125}
            y={148}
            textAnchor="middle"
            fontSize={44}
            fontWeight={700}
            fontFamily="Georgia, 'Times New Roman', serif"
          >
            {rank}
          </text>

          <text x={125} y={172} textAnchor="middle" fontSize={22}>
            {glyph}
          </text>

          {/* faixa central */}
          <rect x={64} y={172} width={122} height={3} fill="currentColor" />
        </g>
      ))}
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
