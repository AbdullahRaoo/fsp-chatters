"use client";

import Link from "next/link";
import { User } from "@/types";

interface Props {
  user: User;
  isOnline: boolean;
  isActive: boolean;
  isTyping?: boolean;
  unreadCount?: number;
}

export default function UserListItem({
  user,
  isOnline,
  isActive,
  isTyping,
  unreadCount,
}: Props) {
  return (
    <Link
      href={`/chat/${user._id}`}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
        isActive
          ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
          : "hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-800 dark:text-gray-200"
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase">
          {user.name.charAt(0)}
        </div>
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
            isOnline ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{user.name}</p>
        {isTyping ? (
          <p className="text-xs text-sky-500">typing…</p>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {user.email}
          </p>
        )}
      </div>

      {!!unreadCount && (
        <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-sky-600 text-white text-[10px] font-bold">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
