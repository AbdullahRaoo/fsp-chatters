"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useSocketStore } from "@/store/socketStore";
import { useSocket } from "@/hooks/useSocket";
import { getRoomMessages } from "@/services/messageService";
import { getRooms, joinRoom as apiJoinRoom } from "@/services/roomService";
import { User, Room, RoomMessage } from "@/types";
import { useRoomsStore } from "@/store/roomsStore";
import RoomMessageBubble from "@/components/RoomMessageBubble";

type RawRoomMessage = Omit<RoomMessage, "sender"> & {
  sender: User | string;
};

function normalizeSender(
  raw: User | string,
  members: User[],
  currentUser: User
): User {
  if (typeof raw === "object") return raw;
  const found = members.find((m) => m._id === raw);
  if (found) return found;
  if (raw === currentUser._id) return currentUser;
  return { _id: raw, name: "Unknown", email: "" };
}

export default function RoomChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocketStore();
  const { sendRoomMessage, joinRoom, leaveRoom } = useSocket();
  const { updateRoom } = useRoomsStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingQueue = useRef<string[]>([]);
  const socketJoined = useRef(false);

  const checkMembership = (r: Room) =>
    r.members.some((m) => m._id === currentUser?._id);

  // ── Fetch room info + history ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const allRooms = await getRooms();
      const found = allRooms.find((r) => r._id === roomId) ?? null;
      setRoom(found);

      if (!found) {
        setError("Room not found.");
        return;
      }

      const member = checkMembership(found);
      setIsMember(member);

      if (member) {
        try {
          const history = await getRoomMessages(roomId);
          setMessages(history);
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 403) {
            setIsMember(false);
          } else {
            setError("Failed to load messages.");
          }
        }
      }
    } catch {
      setError("Failed to load room.");
    } finally {
      setLoading(false);
    }
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // ── Join socket room only when member ────────────────────────────────────────
  useEffect(() => {
    if (!isMember || socketJoined.current) return;
    joinRoom(roomId);
    socketJoined.current = true;
    return () => {
      leaveRoom(roomId);
      socketJoined.current = false;
    };
  }, [isMember, roomId, joinRoom, leaveRoom]);

  // ── Listen for incoming room messages ────────────────────────────────────────
  useEffect(() => {
    if (!socket || !currentUser || !room || !isMember) return;

    const handleRoomMessage = (raw: RawRoomMessage) => {
      if (raw.room !== roomId) return;

      const normalized: RoomMessage = {
        ...raw,
        sender: normalizeSender(raw.sender, room.members, currentUser),
      };

      const senderId =
        typeof raw.sender === "object" ? raw.sender._id : raw.sender;

      if (senderId === currentUser._id && pendingQueue.current.length > 0) {
        const tempId = pendingQueue.current.shift()!;
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? normalized : m))
        );
      } else {
        setMessages((prev) => [...prev, normalized]);
      }
    };

    socket.on("room_message", handleRoomMessage);
    return () => {
      socket.off("room_message", handleRoomMessage);
    };
  }, [socket, currentUser, room, isMember, roomId]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── HTTP join (membership) ────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoining(true);
    setJoinError("");
    try {
      const updated = await apiJoinRoom(roomId);
      setRoom(updated);
      setIsMember(true);
      updateRoom(updated);
      const history = await getRoomMessages(roomId);
      setMessages(history);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setJoinError(err.response?.data?.message ?? "Failed to join room.");
      } else {
        setJoinError("Failed to join room.");
      }
    } finally {
      setJoining(false);
    }
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = () => {
    const content = input.trim();
    if (!content || !currentUser || !room || !isMember) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: RoomMessage = {
      _id: tempId,
      sender: currentUser,
      room: roomId,
      content,
      createdAt: new Date().toISOString(),
    };

    pendingQueue.current.push(tempId);
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    sendRoomMessage(roomId, content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  // ── Non-member gate ───────────────────────────────────────────────────────────
  if (!isMember) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-indigo-500">
            #
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">
            {room?.name}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            You&apos;re not a member of this room. Join to read and send
            messages.
          </p>
          {joinError && (
            <p className="text-xs text-red-500 mb-3">{joinError}</p>
          )}
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {joining ? "Joining…" : "Join Room"}
          </button>
        </div>
      </div>
    );
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
          #
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {room?.name ?? "Room"}
          </p>
          <p className="text-xs text-gray-400">
            {room?.members.length ?? 0}{" "}
            {room?.members.length === 1 ? "member" : "members"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <RoomMessageBubble
              key={msg._id}
              message={msg}
              isOwn={
                typeof msg.sender === "object"
                  ? msg.sender._id === currentUser?._id
                  : msg.sender === currentUser?._id
              }
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${room?.name ?? "room"}…`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
