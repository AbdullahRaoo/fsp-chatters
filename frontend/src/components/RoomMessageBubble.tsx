"use client";

import { RoomMessage } from "@/types";

interface Props {
  message: RoomMessage;
  isOwn: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RoomMessageBubble({ message, isOwn }: Props) {
  const isTemp = message._id.startsWith("temp-");
  const senderName =
    typeof message.sender === "object" ? message.sender.name : "Unknown";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] flex flex-col gap-0.5 ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
        {!isOwn && (
          <span className="text-xs font-semibold text-indigo-600 px-1">
            {senderName}
          </span>
        )}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
            isOwn
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-gray-100 text-gray-900 rounded-bl-sm"
          } ${isTemp ? "opacity-70" : ""}`}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-gray-400 px-1">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
