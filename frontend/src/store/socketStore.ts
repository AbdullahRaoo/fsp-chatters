import { create } from "zustand";
import { Socket } from "socket.io-client";

interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  typingUsers: Record<string, boolean>;
  setSocket: (socket: Socket | null) => void;
  setOnlineUsers: (users: string[]) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  onlineUsers: [],
  typingUsers: {},

  setSocket: (socket) => set({ socket }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    })),
}));
