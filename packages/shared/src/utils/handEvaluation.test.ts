import { describe, expect, test } from "bun:test";
import {
  isTriple,
  isBaTien,
  isPair,
  getHandType,
  evaluateHand,
  compareHands,
  compareSuits,
  determineWinner,
  sortCardsBySuit,
} from "./index";
import type { Card, HandResult } from "../types";

// Helper to create cards
function card(rank: string, suit: string): Card {
  const values: Record<string, number> = {
    A: 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 0,
    J: 0,
    Q: 0,
    K: 0,
  };
  return {
    rank: rank as Card["rank"],
    suit: suit as Card["suit"],
    value: values[rank],
  };
}

describe("isTriple", () => {
  test("should return true for three of a kind", () => {
    expect(isTriple([card("K", "♥"), card("K", "♦"), card("K", "♠")])).toBe(
      true,
    );
    expect(isTriple([card("2", "♥"), card("2", "♦"), card("2", "♣")])).toBe(
      true,
    );
    expect(isTriple([card("A", "♠"), card("A", "♣"), card("A", "♦")])).toBe(
      true,
    );
  });

  test("should return false for non-triple", () => {
    expect(isTriple([card("K", "♥"), card("Q", "♦"), card("J", "♠")])).toBe(
      false,
    );
    expect(isTriple([card("2", "♥"), card("2", "♦"), card("3", "♣")])).toBe(
      false,
    );
  });

  test("should return false for invalid hand size", () => {
    expect(isTriple([card("K", "♥"), card("K", "♦")])).toBe(false);
    expect(isTriple([])).toBe(false);
  });
});

describe("isBaTien", () => {
  test("should return true for three different face cards", () => {
    expect(isBaTien([card("J", "♥"), card("Q", "♦"), card("K", "♠")])).toBe(
      true,
    );
    expect(isBaTien([card("K", "♠"), card("J", "♣"), card("Q", "♥")])).toBe(
      true,
    );
    expect(isBaTien([card("J", "♥"), card("K", "♦"), card("Q", "♣")])).toBe(
      true,
    );
  });

  test("should return false for triple face cards (triple takes priority)", () => {
    expect(isBaTien([card("J", "♥"), card("J", "♦"), card("J", "♠")])).toBe(
      false,
    );
    expect(isBaTien([card("K", "♥"), card("K", "♦"), card("K", "♣")])).toBe(
      false,
    );
  });

  test("should return false if not all face cards", () => {
    expect(isBaTien([card("J", "♥"), card("Q", "♦"), card("10", "♠")])).toBe(
      false,
    );
    expect(isBaTien([card("A", "♥"), card("Q", "♦"), card("K", "♠")])).toBe(
      false,
    );
  });
});

describe("isPair", () => {
  test("should detect pair with correct kicker", () => {
    const result1 = isPair([card("K", "♥"), card("K", "♦"), card("5", "♠")]);
    expect(result1.isPair).toBe(true);
    expect(result1.pairRank).toBe("K");
    expect(result1.kicker?.rank).toBe("5");

    const result2 = isPair([card("3", "♥"), card("7", "♦"), card("7", "♠")]);
    expect(result2.isPair).toBe(true);
    expect(result2.pairRank).toBe("7");
    expect(result2.kicker?.rank).toBe("3");

    const result3 = isPair([card("9", "♥"), card("5", "♦"), card("9", "♠")]);
    expect(result3.isPair).toBe(true);
    expect(result3.pairRank).toBe("9");
    expect(result3.kicker?.rank).toBe("5");
  });

  test("should return false for non-pair", () => {
    const result = isPair([card("K", "♥"), card("Q", "♦"), card("5", "♠")]);
    expect(result.isPair).toBe(false);
    expect(result.pairRank).toBeUndefined();
    expect(result.kicker).toBeUndefined();
  });
});

describe("getHandType", () => {
  test("should correctly identify all hand types", () => {
    expect(
      getHandType([card("K", "♥"), card("K", "♦"), card("K", "♠")]),
    ).toBe("triple");
    expect(
      getHandType([card("J", "♥"), card("Q", "♦"), card("K", "♠")]),
    ).toBe("baTien");
    expect(
      getHandType([card("K", "♥"), card("K", "♦"), card("5", "♠")]),
    ).toBe("pair");
    expect(
      getHandType([card("2", "♥"), card("5", "♦"), card("8", "♠")]),
    ).toBe("normal");
  });
});

describe("evaluateHand", () => {
  test("should evaluate triple correctly", () => {
    const result = evaluateHand([
      card("K", "♥"),
      card("K", "♦"),
      card("K", "♠"),
    ]);
    expect(result.type).toBe("triple");
    expect(result.score).toBe(13); // K = 13 in RANK_ORDER
    expect(result.tripleRank).toBe("K");
  });

  test("should evaluate ba tien correctly", () => {
    const result = evaluateHand([
      card("J", "♥"),
      card("Q", "♦"),
      card("K", "♠"),
    ]);
    expect(result.type).toBe("baTien");
    expect(result.score).toBe(0);
  });

  test("should evaluate pair correctly", () => {
    const result = evaluateHand([
      card("7", "♥"),
      card("7", "♦"),
      card("3", "♠"),
    ]);
    expect(result.type).toBe("pair");
    expect(result.score).toBe(7); // 7 = 7 in RANK_ORDER
    expect(result.pairRank).toBe("7");
    expect(result.kicker?.rank).toBe("3");
  });

  test("should evaluate normal hand correctly", () => {
    const result = evaluateHand([
      card("2", "♥"),
      card("5", "♦"),
      card("8", "♠"),
    ]);
    expect(result.type).toBe("normal");
    expect(result.score).toBe(5); // (2+5+8) % 10 = 15 % 10 = 5
  });
});

