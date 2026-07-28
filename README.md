# Bisca

Bisca de 3 multijogador, sem conta nem cadastro. Crie uma mesa, passe o
código de 4 letras e jogue.

- **1 vs 1** ou **2 vs 2** (em duplas, o parceiro fica à frente)
- Baralho de 40 cartas (sem 8, 9 e 10), trunfo virado, compra do monte
- Pontos: Ás 11 · 7 → 10 · Rei 4 · Dama 3 · Valete 2 (120 no total, ganha quem passar dos 60)

## Regras da casa

- **Troca do 2** — quem tiver o 2 do naipe de trunfo pode trocar pela carta
  virada. Vale a qualquer momento da partida (não só na primeira rodada), na sua
  vez e antes de jogar, enquanto o trunfo não tiver sido comprado.
- **Ás preso** — não dá pra *puxar* (sair na vaza) com o ás de trunfo enquanto o
  7 de trunfo não tiver saído. Respondendo a outra carta o ás é livre, e se for a
  única carta na mão também — senão o jogador travava sem ter o que jogar.
- **Virada limpa** — a carta virada nunca é ás nem 7. Se sair uma dessas na hora
  de dar, o baralho inteiro é embaralhado de novo (não é trocada por outra carta,
  o que enviesaria o monte).

### Placar do jogo (até 4 pontos)

| O quê | Quando | Vale |
| --- | --- | --- |
| Vitória | fez 61+ na mão | 1 |
| Capote | adversário ficou com 30 ou menos | 1 extra |
| Sete volteada | puxou com um 7 e ele ganhou a vaza dando a volta | 1 |
| Rela | matou com o ás o 7 de um adversário | 1 |

Capote vale nas duas modalidades. Sete volteada e rela só no 2v2. Empate na mão
(60–60) não dá vitória nem capote, mas volteada e rela já pagas continuam
valendo.
- Estado compartilhado no Redis, cliente sincroniza por polling adaptativo

## Consumo do Redis

Cada sondagem é um comando, e o plano free do Upstash dá 500K/mês. Por isso o
cliente sonda a 900 ms só quando há mesmo uma jogada do adversário para chegar;
desacelera pra 3 s esperando jogadores, no fim da partida e enquanto é a nossa
vez (nada muda no servidor nesse intervalo), e **para** com a aba
em segundo plano, retomando assim que ela volta a aparecer. Medido: ~10 pedidos por
10 s no cliente esperando, 0 com a aba em segundo plano.

## Rodando localmente

```bash
npm install
npm run dev
```

Sem variáveis de ambiente, o estado fica em memória no processo do `next dev` —
dá pra testar com duas abas no mesmo navegador.

## Deploy no Vercel

1. Importe o repositório na Vercel.
2. No projeto: **Storage → Upstash → Redis → plano Free → Connect**. Atenção: o
   item **"Redis · Official Redis for Vercel"** da mesma lista é o pago; o de
   graça é o do **Upstash**. A Vercel injeta sozinha `UPSTASH_REDIS_REST_URL` e
   `UPSTASH_REDIS_REST_TOKEN`.
3. **Redeploy** (o deploy do passo 1 subiu sem as variáveis).

O passo 2 não é opcional em produção: sem Redis cada função serverless tem a
própria memória, quem cria a mesa cai numa instância, quem entra cai em outra e
vê "mesa não encontrada". Dá pra conferir em `/api/health` (`{"redis":true}`) —
e a tela inicial avisa sozinha quando está faltando.

Preview e produção são ambientes separados na Vercel: conecte o Redis nos dois,
ou jogue todo mundo pela mesma URL.

## Estrutura

| Caminho | O quê |
| --- | --- |
| `lib/bisca.ts` | baralho, pontuação, quem ganha a vaza |
| `lib/room.ts` | máquina de estados da partida (distribuir, jogar, comprar) |
| `lib/store.ts` | persistência no Upstash + lock por sala |
| `app/api/rooms/**` | criar sala, entrar, ver estado, jogar, revanche |
| `components/Card.tsx` | cartas desenhadas em SVG (baralho inglês clássico) |
| `components/Court.tsx` | figuras J/Q/K, meia-figura espelhada em quatro cores |
| `components/Rules.tsx` | folha de regras aberta pelo `?` da mesa |
| `app/sala/[code]` | a mesa |
| `app/cartas` | página de referência com o baralho todo |

## Testes

```bash
npx tsx scripts/regras.ts  # regras da casa, caso a caso
npx tsx scripts/sim.ts     # 1000 partidas simuladas, verifica os invariantes
npm run dev                # em outro terminal
node scripts/smoke.mjs     # joga uma partida inteira pela API
```

As mesas expiram 6 horas depois da última jogada.
