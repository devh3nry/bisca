"use client";

/**
 * Figuras de J / Q / K no estilo do baralho inglês clássico: meia-figura
 * espelhada na diagonal, quatro cores (vermelho, amarelo, azul e preto) e o
 * contorno fino característico. Não é decalque de nenhum baralho específico —
 * é o mesmo vocabulário visual, desenhado do zero em SVG.
 *
 * Todo o desenho ocupa o painel interno x 58..192, y 56..294. A metade de cima
 * é desenhada uma vez e repetida girada 180° em torno do centro (125, 175).
 */

const RED = "#e01b24";
const YELLOW = "#f6c700";
const BLUE = "#1c4fa1";
const INK = "#101010";
const SKIN = "#ffffff";

type CourtRank = "J" | "Q" | "K";

/** Coroa do rei: aros, arcos e pedras. */
function KingCrown() {
  return (
    <g>
      <path
        d="M88 96 L88 74 L100 84 L112 66 L125 80 L138 66 L150 84 L162 74 L162 96 Z"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={112} cy={62} r={4.5} fill={RED} stroke={INK} strokeWidth={1.6} />
      <circle cx={138} cy={62} r={4.5} fill={RED} stroke={INK} strokeWidth={1.6} />
      <circle cx={125} cy={74} r={4} fill={BLUE} stroke={INK} strokeWidth={1.6} />
      <rect
        x={86}
        y={96}
        width={78}
        height={11}
        rx={2}
        fill={RED}
        stroke={INK}
        strokeWidth={2}
      />
      <circle cx={100} cy={101} r={2.6} fill={YELLOW} />
      <circle cx={125} cy={101} r={2.6} fill={YELLOW} />
      <circle cx={150} cy={101} r={2.6} fill={YELLOW} />
    </g>
  );
}

/** Coroa da dama: mais leve, com florão no meio. */
function QueenCrown() {
  return (
    <g>
      <path
        d="M92 96 L92 78 L104 88 L114 70 L125 84 L136 70 L146 88 L158 78 L158 96 Z"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={114} cy={66} r={4} fill={RED} stroke={INK} strokeWidth={1.5} />
      <circle cx={136} cy={66} r={4} fill={RED} stroke={INK} strokeWidth={1.5} />
      <rect
        x={90}
        y={96}
        width={70}
        height={10}
        rx={2}
        fill={BLUE}
        stroke={INK}
        strokeWidth={2}
      />
      <circle cx={125} cy={101} r={2.6} fill={YELLOW} />
    </g>
  );
}

/** Chapéu do valete: barrete com pluma, sem coroa. */
function JackHat() {
  return (
    <g>
      <path
        d="M92 98 Q94 70 125 66 Q156 70 158 98 Z"
        fill={RED}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M148 76 Q168 62 176 72 Q166 74 158 86"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <rect
        x={90}
        y={96}
        width={70}
        height={10}
        rx={2}
        fill={YELLOW}
        stroke={INK}
        strokeWidth={2}
      />
      <circle cx={108} cy={101} r={2.4} fill={BLUE} />
      <circle cx={125} cy={101} r={2.4} fill={BLUE} />
      <circle cx={142} cy={101} r={2.4} fill={BLUE} />
    </g>
  );
}

