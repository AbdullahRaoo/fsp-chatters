"use client";

import Link from "next/link";
import { User } from "@/types";

interface Props {
  user: User;
  isOnline: boolean;
  isActive: boolean;
  isTyping?: boolean;
}

export default function UserListItem({
  user,
  isOnline,
  isActive,
  isTyping,
}: Props) {
  return (
    <Link
      href={`/chat/${user._id}`}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "hover:bg-gray-100 text-gray-800"
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 uppercase">
          {user.name.charAt(0)}
        </div>
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{user.name}</p>
        {isTyping ? (
          <p className="text-xs text-blue-500">typing…</p>
        ) : (
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        )}
      </div>
    </Link>
  );
}
