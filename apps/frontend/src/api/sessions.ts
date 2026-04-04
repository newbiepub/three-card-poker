import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Session } from "@/types";
import type { Card, Pile } from "@three-card-poker/shared";

interface ClaimPileRequest {
  sessionId: string;
  roundNumber: number;
  pileId: string;
  playerId: string;
}

interface ClaimPileResponse {
  pile: Pile;
}

interface PublishScoreRequest {
  sessionId: string;
  playerId: string;
  score: number;
  roundNumber?: number;
}

interface SessionStateResponse {
  session: Session;
  currentRound: number;
  scores: Array<{
    playerId: string;
    playerName: string;
    gameScore: number;
    pointsChange: number;
    cumulativeScore: number;
    cards: Card[] | null;
  }>;
  allScores: Array<{
    playerId: string;
    playerName: string;
    roundNumber: number;
    gameScore: number;
    pointsChange: number;
    cumulativeScore: number;
  }>;
}

// Claim a pile from server
export function useClaimPile() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      roundNumber,
      pileId,
      playerId,
    }: ClaimPileRequest): Promise<ClaimPileResponse> => {
      const response = await apiClient.post<ClaimPileResponse>(
        `/sessions/${sessionId}/claim-pile`,
        { roundNumber, pileId, playerId },
      );
      return response;
    },
  });
}

// Publish score to database
export function usePublishScore() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      playerId,
      score,
      roundNumber,
    }: PublishScoreRequest) => {
      const response = await apiClient.post(
        `/sessions/${sessionId}/publish-score`,
        {
          playerId,
          score,
          roundNumber,
        },
      );
      return response;
    },
  });
}

// Update session round in database
export function useUpdateSessionRound() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      expectedCurrentRound,
    }: {
      sessionId: string;
      expectedCurrentRound: number;
    }) => {
      const response = await apiClient.post(
        `/sessions/${sessionId}/next-round`,
        {
          expectedCurrentRound,
        },
      );
      return response;
    },
  });
}

// Get session state (for refresh)
export function useSessionState(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["session-state", sessionId],
    queryFn: async (): Promise<SessionStateResponse | null> => {
      if (!sessionId) return null;
      try {
        const response = await apiClient.get(`/sessions/${sessionId}/state`);
        return response as SessionStateResponse;
      } catch (error) {
        console.error("Failed to fetch session state:", error);
        return null;
      }
    },
    enabled: enabled && !!sessionId,
    refetchInterval: false,
  });
}
