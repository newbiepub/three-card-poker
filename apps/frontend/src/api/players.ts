import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { queryKeys } from './queryKeys';
import type { Player, PlayerStats } from '@/types';

interface RegisterPlayerResponse {
  player: Player;
  stats: PlayerStats;
  isNewPlayer: boolean;
}

interface GetPlayerResponse {
  player: Player;
  stats: PlayerStats;
  rank: number;
}

export function useRegisterPlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (name: string) => 
      apiClient.post<RegisterPlayerResponse>('/players/register', { name }),
    onSuccess: (data) => {
      // Cache the player data
      queryClient.setQueryData(
        queryKeys.players.byName(data.player.name),
        data
      );
    },
  });
}

export function usePlayer(name: string) {
  return useQuery({
    queryKey: queryKeys.players.byName(name),
    queryFn: () => apiClient.get<GetPlayerResponse>(`/players/${encodeURIComponent(name)}`),
    enabled: !!name,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePlayerHistory(playerId: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.players.history(playerId, limit),
    queryFn: () => 
      apiClient.get(`/players/${playerId}/history?limit=${limit}`),
    enabled: !!playerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
