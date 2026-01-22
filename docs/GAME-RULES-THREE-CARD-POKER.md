# THREE CARD POKER GAME RULES - NO TIES (AGENT VERSION)

## 1) Overview

- Uses a standard 52-card Western deck.
- Each player receives 3 cards.
- Objective: Have a stronger hand to win (no ties allowed).

---

## 2) Card Values & Scoring (Normal Hands)

### Card Values

- A = 1 point
- 2–9 = Face value
- 10, J, Q, K = 0 points

### Scoring

- Sum the 3 cards and take the units digit (i.e., `sum mod 10`).
- Final score: 0–9 (9 is highest in normal hands).

---

## 3) Hand Rankings (Strong → Weak)

1. **Triple (Three of a Kind)**: 3 cards of same value
2. **Ba Tiên (Three Face Cards)**: 3 cards where each card is a face card (J, Q, or K) and not a Triple
3. **Pair**: 2 cards of same value + 1 kicker card (where at least one card is not J, Q, or K)
4. **Normal Hand**: Neither triple, ba tiên, nor pair → compared by score

---

## 4) Detailed Hand Comparison (NO TIES)

### 4.1 Triple vs Triple

- Compare triple value: higher triple wins.
- Value order: A < 2 < … < 10 < J < Q < K.
- If absolute tie-breaking is required: compare suits per section 4.5.

### 4.2 Ba Tiên vs Ba Tiên

- Compare using Suit Comparison Rules per section 4.5 (highest suit wins).

### 4.3 Pair vs Pair

Compare in order:

1. Pair value (higher pair wins)
2. If equal → compare kicker by value
3. If still equal → compare suits per section 4.5 (examine all 3 cards)

### 4.4 Normal Hand vs Normal Hand

Compare in order:

1. Score (0–9): higher score wins
2. If scores equal → compare suits per section 4.5 (to ensure no tie)

### 4.5 Suit Comparison Rules (Tie-breaking - applies when needed)

**Suit Order (low → high)**
♠ (Spades) < ♣ (Clubs) < ♦ (Diamonds) < ♥ (Hearts)
(i.e., Hearts > Diamonds > Clubs > Spades)

**Suit Comparison Method for Tie-breaking (finalized)**

- Each player takes their 3 cards sorted by suit descending (high → low).
- Compare sequentially:
  1. Compare highest suit card of each side
  2. If still equal → compare second highest suit card
  3. If still equal → compare third highest suit card

- The side with the higher suit at the first comparison step wins.

**Agent Note:** Since the deck is unique, "same suit at same step" between 2 players can still occur, but comparing the next step will yield a result.

---

## 5) One-Line Summary for Agent

- Triple > Ba Tiên > Pair > Normal; if equal then break tie by suit order: Spades < Clubs < Diamonds < Hearts; compare sequentially: highest → second highest → third highest suit (no ties).
