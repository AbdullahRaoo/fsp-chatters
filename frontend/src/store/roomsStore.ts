import { create } from "zustand";
import { Room } from "@/types";

interface RoomsStore {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
}

export const useRoomsStore = create<RoomsStore>((set) => ({
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((s) => ({ rooms: [room, ...s.rooms] })),
  updateRoom: (room) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r._id === room._id ? room : r)),
    })),
}));
