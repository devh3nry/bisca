"use client";

/** Guarda o id do jogador por sala, pra aguentar refresh sem perder o lugar. */

const NAME_KEY = "bisca:name";

export function savePlayerId(code: string, playerId: string) {
  try {
    localStorage.setItem(`bisca:player:${code.toUpperCase()}`, playerId);
  } catch {
    /* localStorage indisponível (aba anônima) — segue sem persistir */
  }
}

export function loadPlayerId(code: string): string | null {
  try {
    return localStorage.getItem(`bisca:player:${code.toUpperCase()}`);
  } catch {
    return null;
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* idem */
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
