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
import { useRoomsStore } from "@/store/roomsStore";
import { useThemeStore } from "@/store/themeStore";
import UserListItem from "./UserListItem";
import Brand from "./Brand";

type Tab = "people" | "rooms";

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" strokeWidth={2} />
      <path strokeWidth={2} strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
    </svg>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser, logout } = useAuthStore();
  const { onlineUsers, typingUsers, socket, unreadCounts } = useSocketStore();
  const { rooms, setRooms, addRoom, updateRoom } = useRoomsStore();
  const { theme, toggle: toggleTheme } = useThemeStore();

  const [tab, setTab] = useState<Tab>("people");

  // ── Users state ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  // ── Rooms state ──────────────────────────────────────────────────────────────
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
  }, [setRooms]);

  useEffect(() => {
    if (tab === "rooms") loadRooms();
  }, [tab, loadRooms]);

  // ── Create room ──────────────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const room = await apiCreateRoom(newRoomName.trim());
      addRoom(room);
      setNewRoomName("");
      setShowCreateModal(false);
      router.push(`/chat/room/${room._id}`);
    } catch {
      /* silently ignore */
    } finally {
      setCreating(false);
    }
  };

  // ── Join / Leave room ────────────────────────────────────────────────────────
  const handleJoin = async (roomId: string) => {
    setRoomActionId(roomId);
    try {
      const updated = await apiJoinRoom(roomId);
      updateRoom(updated);
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
      updateRoom(updated);
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
      <aside className="flex flex-col w-screen md:w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-full">
        {/* Brand */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Brand height={26} showText />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
              Signed in as
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {currentUser?.name ?? "-"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(["people", "rooms"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                tab === t
                  ? "text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {t === "people" ? "People" : "Rooms"}
            </button>
          ))}
        </div>

        {/* People tab */}
        {tab === "people" && (
          <>
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users…"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {usersLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : usersError ? (
                <p className="text-xs text-red-500 text-center py-6">
                  {usersError}
                </p>
              ) : users.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
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
                    unreadCount={unreadCounts[u._id]}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* Rooms tab */}
        {tab === "rooms" && (
          <>
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-500 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-colors"
              >
                <span className="text-base leading-none">+</span> New Room
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              {roomsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : roomsError ? (
                <p className="text-xs text-red-500 text-center py-6">
                  {roomsError}
                </p>
              ) : rooms.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
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
                        isActive
                          ? "bg-sky-50 dark:bg-sky-900/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      }`}
                    >
                      <Link
                        href={`/chat/room/${room._id}`}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                          #
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isActive
                                ? "text-sky-700 dark:text-sky-400"
                                : "text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {room.name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {room.members.length}{" "}
                            {room.members.length === 1 ? "member" : "members"}
                            {joined && (
                              <span className="ml-1.5 text-green-500 dark:text-green-400 font-medium">
                                · joined
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>

                      <button
                        onClick={() =>
                          joined ? handleLeave(room._id) : handleJoin(room._id)
                        }
                        disabled={actionLoading}
                        className={`shrink-0 text-xs px-2 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                          joined
                            ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            : "text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20"
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
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/50">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
            Real-time chat · FS Pro
          </p>
        </div>
      </aside>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Create a Room
            </h2>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              placeholder="Room name"
              autoFocus
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoomName("");
                }}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim() || creating}
                className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
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
