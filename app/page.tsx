"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayingCard } from "@/components/Card";
import { RedisWarning } from "@/components/RedisWarning";
import { loadName, saveName, savePlayerId } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [size, setSize] = useState<2 | 4>(2);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setName(loadName()), []);

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, size }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não deu pra criar a mesa.");
      saveName(name);
      savePlayerId(data.code, data.playerId);
      router.push(`/sala/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deu algum erro aqui.");
      setBusy(false);
    }
  }

  function joinRoom() {
    const clean = code.trim().toUpperCase();
    if (clean.length < 3) {
      setError("Digite o código da mesa.");
      return;
    }
    saveName(name);
    setBusy(true);
    router.push(`/sala/${clean}`);
  }

  return (
    <main className="home">
      <div className="home-inner">
        <div className="brand">
          <div className="brand-cards">
            <PlayingCard code="AS" width={64} />
            <PlayingCard code="7H" width={64} />
            <PlayingCard code="KD" width={64} />
          </div>
          <h1>BISCA</h1>
          <p>Bisca de 3 · jogue com os amigos, sem cadastro</p>
        </div>

        <RedisWarning />

        {error && <p className="error">{error}</p>}

        <div className="panel">
          <h2>Seu nome</h2>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Como você se chama?"
            maxLength={16}
          />

          <h2>Nova mesa</h2>
          <div className="seg">
            <button
              type="button"
              aria-pressed={size === 2}
              onClick={() => setSize(2)}
            >
              1 vs 1
            </button>
            <button
              type="button"
              aria-pressed={size === 4}
              onClick={() => setSize(4)}
            >
              2 vs 2
            </button>
          </div>
          <button className="btn" onClick={createRoom} disabled={busy}>
            Criar mesa
          </button>
        </div>

        <div className="panel">
          <h2>Entrar em uma mesa</h2>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => event.key === "Enter" && joinRoom()}
            placeholder="CÓDIGO"
            maxLength={6}
            style={{ letterSpacing: 6, textAlign: "center", fontSize: 22 }}
          />
          <button className="btn ghost" onClick={joinRoom} disabled={busy}>
            Entrar
          </button>
        </div>
      </div>
    </main>
  );
}
