import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { queryKeys } from "./queryKeys";
import type {
  Room,
  Session,
  CreateRoomRequest,
  JoinRoomRequest,
  PlayerProfile,
} from "@/types";

interface CreateRoomResponse {
  room: Room;
  roomCode: string;
  session: Session;
  host: PlayerProfile;
}

interface JoinRoomResponse {
  room: Room;
  session: Session | null;
  player: PlayerProfile;
  isHost: boolean;
}

interface GetRoomResponse {
  room: Room;
  session: Session | null;
  stats: unknown;
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: (data: CreateRoomRequest) =>
      apiClient.post<CreateRoomResponse>("/rooms/create", data),
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: (data: JoinRoomRequest) =>
      apiClient.post<JoinRoomResponse>("/rooms/join", data),
  });
}

export function useRoom(roomCode: string) {
  return useQuery({
    queryKey: queryKeys.rooms.byCode(roomCode),
    queryFn: () => apiClient.get<GetRoomResponse>(`/rooms/${roomCode}`),
    enabled: !!roomCode,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useRooms() {
  return useQuery({
    queryKey: queryKeys.rooms.all,
    queryFn: () => apiClient.get("/rooms"),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useRoomHistory(roomId: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.rooms.history(roomId, limit),
    queryFn: () => apiClient.get(`/rooms/${roomId}/history?limit=${limit}`),
    enabled: !!roomId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
