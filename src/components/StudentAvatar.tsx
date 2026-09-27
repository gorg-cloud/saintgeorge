"use client";

import React, { useState } from "react";

interface StudentAvatarProps {
  photoUrl?: string | null;
  fullName: string;
  className?: string;
  textClassName?: string;
}

export function StudentAvatar({
  photoUrl,
  fullName,
  className = "h-10 w-10 rounded-full",
  textClassName = "text-xs font-bold text-slate-600",
}: StudentAvatarProps) {
  const [error, setError] = useState(false);

  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "??";

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0 select-none ${className}`}
    >
      {photoUrl && !error ? (
        <img
          src={photoUrl}
          alt={fullName}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </div>
  );
}
