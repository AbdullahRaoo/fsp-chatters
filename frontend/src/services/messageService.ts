import api from "./api";
import { PrivateMessage, RoomMessage } from "@/types";

export const getPrivateMessages = async (
  userId: string
): Promise<PrivateMessage[]> => {
  const { data } = await api.get<PrivateMessage[]>(
    `/messages/private/${userId}`
  );
  return data;
};

export const getRoomMessages = async (
  roomId: string
): Promise<RoomMessage[]> => {
  const { data } = await api.get<RoomMessage[]>(`/messages/room/${roomId}`);
  return data;
};
