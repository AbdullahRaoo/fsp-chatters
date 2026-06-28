import { useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import { useSocketStore } from "@/store/socketStore";

export function useSocket() {
  const { token } = useAuthStore();
  const { socket, setSocket, setOnlineUsers, setTyping } = useSocketStore();

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
