import type { Card, HandType, HandResult, Rank } from "../types";
import {
  CARD_VALUES,
  SUITS,
  RANKS,
  GAME_CONFIG,
  SUIT_ORDER,
  RANK_ORDER,
  FACE_CARDS,
} from "../constants";

// Create a standard 52-card deck
export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: CARD_VALUES[rank],
      });
    }
  }

  return deck;
}

// Shuffle array using Fisher-Yates algorithm
export function shuffle<T>(array: readonly T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }

  return shuffled;
}

// Calculate score for a hand of cards
export function calculateScore(cards: Card[]): number {
  const sum = cards.reduce((total, card) => total + card.value, 0);
  return sum % 10;
}

// Deal cards to players
export function dealCards(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = [];

  for (let i = 0; i < playerCount; i++) {
    const hand: Card[] = [];
    for (let j = 0; j < GAME_CONFIG.CARDS_PER_PLAYER; j++) {
      const card = deck.pop();
      if (card) {
        hand.push(card);
      }
    }
    hands.push(hand);
  }

  return hands;
}

// Generate random room ID
export function generateRoomId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Generate random player ID
export function generatePlayerId(): string {
  return "player-" + Math.random().toString(36).substr(2, 9);
}

// Generate random game ID
export function generateGameId(): string {
  return "game-" + Math.random().toString(36).substr(2, 9);
}

// Generate random session ID
export function generateSessionId(): string {
  return "session-" + Math.random().toString(36).substr(2, 9);
}

// Validate card hand
export function isValidHand(cards: Card[]): boolean {
  if (cards.length !== GAME_CONFIG.CARDS_PER_PLAYER) {
    return false;
  }

  // Check for duplicate cards
  const cardStrings = cards.map((c) => `${c.rank}${c.suit}`);
  const uniqueCards = new Set(cardStrings);

  return uniqueCards.size === cards.length;
}

// Get card display name
export function getCardName(card: Card): string {
  return `${card.rank}${card.suit}`;
}

// Check if a score is the highest (for determining winner)
export function isHighestScore(scores: number[], targetScore: number): boolean {
  const maxScore = Math.max(...scores);
  return targetScore === maxScore;
}

// Format score for display
export function formatScore(score: number): string {
  return score.toString();
}

// Sort cards by rank and suit
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const rankOrder = RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
    if (rankOrder !== 0) return rankOrder;

    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}

// ============================================
// Hand Evaluation Functions (Three Card Poker)
// ============================================

// Check if hand is a Triple (three of a kind)
export function isTriple(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
}

// Check if hand is Ba Tiên (three face cards J, Q, K but not a Triple)
export function isBaTien(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  // Must not be a triple
  if (isTriple(cards)) return false;
  // All cards must be face cards (J, Q, or K)
  return cards.every((card) => FACE_CARDS.includes(card.rank));
}

// Check if hand has a Pair
export function isPair(cards: Card[]): {
  isPair: boolean;
  pairRank?: Rank;
  kicker?: Card;
} {
  if (cards.length !== 3) return { isPair: false };

  const ranks = cards.map((c) => c.rank);

  // Check for pairs
  if (ranks[0] === ranks[1]) {
    return { isPair: true, pairRank: ranks[0], kicker: cards[2] };
  }
  if (ranks[1] === ranks[2]) {
    return { isPair: true, pairRank: ranks[1], kicker: cards[0] };
  }
  if (ranks[0] === ranks[2]) {
    return { isPair: true, pairRank: ranks[0], kicker: cards[1] };
  }

  return { isPair: false };
}

// Determine the hand type
export function getHandType(cards: Card[]): HandType {
  if (isTriple(cards)) return "triple";
  if (isBaTien(cards)) return "baTien";
  if (isPair(cards).isPair) return "pair";
  return "normal";
}

// Evaluate a hand and return full result
export function evaluateHand(cards: Card[]): HandResult {
  const type = getHandType(cards);

  switch (type) {
    case "triple": {
      const tripleRank = cards[0].rank;
      return {
        type,
        cards,
        score: RANK_ORDER[tripleRank],
        tripleRank,
      };
    }
    case "baTien": {
      // Ba Tiên has no internal ranking beyond suit comparison
      return {
        type,
        cards,
        score: 0,
      };
    }
    case "pair": {
      const pairInfo = isPair(cards);
      return {
        type,
        cards,
        score: RANK_ORDER[pairInfo.pairRank!],
        pairRank: pairInfo.pairRank,
        kicker: pairInfo.kicker,
      };
    }
    default: {
      // Normal hand - score is sum mod 10
      return {
        type,
        cards,
        score: calculateScore(cards),
      };
    }
  }
}

// Hand type priority for comparison (higher = better)
const HAND_TYPE_PRIORITY: Record<HandType, number> = {
  triple: 4,
  baTien: 3,
  pair: 2,
  normal: 1,
};

// Sort cards by suit (highest to lowest) for tie-breaking
export function sortCardsBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit]);
}

// Compare suits for tie-breaking (returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie)
export function compareSuits(cards1: Card[], cards2: Card[]): number {
  const sorted1 = sortCardsBySuit(cards1);
  const sorted2 = sortCardsBySuit(cards2);

  for (let i = 0; i < sorted1.length; i++) {
    const suit1 = SUIT_ORDER[sorted1[i].suit];
    const suit2 = SUIT_ORDER[sorted2[i].suit];
    if (suit1 > suit2) return 1;
    if (suit1 < suit2) return -1;
  }

  return 0;
}

// Compare two hands (returns 1 if hand1 wins, -1 if hand2 wins, 0 if exact tie)
export function compareHands(hand1: HandResult, hand2: HandResult): number {
  // First compare hand types
  const priority1 = HAND_TYPE_PRIORITY[hand1.type];
  const priority2 = HAND_TYPE_PRIORITY[hand2.type];

  if (priority1 > priority2) return 1;
  if (priority1 < priority2) return -1;

  // Same hand type - compare within type
  switch (hand1.type) {
    case "triple": {
      // Compare triple rank
      if (hand1.score > hand2.score) return 1;
      if (hand1.score < hand2.score) return -1;
      // Same triple rank - compare suits
      return compareSuits(hand1.cards, hand2.cards);
    }
    case "baTien": {
      // Ba Tiên vs Ba Tiên - compare suits only
      return compareSuits(hand1.cards, hand2.cards);
    }
    case "pair": {
      // Compare pair rank
      if (hand1.score > hand2.score) return 1;
      if (hand1.score < hand2.score) return -1;
      // Same pair rank - compare kicker value
      const kicker1 = RANK_ORDER[hand1.kicker!.rank];
      const kicker2 = RANK_ORDER[hand2.kicker!.rank];
      if (kicker1 > kicker2) return 1;
      if (kicker1 < kicker2) return -1;
      // Same kicker rank - compare suits
      return compareSuits(hand1.cards, hand2.cards);
    }
    case "normal": {
      // Compare score (0-9)
      if (hand1.score > hand2.score) return 1;
      if (hand1.score < hand2.score) return -1;
      // Same score - compare suits
      return compareSuits(hand1.cards, hand2.cards);
    }
  }
}

// Determine winner from multiple hands (returns index of winner)
export function determineWinner(hands: HandResult[]): number {
  if (hands.length === 0) return -1;
  if (hands.length === 1) return 0;

  let winnerIndex = 0;
  for (let i = 1; i < hands.length; i++) {
    if (compareHands(hands[i], hands[winnerIndex]) > 0) {
      winnerIndex = i;
    }
  }

  return winnerIndex;
}