describe("compareSuits", () => {
  test("should compare by highest suit first", () => {
    // Hearts > Diamonds for highest suit
    const cards1 = [card("K", "♥"), card("Q", "♠"), card("J", "♠")];
    const cards2 = [card("K", "♦"), card("Q", "♠"), card("J", "♠")];
    expect(compareSuits(cards1, cards2)).toBe(1); // cards1 wins (♥ > ♦)
    expect(compareSuits(cards2, cards1)).toBe(-1); // cards2 loses
  });

  test("should compare second suit if first is equal", () => {
    const cards1 = [card("K", "♥"), card("Q", "♦"), card("J", "♠")];
    const cards2 = [card("K", "♥"), card("Q", "♣"), card("J", "♠")];
    expect(compareSuits(cards1, cards2)).toBe(1); // ♦ > ♣
  });

  test("should return 0 for identical suit distributions", () => {
    const cards1 = [card("K", "♥"), card("Q", "♠"), card("J", "♠")];
    const cards2 = [card("A", "♥"), card("2", "♠"), card("3", "♠")];
    expect(compareSuits(cards1, cards2)).toBe(0); // same suits
  });
});

describe("compareHands", () => {
  test("triple beats everything", () => {
    const triple = evaluateHand([
      card("2", "♥"),
      card("2", "♦"),
      card("2", "♠"),
    ]);
    const baTien = evaluateHand([
      card("J", "♥"),
      card("Q", "♦"),
      card("K", "♠"),
    ]);
    const pair = evaluateHand([
      card("K", "♥"),
      card("K", "♦"),
      card("5", "♠"),
    ]);
    const normal = evaluateHand([
      card("A", "♥"),
      card("9", "♦"),
      card("9", "♠"),
    ]); // Actually this is a pair!

    expect(compareHands(triple, baTien)).toBe(1);
    expect(compareHands(triple, pair)).toBe(1);
  });

  test("ba tien beats pair and normal", () => {
    const baTien = evaluateHand([
      card("J", "♥"),
      card("Q", "♦"),
      card("K", "♠"),
    ]);
    const pair = evaluateHand([
      card("K", "♥"),
      card("K", "♦"),
      card("5", "♠"),
    ]);
    const normal = evaluateHand([
      card("2", "♥"),
      card("5", "♦"),
      card("2", "♣"),
    ]); // This is a pair!

    expect(compareHands(baTien, pair)).toBe(1);
  });

  test("pair beats normal", () => {
    const pair = evaluateHand([
      card("2", "♥"),
      card("2", "♦"),
      card("3", "♠"),
    ]);
    const normal = evaluateHand([
      card("A", "♥"),
      card("4", "♦"),
      card("5", "♠"),
    ]); // 1+4+5=10, score=0

    expect(compareHands(pair, normal)).toBe(1);
  });

  test("higher triple rank wins", () => {
    const tripleK = evaluateHand([
      card("K", "♥"),
      card("K", "♦"),
      card("K", "♠"),
    ]);
    const triple2 = evaluateHand([
      card("2", "♥"),
      card("2", "♦"),
      card("2", "♣"),
    ]);

    expect(compareHands(tripleK, triple2)).toBe(1);
    expect(compareHands(triple2, tripleK)).toBe(-1);
  });

  test("higher normal score wins", () => {
    const score9 = evaluateHand([
      card("A", "♥"),
      card("3", "♦"),
      card("5", "♠"),
    ]); // 1+3+5=9
    const score5 = evaluateHand([
      card("2", "♥"),
      card("3", "♦"),
      card("K", "♣"),
    ]); // 2+3+0=5

    expect(compareHands(score9, score5)).toBe(1);
    expect(compareHands(score5, score9)).toBe(-1);
  });
});

describe("determineWinner", () => {
  test("should find winner among multiple hands", () => {
    const hands: HandResult[] = [
      evaluateHand([card("2", "♥"), card("5", "♦"), card("8", "♠")]), // normal, score 5
      evaluateHand([card("J", "♥"), card("Q", "♦"), card("K", "♠")]), // ba tien
      evaluateHand([card("7", "♥"), card("7", "♦"), card("3", "♠")]), // pair
    ];

    expect(determineWinner(hands)).toBe(1); // ba tien wins
  });

  test("should handle single hand", () => {
    const hands: HandResult[] = [
      evaluateHand([card("2", "♥"), card("5", "♦"), card("8", "♠")]),
    ];

    expect(determineWinner(hands)).toBe(0);
  });

  test("should handle empty array", () => {
    expect(determineWinner([])).toBe(-1);
  });
});
