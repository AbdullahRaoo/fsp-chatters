"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSocket } from "@/hooks/useSocket";
import Sidebar from "@/components/Sidebar";

function SocketInitializer() {
  useSocket();
  return null;
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, isInitialized, initialize } = useAuthStore();

  // A conversation is open when the path goes deeper than "/chat".
  // On mobile we show either the sidebar OR the conversation, never both.
  const inConversation = pathname !== "/chat" && pathname.startsWith("/chat/");

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized && !token) {
      router.replace("/login");
    }
  }, [isInitialized, token, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <SocketInitializer />
      <div className={`${inConversation ? "hidden md:flex" : "flex"} shrink-0`}>
        <Sidebar />
      </div>
      <main
        className={`${
          inConversation ? "flex" : "hidden md:flex"
        } flex-1 min-w-0 flex-col overflow-hidden`}
      >
        {children}
      </main>
    </div>
  );
}