/** Rosto de perfil (rei e valete olham de lado, como no baralho de verdade). */
function ProfileFace({ beard }: { beard: boolean }) {
  return (
    <g>
      <path
        d="M104 106 Q100 128 106 142 Q114 152 128 150 L140 148 L140 108 Z"
        fill={SKIN}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* cabelo caindo ao lado */}
      <path
        d="M140 108 Q152 120 150 140 Q146 152 138 152"
        fill="none"
        stroke={INK}
        strokeWidth={2}
      />
      <path d="M143 112 Q150 126 148 142" fill="none" stroke={BLUE} strokeWidth={1.4} />
      {/* olho e sobrancelha */}
      <circle cx={117} cy={120} r={2.8} fill={INK} />
      <path d="M112 113 Q117 110 122 113" fill="none" stroke={INK} strokeWidth={1.8} />
      {/* nariz e boca */}
      <path d="M105 124 L101 132 L106 133" fill="none" stroke={INK} strokeWidth={1.8} />
      <path d="M104 139 L114 138" fill="none" stroke={INK} strokeWidth={1.8} />
      {beard && (
        <path
          d="M104 141 Q108 158 124 156 Q134 154 136 148"
          fill={SKIN}
          stroke={INK}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/** Rosto de frente — a dama encara quem olha a carta. */
function FrontFace() {
  return (
    <g>
      <path
        d="M108 106 Q106 132 116 146 Q125 153 134 146 Q144 132 142 106 Z"
        fill={SKIN}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={117} cy={122} r={2.6} fill={INK} />
      <circle cx={133} cy={122} r={2.6} fill={INK} />
      <path d="M112 115 Q117 112 122 115" fill="none" stroke={INK} strokeWidth={1.7} />
      <path d="M128 115 Q133 112 138 115" fill="none" stroke={INK} strokeWidth={1.7} />
      <path d="M125 124 L125 132 L129 133" fill="none" stroke={INK} strokeWidth={1.7} />
      <path d="M119 140 Q125 143 131 140" fill="none" stroke={INK} strokeWidth={1.8} />
      {/* cabelo dos dois lados */}
      <path
        d="M108 108 Q98 124 102 148"
        fill="none"
        stroke={INK}
        strokeWidth={2}
      />
      <path
        d="M142 108 Q152 124 148 148"
        fill="none"
        stroke={INK}
        strokeWidth={2}
      />
    </g>
  );
}

/** Gola, manto e ombros — a parte que dá o volume da figura. */
function Robe({ collar, robe }: { collar: string; robe: string }) {
  return (
    <g>
      {/* ombros */}
      <path
        d="M76 176 L76 158 Q92 146 106 146 L144 146 Q158 146 174 158 L174 176 Z"
        fill={robe}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* gola */}
      <path
        d="M104 146 Q125 168 146 146 L146 154 Q125 176 104 154 Z"
        fill={collar}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* faixa central com losangos */}
      <path
        d="M112 158 L125 148 L138 158 L138 176 L112 176 Z"
        fill={YELLOW}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M125 156 L131 164 L125 172 L119 164 Z" fill={INK} />
      {/* debruns dos ombros */}
      <path d="M84 176 L84 160" stroke={INK} strokeWidth={1.6} />
      <path d="M166 176 L166 160" stroke={INK} strokeWidth={1.6} />
      <path d="M76 166 L104 166" stroke={INK} strokeWidth={1.4} />
      <path d="M146 166 L174 166" stroke={INK} strokeWidth={1.4} />
    </g>
  );
}

/** Objeto na mão: espada pro rei, flor pra dama, alabarda pro valete. */
function Prop({ rank }: { rank: CourtRank }) {
  if (rank === "K") {
    return (
      <g>
        <rect x={70} y={112} width={6} height={62} fill={SKIN} stroke={INK} strokeWidth={1.8} />
        <rect x={62} y={106} width={22} height={7} rx={2} fill={YELLOW} stroke={INK} strokeWidth={1.8} />
        <rect x={69} y={96} width={8} height={12} rx={2} fill={RED} stroke={INK} strokeWidth={1.8} />
      </g>
    );
  }
  if (rank === "Q") {
    return (
      <g>
        <path d="M74 174 Q76 148 80 128" fill="none" stroke={INK} strokeWidth={2} />
        <circle cx={80} cy={120} r={9} fill={YELLOW} stroke={INK} strokeWidth={2} />
        <circle cx={80} cy={120} r={3.4} fill={RED} />
        <path d="M71 130 Q78 134 84 130" fill={BLUE} stroke={INK} strokeWidth={1.6} />
      </g>
    );
  }
  return (
    <g>
      <rect x={72} y={100} width={5} height={74} fill={YELLOW} stroke={INK} strokeWidth={1.8} />
      <path
        d="M74.5 100 L66 88 L74.5 78 L83 88 Z"
        fill={BLUE}
        stroke={INK}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </g>
  );
}

function CourtHalf({ rank }: { rank: CourtRank }) {
  return (
    <g>
      <Prop rank={rank} />
      {rank === "K" && <KingCrown />}
      {rank === "Q" && <QueenCrown />}
      {rank === "J" && <JackHat />}
      {rank === "Q" ? <FrontFace /> : <ProfileFace beard={rank === "K"} />}
      <Robe
        collar={rank === "Q" ? RED : BLUE}
        robe={rank === "J" ? BLUE : RED}
      />
    </g>
  );
}

export function Court({ rank, glyph }: { rank: string; glyph: string }) {
  const courtRank = (["J", "Q", "K"].includes(rank) ? rank : "K") as CourtRank;

  return (
    <g>
      {/* moldura do painel */}
      <rect
        x={58}
        y={56}
        width={134}
        height={238}
        rx={4}
        fill="none"
        stroke={INK}
        strokeWidth={2.5}
      />

      {/* a metade de baixo é a de cima girada 180°, como na carta de verdade */}
      <CourtHalf rank={courtRank} />
      <g transform="rotate(180 125 175)">
        <CourtHalf rank={courtRank} />
      </g>

      {/* linha divisória e naipes nos cantos do painel */}
      <path d="M58 175 L192 175" stroke={INK} strokeWidth={2.5} />
      <text x={70} y={72} textAnchor="middle" fontSize={20} fill="currentColor">
        {glyph}
      </text>
      <text
        x={180}
        y={286}
        textAnchor="middle"
        fontSize={20}
        fill="currentColor"
        transform="rotate(180 180 280)"
      >
        {glyph}
      </text>
    </g>
  );
}
