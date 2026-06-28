"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSocketStore } from "@/store/socketStore";
import { useSocket } from "@/hooks/useSocket";
import { getPrivateMessages } from "@/services/messageService";
import { getUsers } from "@/services/userService";
import { User, PrivateMessage } from "@/types";
import MessageBubble from "@/components/MessageBubble";

type RawSocketMessage = Omit<PrivateMessage, "sender"> & {
  sender: User | string;
};

function normalizeSender(
  raw: User | string,
  currentUser: User,
  otherUser: User
): User {
  if (typeof raw === "object") return raw;
  return raw === currentUser._id ? currentUser : otherUser;
}

export default function PrivateChatPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { user: currentUser } = useAuthStore();
  const { socket, typingUsers, onlineUsers, clearUnread } = useSocketStore();
  const { sendPrivateMessage, emitTyping, emitStopTyping } = useSocket();

  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueue = useRef<string[]>([]);

  // ── Clear unread when conversation opens ────────────────────────────────────
  useEffect(() => {
    clearUnread(userId);
  }, [userId, clearUnread]);

  // ── Fetch history + other user info ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const [history, users] = await Promise.all([
          getPrivateMessages(userId),
          getUsers(),
        ]);
        const found = users.find((u) => u._id === userId) ?? null;
        setOtherUser(found);
        setMessages(history);
      } catch {
        setError("Failed to load conversation.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // ── Auto-scroll on new messages ──────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Incoming socket messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !currentUser || !otherUser) return;

    const handlePrivateMessage = (raw: RawSocketMessage) => {
      const senderId =
        typeof raw.sender === "object" ? raw.sender._id : raw.sender;

      const isFromOther = senderId === userId;
      const isEchoFromSelf =
        senderId === currentUser._id && raw.receiver === userId;
      if (!isFromOther && !isEchoFromSelf) return;

      const normalized: PrivateMessage = {
        ...raw,
        sender: normalizeSender(raw.sender, currentUser, otherUser),
      };

      if (isEchoFromSelf) {
        const tempId = pendingQueue.current.shift();
        if (tempId) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? normalized : m))
          );
        } else {
          setMessages((prev) => [...prev, normalized]);
        }
      } else {
        setMessages((prev) => [...prev, normalized]);
      }
    };

    socket.on("private_message", handlePrivateMessage);
    return () => {
      socket.off("private_message", handlePrivateMessage);
    };
  }, [socket, currentUser, otherUser, userId]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !currentUser || !otherUser) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    emitStopTyping(userId);

    const tempId = `temp-${Date.now()}`;
    const optimistic: PrivateMessage = {
      _id: tempId,
      sender: currentUser,
      receiver: userId,
      content,
      deliveryStatus: "sent",
      createdAt: new Date().toISOString(),
    };
    pendingQueue.current.push(tempId);
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    sendPrivateMessage(userId, content);
  }, [input, currentUser, otherUser, userId, sendPrivateMessage, emitStopTyping]);

  // ── Typing indicator ─────────────────────────────────────────────────────────
  const handleInputChange = (value: string) => {
    setInput(value);

    if (!value) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitStopTyping(userId);
      }
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(userId);
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitStopTyping(userId);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOtherOnline = onlineUsers.includes(userId);
  const isOtherTyping = typingUsers[userId] ?? false;

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase">
            {otherUser?.name.charAt(0) ?? "?"}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
              isOtherOnline ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
            }`}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {otherUser?.name ?? "Unknown user"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isOtherTyping ? "typing…" : isOtherOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
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
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 overflow-y-auto"
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
