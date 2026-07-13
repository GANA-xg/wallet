import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CardRecord } from "@/types";

const CARDS_KEY = "@vault_cards";

export async function loadCards(): Promise<CardRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(CARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CardRecord[];
  } catch {
    return [];
  }
}

export async function saveCards(cards: CardRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  } catch {}
}

export async function addCard(card: CardRecord): Promise<void> {
  const cards = await loadCards();
  cards.unshift(card);
  await saveCards(cards);
}

export async function removeCard(id: string): Promise<void> {
  const cards = await loadCards();
  const filtered = cards.filter((c) => c.id !== id);
  await saveCards(filtered);
}

export async function updateCard(id: string, updates: Partial<CardRecord>): Promise<CardRecord | null> {
  const cards = await loadCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  cards[idx] = { ...cards[idx], ...updates, updatedAt: new Date().toISOString() };
  await saveCards(cards);
  return cards[idx];
}

export async function toggleFreeze(id: string): Promise<CardRecord | null> {
  const cards = await loadCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  cards[idx] = { ...cards[idx], frozen: !cards[idx].frozen, updatedAt: new Date().toISOString() };
  await saveCards(cards);
  return cards[idx];
}
