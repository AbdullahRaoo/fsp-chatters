"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { User, Room } from "@/types";
import { getUsers, searchUsers } from "@/services/userService";
import {
  getRooms,
  createRoom as apiCreateRoom,
  joinRoom as apiJoinRoom,
  leaveRoom as apiLeaveRoom,
} from "@/services/roomService";
import { useAuthStore } from "@/store/authStore";
import { useSocketStore } from "@/store/socketStore";
import UserListItem from "./UserListItem";

type Tab = "people" | "rooms";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser, logout } = useAuthStore();
  const { onlineUsers, typingUsers, socket } = useSocketStore();

  const [tab, setTab] = useState<Tab>("people");

  // ── Users state ─────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  // ── Rooms state ─────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [roomActionId, setRoomActionId] = useState<string | null>(null);

  // ── Active route detection ───────────────────────────────────────────────────
  const activeUserId = pathname.match(/^\/chat\/(?!room\/)([^/]+)$/)
    ? pathname.split("/chat/")[1]
    : null;
  const activeRoomId = pathname.startsWith("/chat/room/")
    ? pathname.split("/chat/room/")[1]
    : null;

  // ── Load users ───────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      setUsersError("");
      const data = await getUsers();
      setUsers(data);
    } catch {
      setUsersError("Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!query.trim()) {
      loadUsers();
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setUsersError("");
        const data = await searchUsers(query.trim());
        setUsers(data);
      } catch {
        setUsersError("Search failed.");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, loadUsers]);

  // ── Load rooms ───────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      setRoomsError("");
      const data = await getRooms();
      setRooms(data);
    } catch {
      setRoomsError("Failed to load rooms.");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "rooms") loadRooms();
  }, [tab, loadRooms]);

  // ── Create room ──────────────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const room = await apiCreateRoom(newRoomName.trim());
      setRooms((prev) => [room, ...prev]);
      setNewRoomName("");
      setShowCreateModal(false);
      router.push(`/chat/room/${room._id}`);
    } catch {
      // silently ignore — room list will refresh
    } finally {
      setCreating(false);
    }
  };

  // ── Join / Leave room ────────────────────────────────────────────────────────
  const handleJoin = async (roomId: string) => {
    setRoomActionId(roomId);
    try {
      const updated = await apiJoinRoom(roomId);
      setRooms((prev) => prev.map((r) => (r._id === roomId ? updated : r)));
    } catch {
      /* ignore */
    } finally {
      setRoomActionId(null);
    }
  };

  const handleLeave = async (roomId: string) => {
    setRoomActionId(roomId);
    try {
      const updated = await apiLeaveRoom(roomId);
      setRooms((prev) => prev.map((r) => (r._id === roomId ? updated : r)));
      if (activeRoomId === roomId) router.push("/chat");
    } catch {
      /* ignore */
    } finally {
      setRoomActionId(null);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    socket?.disconnect();
    logout();
    router.replace("/login");
  };

  const isMember = (room: Room) =>
    room.members.some((m) => m._id === currentUser?._id);

  return (
    <>
      <aside className="flex flex-col w-72 shrink-0 border-r border-gray-200 bg-white h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Signed in as
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {currentUser?.name ?? "—"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors font-medium"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(["people", "rooms"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                tab === t
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "people" ? "People" : "Rooms"}
            </button>
          ))}
        </div>

        {/* People tab */}
        {tab === "people" && (
          <>
            <div className="px-3 py-2.5 border-b border-gray-100">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {usersLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : usersError ? (
                <p className="text-xs text-red-500 text-center py-6">
                  {usersError}
                </p>
              ) : users.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  {query ? "No users found." : "No other users yet."}
                </p>
              ) : (
                users.map((u) => (
                  <UserListItem
                    key={u._id}
                    user={u}
                    isOnline={onlineUsers.includes(u._id)}
                    isActive={activeUserId === u._id}
                    isTyping={typingUsers[u._id] ?? false}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* Rooms tab */}
        {tab === "rooms" && (
          <>
            <div className="px-3 py-2.5 border-b border-gray-100">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1.5 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                <span className="text-base leading-none">+</span> New Room
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {roomsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : roomsError ? (
                <p className="text-xs text-red-500 text-center py-6">
                  {roomsError}
                </p>
              ) : rooms.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No rooms yet. Create one!
                </p>
              ) : (
                rooms.map((room) => {
                  const joined = isMember(room);
                  const isActive = activeRoomId === room._id;
                  const actionLoading = roomActionId === room._id;

                  return (
                    <div
                      key={room._id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isActive ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <Link
                        href={`/chat/room/${room._id}`}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                          #
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isActive ? "text-blue-700" : "text-gray-800"
                            }`}
                          >
                            {room.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {room.members.length}{" "}
                            {room.members.length === 1 ? "member" : "members"}
                            {joined && (
                              <span className="ml-1.5 text-green-500 font-medium">
                                · joined
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>

                      <button
                        onClick={() =>
                          joined
                            ? handleLeave(room._id)
                            : handleJoin(room._id)
                        }
                        disabled={actionLoading}
                        className={`shrink-0 text-xs px-2 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                          joined
                            ? "text-red-500 hover:bg-red-50"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {actionLoading ? "…" : joined ? "Leave" : "Join"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">FSP Chatters</p>
        </div>
      </aside>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Create a Room
            </h2>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              placeholder="Room name"
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoomName("");
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim() || creating}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
