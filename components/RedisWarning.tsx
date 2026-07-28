"use client";

import { useEffect, useState } from "react";

/**
 * Sem Redis cada função serverless tem a própria memória: quem cria a sala cai
 * numa instância e quem entra cai em outra, e a sala "não existe". Em vez de
 * falhar calado, o app avisa.
 */
export function RedisWarning() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setMissing(data.redis === false))
      .catch(() => {
        /* sem rede não dá pra saber — não assusta o usuário à toa */
      });
  }, []);

  if (!missing) return null;

  return (
    <div className="warn">
      <strong>Falta ligar o Redis.</strong>{" "}
      Enquanto isso, quem entrar vai ver &ldquo;mesa não encontrada&rdquo;,
      porque cada função da Vercel está com a memória dela.
      <br />
      No painel do projeto: <b>Storage → Upstash → Redis → plano Free</b>, e
      depois <b>Redeploy</b>.
    </div>
  );
}
