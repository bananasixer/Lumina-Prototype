import React from "react";

interface LuminaLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}

export default function LuminaLogo({
  size = 30,
  className = "",
  showWordmark = true,
}: LuminaLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Soft sage botanical badge */}
        <circle cx="18" cy="18" r="16.5" fill="#EFF3EC" stroke="#4B6B53" strokeOpacity="0.28" strokeWidth="1.2" />

        {/* Rising warm light dot */}
        <circle cx="18" cy="10.5" r="2.1" fill="#C86F52" />

        {/* Flowing organic acoustic & horizon waves */}
        <path
          d="M8.5 18.5C11.2 14.5 14.5 14.5 18 18.5C21.5 22.5 24.8 22.5 27.5 18.5"
          stroke="#4B6B53"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M11 23.2C13.3 20.6 15.8 20.6 18 23.2C20.2 25.8 22.7 25.8 25 23.2"
          stroke="#4B6B53"
          strokeOpacity="0.55"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>

      {showWordmark && (
        <span className="font-display font-bold tracking-tight text-lg text-[#1D241F] leading-none">
          Lumina
        </span>
      )}
    </div>
  );
}
