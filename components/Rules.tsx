"use client";

import { useState } from "react";

const VALUES = [
  { card: "Ás", pts: 11 },
  { card: "7", pts: 10 },
  { card: "Rei", pts: 4 },
  { card: "Dama", pts: 3 },
  { card: "Valete", pts: 2 },
  { card: "6, 5, 4, 3, 2", pts: 0 },
];

/** Botão de ajuda + folha de regras. Quem nunca jogou abre e entende em 30s. */
export function Rules({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={compact ? "icon-btn" : "btn ghost"}
        onClick={() => setOpen(true)}
        title="Como se joga"
        aria-label="Como se joga"
      >
        {compact ? "?" : "Como se joga"}
      </button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div
            className="panel rules"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Como se joga</h2>

            <h3>O básico</h3>
            <p>
              Baralho de 40 cartas (sem 8, 9 e 10). Cada um recebe 3 cartas e uma
              carta fica virada: o naipe dela é o <b>trunfo</b>, que ganha de
              qualquer outro naipe.
            </p>
            <p>
              Na sua vez você joga uma carta qualquer — não precisa acompanhar o
              naipe. Quem jogar a carta mais forte leva a vaza e as cartas vão
              pro monte do time. Depois todo mundo compra uma carta e continua.
            </p>

            <h3>Quanto vale cada carta</h3>
            <table className="rules-table">
              <tbody>
                {VALUES.map((row) => (
                  <tr key={row.card}>
                    <td>{row.card}</td>
                    <td>
                      <b>{row.pts}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted-note">
              São 120 pontos no baralho. Ganha a mão quem fizer 61 ou mais.
            </p>

            <h3>Força das cartas (dentro do naipe)</h3>
            <p className="strength">
              Ás <span>&gt;</span> 7 <span>&gt;</span> Rei <span>&gt;</span> Dama{" "}
              <span>&gt;</span> Valete <span>&gt;</span> 6 <span>&gt;</span> 5{" "}
              <span>&gt;</span> 4 <span>&gt;</span> 3 <span>&gt;</span> 2
            </p>

            <h3>Regras da casa</h3>
            <ul>
              <li>
                <b>Troca do 2</b> — quem tiver o 2 do naipe de trunfo pode trocar
                pela carta virada, na sua vez, a qualquer momento da partida.
              </li>
              <li>
                <b>Ás preso</b> — não dá pra <i>puxar</i> com o ás de trunfo
                enquanto o 7 de trunfo não tiver saído. Respondendo, pode.
              </li>
            </ul>

            <h3>Placar do jogo</h3>
            <p>
              Cada mão vale pontos de jogo. Ganha quem chegar a <b>4</b>:
            </p>
            <ul>
              <li>
                <b>Vitória</b> na mão (61+) — 1 ponto
              </li>
              <li>
                <b>Capote</b> — adversário ficou com 30 ou menos: 1 ponto extra
              </li>
              <li>
                <b>Sete volteada</b> (só 2v2) — você puxa com um 7 e ele ganha a
                vaza dando a volta inteira: 1 ponto
              </li>
              <li>
                <b>Rela</b> (só 2v2) — alguém joga um 7 e o adversário mata com o
                ás por cima: 1 ponto pra quem matou
              </li>
            </ul>

            <button className="btn" onClick={() => setOpen(false)}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
