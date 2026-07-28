"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CardBack, PlayingCard } from "@/components/Card";
import { Rules } from "@/components/Rules";
import { pointsOf } from "@/lib/bisca";
import type { PlayerView } from "@/lib/types";
import { loadName, loadPlayerId, saveName, savePlayerId } from "@/lib/session";

// Cada sondagem é um comando no Redis e o plano free do Upstash dá 500K/mês.
// Por isso: ritmo rápido só quando há mesmo uma jogada para aparecer, mais
// lento esperando gente ou no fim, e parado com a aba em segundo plano.
const POLL_ACTIVE_MS = 900;
const POLL_IDLE_MS = 3000;

function pollDelay(state: PlayerView | null): number {
  if (!state) return POLL_ACTIVE_MS;
  if (state.phase !== "playing") return POLL_IDLE_MS;
  // Na nossa vez não tem nada pra chegar do servidor até jogarmos.
  return state.yourTurn ? POLL_IDLE_MS : POLL_ACTIVE_MS;
}

const SUIT_NAMES: Record<string, string> = {
  S: "Espadas",
  H: "Copas",
  D: "Ouros",
  C: "Paus",
};

const SUIT_GLYPHS: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

const RED_SUITS = new Set(["H", "D"]);

// Quanto tempo a vaza fica parada na mesa antes de voar pro montinho.
const HOLD_MS = 1100;
const FLY_MS = 650;

type Collect = {
  key: string;
  plays: PlayerView["table"];
  winner: number;
  points: number;
  flying: boolean;
};

const AWARD_ICONS: Record<string, string> = {
  vitoria: "🏆",
  capote: "🧨",
  "sete-volteada": "🔁",
  rela: "⚡",
};

