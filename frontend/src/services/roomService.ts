import api from "./api";
import { Room } from "@/types";

export const getRooms = async (): Promise<Room[]> => {
  const { data } = await api.get<Room[]>("/rooms");
  return data;
};

export const createRoom = async (name: string): Promise<Room> => {
  const { data } = await api.post<Room>("/rooms", { name });
  return data;
};

export const joinRoom = async (roomId: string): Promise<Room> => {
  const { data } = await api.post<Room>(`/rooms/${roomId}/join`);
  return data;
};

export const leaveRoom = async (roomId: string): Promise<Room> => {
  const { data } = await api.post<Room>(`/rooms/${roomId}/leave`);
  return data;
};
