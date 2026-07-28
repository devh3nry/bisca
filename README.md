# Bisca

Bisca de 3 multijogador, sem contas nem registos. Cria uma mesa, partilha o
código de 4 letras e joga.

- **1 vs 1** ou **2 vs 2** (em duplas, o parceiro fica à frente)
- Baralho de 40 cartas (sem 8, 9 e 10), trunfo virado, compra do monte
- Pontos: Ás 11 · 7 → 10 · Rei 4 · Dama 3 · Valete 2 (120 no total, ganha quem passar dos 60)
- Estado partilhado no Redis, cliente sincroniza por polling (~900 ms)

## Correr localmente

```bash
npm install
npm run dev
```

Sem variáveis de ambiente, o estado fica em memória no processo do `next dev` —
chega para testar com dois separadores no mesmo browser.

## Deploy no Vercel

1. Importa o repositório no Vercel.
2. No projeto: **Storage → Marketplace → Upstash for Redis → Create**. O Vercel
   injeta sozinho `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
3. Redeploy.

O passo 2 não é opcional em produção: sem Redis cada função serverless tem a sua
memória e os jogadores não se veem uns aos outros.

## Estrutura

| Caminho | O quê |
| --- | --- |
| `lib/bisca.ts` | baralho, pontuação, quem ganha a vaza |
| `lib/room.ts` | máquina de estados da partida (dar cartas, jogar, comprar) |
| `lib/store.ts` | persistência no Upstash + lock por sala |
| `app/api/rooms/**` | criar sala, entrar, ver estado, jogar, revanche |
| `components/Card.tsx` | cartas desenhadas em SVG (baralho inglês clássico) |
| `app/sala/[code]` | a mesa |
| `app/cartas` | página de referência com o baralho todo |

## Testes

```bash
npx tsx scripts/sim.ts   # 1000 partidas simuladas, verifica os invariantes
npm run dev              # noutro terminal
node scripts/smoke.mjs   # joga uma partida inteira pela API
```

As salas expiram 6 horas depois da última jogada.
