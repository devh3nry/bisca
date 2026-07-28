"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CardBack, PlayingCard } from "@/components/Card";
import type { PlayerView } from "@/lib/types";
import { loadName, loadPlayerId, savePlayerId } from "@/lib/session";

// Cada sondagem é um comando no Redis e o plano free do Upstash dá 500K/mês.
// Por isso: ritmo rápido só quando há mesmo uma jogada para aparecer, mais
// lento à espera de gente ou no fim, e parado com o separador escondido.
const POLL_ACTIVE_MS = 900;
const POLL_IDLE_MS = 3000;

function pollDelay(state: PlayerView | null): number {
  if (!state) return POLL_ACTIVE_MS;
  if (state.phase !== "playing") return POLL_IDLE_MS;
  // Na nossa vez não há nada a chegar do servidor até jogarmos.
  return state.yourTurn ? POLL_IDLE_MS : POLL_ACTIVE_MS;
}

const SUIT_NAMES: Record<string, string> = {
  S: "Espadas",
  H: "Copas",
  D: "Ouros",
  C: "Paus",
};

export default function RoomClient({ code }: { code: string }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<PlayerView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const idRef = useRef<string | null>(null);
  const stateRef = useRef<PlayerView | null>(null);
  stateRef.current = state;

  // Entra (ou volta a entrar) na sala.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const known = loadPlayerId(code);
      try {
        const response = await fetch(`/api/rooms/${code}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: loadName(), playerId: known }),
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Não foi possível entrar na sala.");
          return;
        }
        savePlayerId(code, data.playerId);
        idRef.current = data.playerId;
        setPlayerId(data.playerId);
        setState(data.state);
      } catch {
        if (!cancelled) setError("Sem ligação ao servidor.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

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
      /* falha de rede pontual: a próxima ronda apanha */
    }
  }, [code]);

  // Ritmo adaptativo, e nada de sondar com o separador escondido — uma aba
  // esquecida aberta gastava a quota do Redis a noite toda.
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

  async function play(card: string) {
    if (!playerId || sending) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch(`/api/rooms/${code}/play`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, card }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error ?? "Jogada inválida.");
        if (data.state) setState(data.state);
      } else {
        setState(data);
      }
    } catch {
      setNotice("Sem ligação — tenta outra vez.");
    } finally {
      setSending(false);
    }
  }

  async function swapTrump() {
    if (!playerId || sending) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch(`/api/rooms/${code}/swap`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error ?? "Não deu para trocar.");
        if (data.state) setState(data.state);
      } else {
        setState(data);
      }
    } catch {
      setNotice("Sem ligação — tenta outra vez.");
    } finally {
      setSending(false);
    }
  }

  async function rematch() {
    if (!playerId) return;
    setSending(true);
    try {
      const response = await fetch(`/api/rooms/${code}/rematch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await response.json();
      if (response.ok) setState(data);
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
      .catch(() => setNotice("Copia o endereço da barra do navegador."));
  }

  if (error) {
    return (
      <main className="home">
        <div className="home-inner panel" style={{ textAlign: "center" }}>
          <h2>Sala {code}</h2>
          <p className="error">{error}</p>
          <Link href="/">
            <button className="btn">Voltar ao início</button>
          </Link>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="home">
        <p style={{ opacity: 0.7 }}>A entrar na sala {code}…</p>
      </main>
    );
  }

  const mySeat = state.you?.seat ?? 0;
  const size = state.size;
  const seatAt = (offset: number) => (mySeat + offset) % size;
  const opponents =
    size === 2
      ? { top: seatAt(1), left: null, right: null }
      : { top: seatAt(2), left: seatAt(1), right: seatAt(3) };

  const waiting = state.phase === "lobby";
  const trick = state.table.length > 0 ? state.table : state.lastTrick ?? [];
  const showingPast = state.table.length === 0 && !!state.lastTrick;

  return (
    <main className="table">
      <div className="topbar">
        <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>
          ← Sair
        </Link>
        <button
          className="code-chip"
          onClick={copyLink}
          title="Copiar o link da sala"
          style={{ border: "1px solid rgba(232,195,122,.3)" }}
        >
          {copied ? "COPIADO" : code}
        </button>
        <div className="score">
          <span>
            Nós <b>{state.scores[state.you?.team ?? 0]}</b>
          </span>
          <span>
            Eles <b>{state.scores[1 - (state.you?.team ?? 0)]}</b>
          </span>
        </div>
      </div>

      <div className="arena">
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
          <div className={`trick ${showingPast ? "past" : ""}`}>
            {trick.map((play) => (
              <div
                key={play.card}
                className={`played ${
                  showingPast && play.seat === state.lastWinner ? "winner" : ""
                }`}
              >
                <PlayingCard code={play.card} width={92} />
                <span>{nameOf(state, play.seat)}</span>
              </div>
            ))}
            {trick.length === 0 && (
              <span style={{ opacity: 0.5 }}>
                {waiting ? "À espera de jogadores…" : "Mesa vazia"}
              </span>
            )}
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
                {state.trumpSuit && `Trunfo: ${SUIT_NAMES[state.trumpSuit]}`} ·{" "}
                {state.deckCount} no monte
              </span>
              {state.canSwapTrump && (
                <button
                  className="swap"
                  onClick={swapTrump}
                  disabled={sending}
                  title="Trocar o teu 2 de trunfo pela carta virada"
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
                ? `À espera de ${size - state.players.length} jogador(es) — partilha o código ${code}`
                : state.phase === "done"
                  ? "Partida terminada"
                  : state.yourTurn
                    ? "É a tua vez — escolhe uma carta"
                    : `A jogar: ${nameOf(state, state.turn)}`)}
          </p>
          <div className="hand">
            {state.hand.map((card) => (
              <button
                key={card}
                onClick={() => play(card)}
                disabled={!state.yourTurn || sending}
                aria-label={`Jogar ${card}`}
              >
                <PlayingCard code={card} width={104} />
              </button>
            ))}
            {state.hand.length === 0 && waiting && (
              <>
                <CardBack width={104} />
                <CardBack width={104} />
                <CardBack width={104} />
              </>
            )}
          </div>
          <p className="log">{state.log[0] ?? ""}</p>
        </div>
      </div>

      {state.phase === "done" && (
        <div className="overlay">
          <div className="panel">
            <h2>
              {state.winner === -1
                ? "Empate!"
                : state.winner === state.you?.team
                  ? "Ganhaste! 🎉"
                  : "Perdeste…"}
            </h2>
            <p className="big-score">
              {state.scores[state.you?.team ?? 0]} —{" "}
              {state.scores[1 - (state.you?.team ?? 0)]}
            </p>
            <button className="btn" onClick={rematch} disabled={sending}>
              Nova partida
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function nameOf(state: PlayerView, seat: number): string {
  return (
    state.players.find((p) => p.seat === seat)?.name ?? `Lugar ${seat + 1}`
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
      <div className="mini-hand" aria-hidden>
        {Array.from({ length: count }).map((_, index) => (
          <CardBack key={index} width={vertical ? 38 : 48} />
        ))}
      </div>
      <div className={`seat-name ${state.turn === seat ? "turn" : ""}`}>
        {player?.name ?? "à espera…"}
        {isPartner && <span className="team"> · parceiro</span>}
      </div>
    </div>
  );
}
