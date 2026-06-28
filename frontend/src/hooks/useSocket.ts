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
  // Guard prevents a second socket being created when multiple components call
  // useSocket() (e.g. SocketInitializer in layout + the active chat page).
  useEffect(() => {
    if (!token) return;
    if (useSocketStore.getState().socket) return;

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

    // Registered here (once per socket) so multiple useSocket() callers don't
    // each add their own listener and multiply the count.
    newSocket.on(
      "private_message",
      (raw: { sender: { _id: string } | string; receiver: string }) => {
        const senderId =
          typeof raw.sender === "object" ? raw.sender._id : raw.sender;

        // Skip echoes of own sent messages
        if (senderId === currentUserRef.current?._id) return;

        // Skip if the conversation is currently open
        const match = pathnameRef.current?.match(
          /^\/chat\/(?!room\/)([^/]+)$/
        );
        if (senderId === match?.[1]) return;

        incrementUnread(senderId);
      }
    );

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    };
  }, [token, setSocket, setOnlineUsers, setTyping, incrementUnread]);

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