export default function RoomClient({ code }: { code: string }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<PlayerView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [collect, setCollect] = useState<Collect | null>(null);
  const idRef = useRef<string | null>(null);
  const stateRef = useRef<PlayerView | null>(null);
  stateRef.current = state;

  /*
   * Quando uma vaza fecha, o servidor já limpa a mesa. Sem nada no meio, as
   * cartas sumiam num piscar e ninguém sabia se a rodada tinha acabado. Então
   * seguramos a vaza na mesa por um tempo, mostrando quem levou, e depois
   * mandamos as cartas voando pro montinho do vencedor.
   */
  const trickKey =
    state?.lastTrick && state.lastWinner !== null
      ? `${state.lastWinner}:${state.lastTrick.map((p) => p.card).join(",")}`
      : null;

  useEffect(() => {
    if (!trickKey || !state?.lastTrick || state.lastWinner === null) return;
    if (collect?.key === trickKey) return;

    const plays = state.lastTrick;
    setCollect({
      key: trickKey,
      plays,
      winner: state.lastWinner,
      points: plays.reduce((total, p) => total + pointsOf(p.card), 0),
      flying: false,
    });

    const toFly = setTimeout(
      () => setCollect((c) => (c && c.key === trickKey ? { ...c, flying: true } : c)),
      HOLD_MS
    );
    const toClear = setTimeout(
      () => setCollect((c) => (c && c.key === trickKey ? null : c)),
      HOLD_MS + FLY_MS
    );

    return () => {
      clearTimeout(toFly);
      clearTimeout(toClear);
    };
    // `collect` de propósito fora das dependências: ele é o alvo do efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trickKey]);

  // Ninguém entra sem nome: sem isso a mesa vira "Jogador" contra "Jogador".
  useEffect(() => {
    const saved = loadName().trim();
    if (saved) setName(saved);
    setDraftName(saved);
  }, []);

  useEffect(() => {
    if (!name) return;
    let cancelled = false;

    (async () => {
      const known = loadPlayerId(code);
      try {
        const response = await fetch(`/api/rooms/${code}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, playerId: known }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Não deu pra entrar na mesa.");
          return;
        }
        savePlayerId(code, data.playerId);
        idRef.current = data.playerId;
        setPlayerId(data.playerId);
        setState(data.state);
      } catch {
        if (!cancelled) setError("Sem conexão com o servidor.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, name]);

  const refresh = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;
    try {
      const response = await fetch(
        `/api/rooms/${code}?playerId=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return;
      const data: PlayerView = await response.json();
      setState((current) =>
        current && current.version > data.version ? current : data
      );
    } catch {
      /* falha de rede pontual: a próxima sondagem pega */
    }
  }, [code]);

  // Ritmo adaptativo, e nada de sondar com a aba em segundo plano — uma aba
  // esquecida aberta gastava a cota do Redis a noite toda.
  useEffect(() => {
    if (!playerId) return;

    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      if (!document.hidden) await refresh();
      if (stopped) return;
      timer = setTimeout(tick, pollDelay(stateRef.current));
    };

    timer = setTimeout(tick, pollDelay(stateRef.current));

    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [playerId, refresh]);

  async function post(path: string, body: Record<string, unknown>) {
    setSending(true);
    setNotice("");
    try {
      const response = await fetch(`/api/rooms/${code}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, ...body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error ?? "Não rolou.");
        if (data.state) setState(data.state);
      } else {
        setState(data);
      }
    } catch {
      setNotice("Sem conexão — tente de novo.");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => setNotice("Copie o endereço da barra do navegador."));
  }

  // ---------- portão do nome ----------

  if (!name) {
    return (
      <main className="home">
        <div className="home-inner">
          <div className="brand">
            <h1>BISCA</h1>
            <p>
              Você foi convidado pra mesa <b className="code-inline">{code}</b>
            </p>
          </div>
          <div className="panel">
            <h2>Como você quer aparecer na mesa?</h2>
            <input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && draftName.trim()) {
                  saveName(draftName.trim());
                  setName(draftName.trim());
                }
              }}
              placeholder="Seu nome ou apelido"
              maxLength={16}
            />
            <button
              className="btn"
              disabled={!draftName.trim()}
              onClick={() => {
                saveName(draftName.trim());
                setName(draftName.trim());
              }}
            >
              Entrar na mesa
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="home">
        <div className="home-inner panel" style={{ textAlign: "center" }}>
          <h2>Mesa {code}</h2>
          <p className="error">{error}</p>
          <Link href="/">
            <button className="btn">Voltar pro início</button>
          </Link>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="home">
        <p style={{ opacity: 0.7 }}>Entrando na mesa {code}…</p>
      </main>
    );
  }

  const myTeam = state.you?.team ?? 0;
  const theirTeam = 1 - myTeam;
  const mySeat = state.you?.seat ?? 0;
  const size = state.size;
  const seatAt = (offset: number) => (mySeat + offset) % size;
  const opponents =
    size === 2
      ? { top: seatAt(1), left: null, right: null }
      : { top: seatAt(2), left: seatAt(1), right: seatAt(3) };

  const waiting = state.phase === "lobby";
  // A mesa ao vivo tem prioridade: se alguém já jogou a próxima carta, corta a
  // animação em vez de segurar uma vaza velha na tela.
  const collecting = state.table.length === 0 ? collect : null;
  const trick = state.table.length > 0 ? state.table : collecting?.plays ?? [];

  /** Pra onde as cartas voam: a direção do lugar do vencedor na tela. */
  function flyClass(winnerSeat: number): string {
    if (winnerSeat === mySeat) return "fly-down";
    if (size === 2) return "fly-up";
    if (winnerSeat === seatAt(1)) return "fly-left";
    if (winnerSeat === seatAt(3)) return "fly-right";
    return "fly-up";
  }
  const usLabel = size === 4 ? "Nossa dupla" : "Você";
  const themLabel = size === 4 ? "Eles" : "Adversário";

  return (
    <main className="table">
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/" className="icon-btn" title="Sair da mesa">
            ←
          </Link>
          <Rules compact />
          <button
            className="code-chip"
            onClick={copyLink}
            title="Copiar o link da mesa"
          >
            <small>MESA</small>
            {copied ? "COPIADO!" : code}
          </button>
        </div>

        {state.trumpSuit && (
          <div
            className={`trump-badge ${
              RED_SUITS.has(state.trumpSuit) ? "red" : "black"
            }`}
          >
            <span className="trump-badge-glyph">
              {SUIT_GLYPHS[state.trumpSuit]}
            </span>
            <span className="trump-badge-text">
              <small>TRUNFO</small>
              {SUIT_NAMES[state.trumpSuit]}
            </span>
          </div>
        )}

        <div className="match">
          <MatchSide
            label={usLabel}
            points={state.matchPoints[myTeam]}
            target={state.matchTarget}
            mine
          />
          <span className="match-x">×</span>
          <MatchSide
            label={themLabel}
            points={state.matchPoints[theirTeam]}
            target={state.matchTarget}
          />
        </div>
      </header>

      {!waiting && (
        <HandScore
          us={state.scores[myTeam]}
          them={state.scores[theirTeam]}
          usLabel={usLabel}
          themLabel={themLabel}
        />
      )}

      <div className={`arena ${size === 2 ? "duelo" : ""}`}>
        <div className="seat-top">
          <Seat state={state} seat={opponents.top} />
        </div>
        {opponents.left !== null && (
          <div className="seat-left">
            <Seat state={state} seat={opponents.left} vertical />
          </div>
        )}
        {opponents.right !== null && (
          <div className="seat-right">
            <Seat state={state} seat={opponents.right} vertical />
          </div>
        )}

        <div className="center">
          <div className="trick-area">
            {collecting && (
              <div className="trick-banner">
                {nameOf(state, collecting.winner)} levou
                {collecting.points > 0 && <b>+{collecting.points}</b>}
              </div>
            )}
            <div
              className={`trick ${collecting ? "collected" : ""} ${
                collecting?.flying ? `flying ${flyClass(collecting.winner)}` : ""
              }`}
            >
              {trick.map((play) => (
                <div
                  key={play.card}
                  className={`played ${
                    collecting && play.seat === collecting.winner ? "winner" : ""
                  }`}
                >
                  <PlayingCard code={play.card} width={92} />
                  <span>{nameOf(state, play.seat)}</span>
                </div>
              ))}
              {trick.length === 0 && (
                <span className="table-empty">
                  {waiting ? "Esperando jogadores…" : "Ninguém jogou ainda"}
                </span>
              )}
            </div>
          </div>

          {state.trump && (
            <div className="stock">
              {state.deckCount > 1 && <CardBack width={62} />}
              {!state.trumpTaken && (
                <div className="trump-card">
                  <PlayingCard code={state.trump} width={62} />
                </div>
              )}
              <span className="stock-count">
                {state.deckCount} no monte
              </span>
              {state.canSwapTrump && (
                <button
                  className="swap"
                  onClick={() => post("swap", {})}
                  disabled={sending}
                  title="Trocar o seu 2 de trunfo pela carta virada"
                >
                  ⇄ Trocar o 2 pelo trunfo
                </button>
              )}
            </div>
          )}
        </div>

        <div className="hand-area">
          <p className={`hint ${state.yourTurn ? "" : "muted"}`}>
            {notice ||
              (waiting
                ? `Falta ${size - state.players.length} jogador(es) — mande o link ou o código ${code}`
                : state.phase === "done"
                  ? "Mão terminada"
                  : state.yourTurn
                    ? "É a sua vez — escolha uma carta"
                    : `Vez de ${nameOf(state, state.turn)}`)}
          </p>
          <div className="hand-row">
            <div className="my-pile">
              <Pile count={state.wonBySeat[mySeat] ?? 0} label="seu montinho" />
              <span className="my-pile-label">seu montinho</span>
            </div>
            <div className="hand">
              {state.hand.map((card) => {
              const blocked = state.blocked[card];
              return (
                <button
                  key={card}
                  className={blocked ? "blocked" : ""}
                  onClick={() =>
                    blocked ? setNotice(blocked) : post("play", { card })
                  }
                  disabled={!state.yourTurn || sending}
                  title={blocked ?? undefined}
                  aria-label={`Jogar ${card}`}
                >
                  <PlayingCard code={card} width={104} />
                  {blocked && <span className="lock">🔒</span>}
                </button>
              );
            })}
              {state.hand.length === 0 && waiting && (
                <>
                  <CardBack width={104} />
                  <CardBack width={104} />
                  <CardBack width={104} />
                </>
              )}
            </div>
            {/* espelho do montinho, só pra manter a mão centralizada */}
            <div className="my-pile ghost" aria-hidden />
          </div>
          <p className="log">{state.log[0] ?? ""}</p>
        </div>
      </div>

      {state.phase === "done" && (
        <div className="overlay">
          <div className="panel result">
            <h2>
              {state.matchWinner !== null
                ? state.matchWinner === myTeam
                  ? "🏆 Vocês ganharam o jogo!"
                  : "Fim de jogo — eles levaram"
                : state.winner === -1
                  ? "Mão empatada"
                  : state.winner === myTeam
                    ? "Mão ganha!"
                    : "Mão perdida"}
            </h2>

            <p className="big-score">
              {state.scores[myTeam]} <small>×</small> {state.scores[theirTeam]}
            </p>
            <p className="muted-note">pontos das cartas nesta mão</p>

            {state.awards.length > 0 && (
              <ul className="awards">
                {state.awards.map((a, i) => (
                  <li key={i} className={a.team === myTeam ? "ours" : "theirs"}>
                    <span>{AWARD_ICONS[a.kind] ?? "•"}</span>
                    {a.text}
                    <b>+{a.points}</b>
                  </li>
                ))}
              </ul>
            )}

            <div className="match-final">
              <span>
                {usLabel} <b>{state.matchPoints[myTeam]}</b>
              </span>
              <span className="muted-note">jogo até {state.matchTarget}</span>
              <span>
                {themLabel} <b>{state.matchPoints[theirTeam]}</b>
              </span>
            </div>

            <button
              className="btn"
              onClick={() => post("rematch", {})}
              disabled={sending}
            >
              {state.matchWinner !== null ? "Jogar de novo" : "Próxima mão"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function MatchSide({
  label,
  points,
  target,
  mine = false,
}: {
  label: string;
  points: number;
  target: number;
  mine?: boolean;
}) {
  return (
    <div className={`match-side ${mine ? "mine" : ""}`}>
      <span className="match-label">{label}</span>
      <span className="match-pips" aria-label={`${points} de ${target} pontos`}>
        {Array.from({ length: target }).map((_, i) => (
          <i key={i} className={i < points ? "on" : ""} />
        ))}
      </span>
    </div>
  );
}

/** Barra dos 120 pontos das cartas, com a marca dos 61 que decide a mão. */
function HandScore({
  us,
  them,
  usLabel,
  themLabel,
}: {
  us: number;
  them: number;
  usLabel: string;
  themLabel: string;
}) {
  const decided = Math.max(us, them) >= 61;
  return (
    <div className="handscore">
      <span className="handscore-side">
        {usLabel} <b>{us}</b>
      </span>
      <div className="handscore-bar" title="120 pontos no baralho, ganha com 61">
        <div className="fill us" style={{ width: `${(us / 120) * 100}%` }} />
        <div className="fill them" style={{ width: `${(them / 120) * 100}%` }} />
        <div className={`mark ${decided ? "hit" : ""}`}>
          <span>61</span>
        </div>
      </div>
      <span className="handscore-side right">
        <b>{them}</b> {themLabel}
      </span>
    </div>
  );
}

function nameOf(state: PlayerView, seat: number): string {
  return (
    state.players.find((p) => p.seat === seat)?.name ?? `Lugar ${seat + 1}`
  );
}

/**
 * Montinho das cartas que a pessoa levou. Empilha até 5 cartas viradas com um
 * leve desalinho (como um monte de verdade na mesa) e mostra a contagem.
 */
export function Pile({
  count,
  label = "montinho",
}: {
  count: number;
  label?: string;
}) {
  // Vazio fica invisível mas ocupando lugar, senão a mesa pula quando a
  // primeira vaza é guardada.
  if (count === 0) return <div className="pile empty" aria-hidden />;

  const visible = Math.min(count, 5);
  return (
    <div className="pile" title={`${count} cartas no montinho`}>
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          className="pile-card"
          style={{
            transform: `translate(${i * 2 - 2}px, ${-i * 2}px) rotate(${
              (i % 2 ? 1 : -1) * (1 + i * 0.7)
            }deg)`,
          }}
        >
          <CardBack width={44} />
        </div>
      ))}
      <span className="pile-count" aria-label={`${count} cartas no ${label}`}>
        {count}
      </span>
    </div>
  );
}

function Seat({
  state,
  seat,
  vertical = false,
}: {
  state: PlayerView;
  seat: number;
  vertical?: boolean;
}) {
  const player = state.players.find((p) => p.seat === seat);
  const count = state.handCounts[seat] ?? 0;
  const isPartner = state.size === 4 && player?.team === state.you?.team;

  return (
    <div className="seat">
      {/* mão e montinho lado a lado: empilhados, a mesa estourava pra baixo */}
      <div className="seat-cards">
        <div className="mini-hand" aria-hidden>
          {Array.from({ length: count }).map((_, index) => (
            <CardBack key={index} width={vertical ? 38 : 48} />
          ))}
        </div>
        <Pile count={state.wonBySeat[seat] ?? 0} />
      </div>
      <div className={`seat-name ${state.turn === seat ? "turn" : ""}`}>
        {player?.name ?? "esperando…"}
        {isPartner && <span className="team"> · parceiro</span>}
      </div>
    </div>
  );
}
