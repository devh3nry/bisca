import { PlayingCard, CardBack } from "@/components/Card";
import { RANKS, SUITS } from "@/lib/bisca";

/** Página de referência: o baralho todo, para conferir o desenho das cartas. */
export default function DeckPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ color: "var(--gold)", fontFamily: "Georgia, serif" }}>
        Baralho da Bisca — 40 cartas
      </h1>
      {SUITS.map((suit) => (
        <div key={suit} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {RANKS.map((rank) => (
            <PlayingCard key={rank + suit} code={rank + suit} width={86} />
          ))}
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <CardBack width={86} />
      </div>
    </main>
  );
}
