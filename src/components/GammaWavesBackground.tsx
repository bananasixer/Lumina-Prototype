import React from "react";
import { motion } from "motion/react";

interface GammaWavesBackgroundProps {
  isActive?: boolean;
}

export default function GammaWavesBackground({ isActive = false }: GammaWavesBackgroundProps) {
  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0"
      id="gamma-waves-bg"
      aria-hidden="true"
    >
      {/* Gentle earthy sage ambient glow */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.08, 1] : [1, 1.03, 1],
          opacity: isActive ? [0.45, 0.65, 0.45] : [0.28, 0.38, 0.28],
        }}
        transition={{ duration: isActive ? 2.8 : 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full bg-[#4B6B53]/10 blur-[80px]"
      />

      <motion.div
        animate={{
          scale: isActive ? [1, 1.1, 1] : [1, 1.04, 1],
          opacity: isActive ? [0.35, 0.55, 0.35] : [0.22, 0.32, 0.22],
        }}
        transition={{ duration: isActive ? 2.4 : 11, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-8%] w-[460px] h-[460px] rounded-full bg-[#C86F52]/10 blur-[90px]"
      />

      {/* Wave 1: Primary Sage Acoustic Wave */}
      <svg
        className="absolute top-[16%] left-0 w-[200%] h-28 text-[#4B6B53]"
        style={{ opacity: isActive ? 0.2 : 0.11 }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,60 C 120,24 240,96 360,60 C 480,24 600,96 720,60 C 840,24 960,96 1080,60 C 1200,24 1320,96 1440,60"
          fill="none"
          stroke="currentColor"
          strokeWidth={isActive ? "2" : "1.5"}
          animate={{
            d: [
              "M 0,60 C 120,24 240,96 360,60 C 480,24 600,96 720,60 C 840,24 960,96 1080,60 C 1200,24 1320,96 1440,60",
              "M 0,60 C 120,96 240,24 360,60 C 480,96 600,24 720,60 C 840,96 960,24 1080,60 C 1200,96 1320,24 1440,60",
              "M 0,60 C 120,24 240,96 360,60 C 480,24 600,96 720,60 C 840,24 960,96 1080,60 C 1200,24 1320,96 1440,60",
            ],
            x: [0, -720],
          }}
          transition={{
            d: { duration: isActive ? 3.5 : 8, repeat: Infinity, ease: "easeInOut" },
            x: { duration: isActive ? 14 : 28, repeat: Infinity, ease: "linear" },
          }}
        />
      </svg>

      {/* Wave 2: Secondary Fine Earthy Wave */}
      <svg
        className="absolute top-[46%] left-0 w-[200%] h-24 text-[#4B6B53]"
        style={{ opacity: isActive ? 0.16 : 0.08 }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,55 C 180,95 360,15 540,55 C 720,95 900,15 1080,55 C 1260,95 1440,15 1620,55"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          animate={{ x: [0, -720] }}
          transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* Wave 3: Warm Terracotta Harmonic Curve */}
      <svg
        className="absolute bottom-[16%] left-0 w-[200%] h-28 text-[#C86F52]"
        style={{ opacity: isActive ? 0.18 : 0.09 }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,65 C 240,102 480,28 720,65 C 960,102 1200,28 1440,65 C 1680,102 1920,28 2160,65"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          animate={{ x: [0, -720] }}
          transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
}
