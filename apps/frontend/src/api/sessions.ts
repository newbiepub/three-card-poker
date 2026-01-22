import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { queryKeys } from './queryKeys';
import type { Session } from '@/types';
import type { Card } from '@three-card-poker/shared';

interface StartSessionRequest {
  sessionId: string;
  hostId: string;
}

interface NextRoundRequest {
  sessionId: string;
  totalRounds?: number;
}

interface DrawCardRequest {
  sessionId: string;
  playerId: string;
}

interface DrawCardResponse {
  card: Card;
  hand: Card[];
  score: number | null;
  remaining: number;
  playerId: string;
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

export function useStartSession() {
  return useMutation({
    mutationFn: async ({ sessionId, hostId }: StartSessionRequest) => {
      const response = await apiClient.post(`/sessions/${sessionId}/start`, { hostId });
      return response;
    },
  });
}

export function useNextRound() {
  return useMutation({
    mutationFn: async ({ sessionId, totalRounds }: NextRoundRequest) => {
      const response = await apiClient.post(`/sessions/${sessionId}/next-round`, { totalRounds });
      return response;
    },
  });
}

export function useResetSession() {
  return useMutation({
    mutationFn: async ({ sessionId, hostId, newTotalRounds }: { sessionId: string; hostId: string; newTotalRounds?: number }) => {
      const response = await apiClient.post(`/sessions/${sessionId}/reset`, { hostId, newTotalRounds });
      return response;
    },
  });
}

// Draw a single card from server
export function useDrawCard() {
  return useMutation({
    mutationFn: async ({ sessionId, playerId }: DrawCardRequest): Promise<DrawCardResponse> => {
      const response = await apiClient.post<DrawCardResponse>(`/sessions/${sessionId}/draw-card`, { playerId });
      return response;
    },
  });
}

// Publish score to database
export function usePublishScore() {
  return useMutation({
    mutationFn: async ({ sessionId, playerId, score, roundNumber }: PublishScoreRequest) => {
      const response = await apiClient.post(`/sessions/${sessionId}/publish-score`, {
        playerId,
        score,
        roundNumber,
      });
      return response;
    },
  });
}

// Update session round in database
export function useUpdateSessionRound() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.post(`/sessions/${sessionId}/next-round`, {});
      return response;
    },
  });
}

// Get session state (for refresh)
export function useSessionState(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['session-state', sessionId],
    queryFn: async (): Promise<SessionStateResponse | null> => {
      if (!sessionId) return null;
      try {
        const response = await apiClient.get(`/sessions/${sessionId}/state`);
        return response as SessionStateResponse;
      } catch (error) {
        console.error('Failed to fetch session state:', error);
        return null;
      }
    },
    enabled: enabled && !!sessionId,
    refetchInterval: false,
  });
}

export function useSessionLeaderboard(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessions.leaderboard(sessionId),
    queryFn: () => apiClient.get(`/sessions/${sessionId}/leaderboard`),
    enabled: !!sessionId,
    staleTime: 10 * 1000, // 10 seconds
  });
}

export function useSessionHistory(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessions.history(sessionId),
    queryFn: () => apiClient.get(`/sessions/${sessionId}/history`),
    enabled: !!sessionId,
    staleTime: 5 * 1000, // 5 seconds
  });
}
