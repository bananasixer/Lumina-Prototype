import React from "react";

interface LuminaLogoProps {
  size?: number;
  className?: string;
}

export default function LuminaLogo({
  size = 22,
  className = "",
}: LuminaLogoProps) {
  const fontSize = size >= 26 ? "text-[19px]" : size <= 20 ? "text-[15px]" : "text-[17px]";

  return (
    <span
      className={`inline-block font-display font-bold tracking-[-0.035em] text-[#1D1D1F] leading-none select-none whitespace-nowrap shrink-0 ${fontSize} ${className}`}
    >
      Lumina
    </span>
  );
}
