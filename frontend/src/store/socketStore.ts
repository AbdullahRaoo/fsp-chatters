import { create } from "zustand";
import { Socket } from "socket.io-client";

interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  typingUsers: Record<string, boolean>;
  unreadCounts: Record<string, number>;

  setSocket: (socket: Socket | null) => void;
  setOnlineUsers: (users: string[]) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  incrementUnread: (userId: string) => void;
  clearUnread: (userId: string) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  onlineUsers: [],
  typingUsers: {},
  unreadCounts: {},

  setSocket: (socket) => set({ socket }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    })),

  incrementUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] ?? 0) + 1,
      },
    })),

  clearUnread: (userId) =>
    set((state) => {
      const next = { ...state.unreadCounts };
      delete next[userId];
      return { unreadCounts: next };
    }),
}));
