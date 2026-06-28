"use client";

import { PrivateMessage } from "@/types";

interface Props {
  message: PrivateMessage;
  isOwn: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeliveryIcon({ status }: { status: "sent" | "delivered" | "sending" }) {
  if (status === "sending") return <span className="text-blue-300/60">○</span>;
  if (status === "sent") return <span className="text-blue-300">✓</span>;
  return <span className="text-blue-200">✓✓</span>;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const isTemp = message._id.startsWith("temp-");

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}
      >
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
            isOwn
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm"
          } ${isTemp ? "opacity-70" : ""}`}
        >
          {message.content}
        </div>
        <div
          className={`flex items-center gap-1 px-1 ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <DeliveryIcon status={isTemp ? "sending" : message.deliveryStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
