import React from "react";

interface OrthodoxCrossProps {
  className?: string;
  size?: number;
}

export function OrthodoxCross({ className = "text-amber-400", size = 28 }: OrthodoxCrossProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      style={{ width: size, height: size, minWidth: size, minHeight: size, display: "inline-block", flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Central Ring */}
      <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="5" fill="currentColor" />

      {/* Vertical Beam */}
      <rect x="47" y="8" width="6" height="84" rx="2" fill="currentColor" />

      {/* Horizontal Beam */}
      <rect x="8" y="47" width="84" height="6" rx="2" fill="currentColor" />

      {/* Top Arm Triple Points */}
      <circle cx="50" cy="8" r="4" fill="currentColor" />
      <circle cx="43" cy="11" r="3.5" fill="currentColor" />
      <circle cx="57" cy="11" r="3.5" fill="currentColor" />

      {/* Bottom Arm Triple Points */}
      <circle cx="50" cy="92" r="4" fill="currentColor" />
      <circle cx="43" cy="89" r="3.5" fill="currentColor" />
      <circle cx="57" cy="89" r="3.5" fill="currentColor" />

      {/* Left Arm Triple Points */}
      <circle cx="8" cy="50" r="4" fill="currentColor" />
      <circle cx="11" cy="43" r="3.5" fill="currentColor" />
      <circle cx="11" cy="57" r="3.5" fill="currentColor" />

      {/* Right Arm Triple Points */}
      <circle cx="92" cy="50" r="4" fill="currentColor" />
      <circle cx="89" cy="43" r="3.5" fill="currentColor" />
      <circle cx="89" cy="57" r="3.5" fill="currentColor" />

      {/* 4 Diagonal rays */}
      <line x1="26" y1="26" x2="36" y2="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="74" y1="26" x2="64" y2="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="26" y1="74" x2="36" y2="64" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="74" y1="74" x2="64" y2="64" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
