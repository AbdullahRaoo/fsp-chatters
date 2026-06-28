import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import { useSocketStore } from "@/store/socketStore";

export function useSocket() {
  const { token, user: currentUser } = useAuthStore();
  const { socket, setSocket, setOnlineUsers, setTyping, incrementUnread } =
    useSocketStore();

  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // ── Socket connection ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on("online_users", (users: string[]) => {
      setOnlineUsers(users);
    });

    newSocket.on("typing", ({ senderId }: { senderId: string }) => {
      setTyping(senderId, true);
    });

    newSocket.on("stop_typing", ({ senderId }: { senderId: string }) => {
      setTyping(senderId, false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    };
  }, [token, setSocket, setOnlineUsers, setTyping]);

  // ── Global unread counter ─────────────────────────────────────────────────────
  // Registered separately so it always uses the latest pathnameRef without
  // reconnecting the socket on every navigation.
  useEffect(() => {
    if (!socket) return;

    const handlePrivateMessage = (raw: {
      sender: { _id: string } | string;
      receiver: string;
    }) => {
      const senderId =
        typeof raw.sender === "object" ? raw.sender._id : raw.sender;

      // Skip echoes of the current user's own sent messages
      if (senderId === currentUserRef.current?._id) return;

      // Skip if this conversation is currently open
      const match = pathnameRef.current?.match(
        /^\/chat\/(?!room\/)([^/]+)$/
      );
      const openUserId = match?.[1];
      if (senderId === openUserId) return;

      incrementUnread(senderId);
    };

    socket.on("private_message", handlePrivateMessage);
    return () => {
      socket.off("private_message", handlePrivateMessage);
    };
  }, [socket, incrementUnread]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const sendPrivateMessage = useCallback(
    (receiverId: string, content: string) => {
      socket?.emit("private_message", { receiverId, content });
    },
    [socket]
  );

  const sendRoomMessage = useCallback(
    (roomId: string, content: string) => {
      socket?.emit("room_message", { roomId, content });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      socket?.emit("join_room", { roomId });
    },
    [socket]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      socket?.emit("leave_room", { roomId });
    },
    [socket]
  );

  const emitTyping = useCallback(
    (receiverId: string) => {
      socket?.emit("typing", { receiverId });
    },
    [socket]
  );

  const emitStopTyping = useCallback(
    (receiverId: string) => {
      socket?.emit("stop_typing", { receiverId });
    },
    [socket]
  );

  return {
    socket,
    sendPrivateMessage,
    sendRoomMessage,
    joinRoom,
    leaveRoom,
    emitTyping,
    emitStopTyping,
  };
}
