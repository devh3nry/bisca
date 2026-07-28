// Teste de fumo contra o servidor a correr: joga uma partida inteira via HTTP.
// Correr com: node scripts/smoke.mjs [http://localhost:3000]

const BASE = process.argv[2] ?? "http://localhost:3000";

async function api(path, options) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: { "content-type": "application/json" },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

const created = await api("/api/rooms", {
  method: "POST",
  body: JSON.stringify({ name: "Ana", size: 2 }),
});
const code = created.code;
console.log("sala criada:", code);

const joined = await api(`/api/rooms/${code}/join`, {
  method: "POST",
  body: JSON.stringify({ name: "Bruno" }),
});
console.log("bruno entrou, fase:", joined.state.phase);

const ids = [created.playerId, joined.playerId];

// Reentrada tem de devolver o mesmo lugar.
const again = await api(`/api/rooms/${code}/join`, {
  method: "POST",
  body: JSON.stringify({ name: "Ana", playerId: ids[0] }),
});
if (again.state.you.seat !== 0) throw new Error("reentrada perdeu o lugar");
console.log("reentrada ok");

let state = await api(`/api/rooms/${code}?playerId=${ids[0]}`);
if (state.phase !== "playing") throw new Error("partida não arrancou");
if (state.hand.length !== 3) throw new Error("mão errada");
if (state.handCounts[1] !== 3) throw new Error("contagem do adversário errada");

// A vista do jogador não pode expor a mão do adversário nem o monte.
const raw = JSON.stringify(state);
if (raw.includes('"deck"')) throw new Error("estado expõe o monte");
if (raw.includes('"hands"')) throw new Error("estado expõe as mãos");
console.log("informação escondida ok");

// Jogar fora da vez tem de falhar.
const outOfTurn = state.turn === 0 ? 1 : 0;
const bad = await fetch(`${BASE}/api/rooms/${code}/play`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    playerId: ids[outOfTurn],
    card: (await api(`/api/rooms/${code}?playerId=${ids[outOfTurn]}`)).hand[0],
  }),
});
if (bad.status !== 409) throw new Error("deixou jogar fora da vez");
console.log("bloqueio de vez ok");

let moves = 0;
let swaps = 0;
while (state.phase === "playing") {
  const seat = state.turn;
  let view = await api(`/api/rooms/${code}?playerId=${ids[seat]}`);

  if (view.canSwapTrump) {
    const turned = view.trump;
    const two = `2${view.trumpSuit}`;
    view = await api(`/api/rooms/${code}/swap`, {
      method: "POST",
      body: JSON.stringify({ playerId: ids[seat] }),
    });
    if (view.trump !== two) throw new Error("a carta virada não ficou o 2");
    if (!view.hand.includes(turned)) throw new Error("a mão não recebeu o trunfo");
    if (view.hand.length !== 3) throw new Error("a troca mudou o tamanho da mão");
    if (view.canSwapTrump) throw new Error("a troca ficou repetível");

    const repeat = await fetch(`${BASE}/api/rooms/${code}/swap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: ids[seat] }),
    });
    if (repeat.status !== 409) throw new Error("deixou trocar duas vezes");

    const other = await fetch(`${BASE}/api/rooms/${code}/swap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: ids[seat === 0 ? 1 : 0] }),
    });
    if (other.status !== 409) throw new Error("deixou trocar fora da vez");

    swaps++;
    console.log(`troca do 2 de trunfo ok (jogada ${moves})`);
  }

  const card = view.hand[0];
  state = await api(`/api/rooms/${code}/play`, {
    method: "POST",
    body: JSON.stringify({ playerId: ids[seat], card }),
  });
  if (++moves > 60) throw new Error("partida não termina");
}

const total = state.scores[0] + state.scores[1];
if (total !== 120) throw new Error(`pontos = ${total}`);
console.log(
  "fim:",
  state.scores.join(" — "),
  "| vencedor equipa",
  state.winner,
  `| trocas: ${swaps}`
);

const restarted = await api(`/api/rooms/${code}/rematch`, {
  method: "POST",
  body: JSON.stringify({ playerId: ids[0] }),
});
if (restarted.phase !== "playing" || restarted.hand.length !== 3) {
  throw new Error("revanche falhou");
}
console.log("revanche ok");

const missing = await fetch(`${BASE}/api/rooms/ZZZZ?playerId=x`);
if (missing.status !== 404) throw new Error("sala inexistente devolveu 200");

console.log("\nTUDO OK");
