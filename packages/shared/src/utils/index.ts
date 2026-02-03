import type { Card, HandResult, HandType, Rank } from "../types";
import {
  CARD_VALUES,
  FACE_CARDS,
  RANK_ORDER,
  RANKS,
  SUIT_ORDER,
  SUITS,
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

// ============================================
// Hand Evaluation Functions (Three Card Poker)
// ============================================

// Check if hand is a Triple (three of a kind)
export function isTriple(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  const [c1, c2, c3] = cards;
  if (!c1 || !c2 || !c3) return false;
  return c1.rank === c2.rank && c2.rank === c3.rank;
}

// Check if hand is Ba Tiên (three face cards J, Q, K but not a Triple or Straight)
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
  const pointSum = calculateScore(cards);

  switch (type) {
    case "triple": {
      const tripleRank = cards[0]?.rank || "A";
      return {
        type,
        cards,
        score: pointSum,
        tripleRank,
      };
    }
    case "baTien": {
      return {
        type,
        cards,
        score: pointSum,
      };
    }
    case "pair": {
      const pairInfo = isPair(cards);
      return {
        type,
        cards,
        score: pointSum,
        pairRank: pairInfo.pairRank,
        kicker: pairInfo.kicker,
      };
    }
    default: {
      return {
        type,
        cards,
        score: pointSum,
      };
    }
  }
}

// Hand type priority for comparison (higher = better)
const HAND_TYPE_PRIORITY: Record<HandType, number> = {
  triple: 4,
  baTien: 3,
  // Pair and Normal are now the same priority level
  // Points (score) will be compared first inside compareHands
  pair: 1,
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
    const c1 = sorted1[i];
    const c2 = sorted2[i];
    if (!c1 || !c2) continue;

    const suit1 = SUIT_ORDER[c1.suit];
    const suit2 = SUIT_ORDER[c2.suit];
    if (suit1 > suit2) return 1;
    if (suit1 < suit2) return -1;
  }

  return 0;
}

// Compare two hands (returns 1 if hand1 wins, -1 if hand2 wins, 0 if exact tie)
export function compareHands(hand1: HandResult, hand2: HandResult): number {
  // 1. Compare hand type priority (Sáp > Ba Tây > Normal/Pair)
  const priority1 = HAND_TYPE_PRIORITY[hand1.type];
  const priority2 = HAND_TYPE_PRIORITY[hand2.type];

  if (priority1 > priority2) return 1;
  if (priority1 < priority2) return -1;

  // 2. Same hand type (Sáp, Ba Tây) or same priority level (Pair, Normal)
  if (hand1.type === "triple") {
    const r1 = hand1.tripleRank ? RANK_ORDER[hand1.tripleRank] : 0;
    const r2 = hand2.tripleRank ? RANK_ORDER[hand2.tripleRank] : 0;
    if (r1 > r2) return 1;
    if (r1 < r2) return -1;
    return compareSuits(hand1.cards, hand2.cards);
  }

  if (hand1.type === "baTien") {
    return compareSuits(hand1.cards, hand2.cards);
  }

  // 3. Normal or Pair (priority 1)
  // PRIMARY: Point sum (0-9)
  if (hand1.score > hand2.score) return 1;
  if (hand1.score < hand2.score) return -1;

  // SECONDARY: Pair is a tie-breaker if points are equal
  if (hand1.type === "pair" && hand2.type === "normal") return 1;
  if (hand1.type === "normal" && hand2.type === "pair") return -1;

  // TERTIARY: If both are Pairs, compare pair rank
  if (hand1.type === "pair" && hand2.type === "pair") {
    const r1 = hand1.pairRank ? RANK_ORDER[hand1.pairRank] : 0;
    const r2 = hand2.pairRank ? RANK_ORDER[hand2.pairRank] : 0;
    if (r1 > r2) return 1;
    if (r1 < r2) return -1;
  }

  // FINAL: Single Highest Card (Rank > Suit)
  const getHighestCard = (cards: Card[]) => {
    return [...cards].sort((a, b) => {
      const rankDiff = RANK_ORDER[b.rank] - RANK_ORDER[a.rank];
      if (rankDiff !== 0) return rankDiff;
      return SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit];
    })[0]!;
  };

  const high1 = getHighestCard(hand1.cards);
  const high2 = getHighestCard(hand2.cards);

  const r1 = RANK_ORDER[high1.rank];
  const r2 = RANK_ORDER[high2.rank];
  if (r1 > r2) return 1;
  if (r1 < r2) return -1;

  const s1 = SUIT_ORDER[high1.suit];
  const s2 = SUIT_ORDER[high2.suit];
  if (s1 > s2) return 1;
  if (s1 < s2) return -1;

  return 0;
}

// Determine winner from multiple hands (returns index of winner)
export function determineWinner(hands: HandResult[]): number {
  if (hands.length === 0) return -1;
  if (hands.length === 1) return 0;

  let winnerIndex = 0;
  for (let i = 1; i < hands.length; i++) {
    const currentHand = hands[i];
    const winnerHand = hands[winnerIndex];

    if (
      currentHand &&
      winnerHand &&
      compareHands(currentHand, winnerHand) > 0
    ) {
      winnerIndex = i;
    }
  }

  return winnerIndex;
}
