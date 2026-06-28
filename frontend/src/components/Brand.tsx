"use client";

import Image from "next/image";

const RATIO = 141 / 49; // intrinsic logo aspect ratio

interface Props {
  height?: number;
  showText?: boolean;
  className?: string;
}

export default function Brand({ height = 28, showText = false, className = "" }: Props) {
  const width = Math.round(height * RATIO);
  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl bg-gray-900 px-3 py-2 ring-1 ring-white/10 shadow-sm ${className}`}
    >
      <Image
        src="/FS-Pro-logo.webp"
        alt="FSP Chatters logo"
        width={width}
        height={height}
        priority
      />
      {showText && (
        <span className="font-bold tracking-tight leading-none text-white">
          Chatters
        </span>
      )}
    </div>
  );
}
