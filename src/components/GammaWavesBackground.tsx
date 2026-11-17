import React from "react";
import { motion } from "motion/react";

interface GammaWavesBackgroundProps {
  isActive?: boolean;
}

export default function GammaWavesBackground({ isActive = false }: GammaWavesBackgroundProps) {
  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0 bg-[#FFFFFF]"
      id="gamma-waves-bg"
      aria-hidden="true"
    >
      {/* Atmospheric multi-stop wash blending Teal, Royal Blue, and Terracotta whisper into crisp white */}
      <div
        className="absolute inset-x-0 top-0 h-[620px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(15, 139, 141, 0.09) 0%, rgba(0, 85, 255, 0.05) 45%, rgba(200, 109, 68, 0.04) 78%, rgba(255, 255, 255, 0) 100%)",
        }}
      />

      {/* Architectural vertical light bands alternating evenly: Teal -> Royal Blue -> Terracotta */}
      <div className="absolute inset-x-0 top-0 h-[640px] max-w-6xl mx-auto grid grid-cols-6 gap-4 px-6 opacity-95">
        {Array.from({ length: 6 }).map((_, idx) => {
          const tint =
            idx % 3 === 0
              ? "linear-gradient(180deg, rgba(15, 139, 141, 0.075) 0%, rgba(255, 255, 255, 0) 100%)"
              : idx % 3 === 1
              ? "linear-gradient(180deg, rgba(0, 85, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)"
              : "linear-gradient(180deg, rgba(200, 109, 68, 0.045) 0%, rgba(255, 255, 255, 0) 100%)";

          return (
            <div
              key={idx}
              className="h-full border-x"
              style={{
                borderColor: "rgba(15, 139, 141, 0.075)",
                background: tint,
              }}
            />
          );
        })}
      </div>

      {/* Layered luminous ambient spheres across Teal, Royal Blue, and Terracotta */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.08, 1] : [1, 1.04, 1],
          x: [0, 14, 0],
          y: [0, 10, 0],
          opacity: isActive ? [0.58, 0.82, 0.58] : [0.42, 0.56, 0.42],
        }}
        transition={{ duration: isActive ? 3.5 : 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-28 -left-20 w-[460px] h-[460px] rounded-full bg-[#0F8B8D]/[0.15] blur-[95px]"
      />

      <motion.div
        animate={{
          scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
          x: [0, -16, 0],
          y: [0, 14, 0],
          opacity: isActive ? [0.52, 0.74, 0.52] : [0.35, 0.48, 0.35],
        }}
        transition={{ duration: isActive ? 2.8 : 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] right-[-10%] w-[440px] h-[440px] rounded-full bg-[#0055FF]/[0.11] blur-[100px]"
      />

      <motion.div
        animate={{
          scale: isActive ? [1, 1.07, 1] : [1, 1.04, 1],
          x: [0, 12, 0],
          y: [0, -10, 0],
          opacity: isActive ? [0.46, 0.68, 0.46] : [0.32, 0.44, 0.32],
        }}
        transition={{ duration: isActive ? 3.6 : 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-12%] left-[18%] w-[410px] h-[410px] rounded-full bg-[#C86D44]/[0.12] blur-[95px]"
      />

      <motion.div
        animate={{
          scale: isActive ? [1, 1.08, 1] : [1, 1.04, 1],
          y: [0, -14, 0],
          opacity: isActive ? [0.46, 0.66, 0.46] : [0.32, 0.46, 0.32],
        }}
        transition={{ duration: isActive ? 3.2 : 17, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[6%] right-[10%] w-[380px] h-[380px] rounded-full bg-[#40B8B3]/[0.15] blur-[90px]"
      />

      {/* Mid-canvas subtle warm ambient accent sphere */}
      <motion.div
        animate={{
          x: [0, -12, 0],
          y: [0, 12, 0],
          opacity: [0.22, 0.34, 0.22],
        }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        className="hidden sm:block absolute top-[46%] left-[42%] w-[300px] h-[300px] rounded-full bg-[#C86D44]/[0.08] blur-[85px]"
      />

      {/* Subtle rotating acoustic orbital rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 54, repeat: Infinity, ease: "linear" }}
        className="hidden md:flex items-center justify-center absolute top-[8%] right-[12%] w-64 h-64 rounded-full border border-[#0F8B8D]/[0.12]"
      >
        <div className="w-44 h-44 rounded-full border border-dashed border-[#0055FF]/[0.12]" />
      </motion.div>

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 64, repeat: Infinity, ease: "linear" }}
        className="hidden lg:flex items-center justify-center absolute bottom-[18%] left-[12%] w-52 h-52 rounded-full border border-[#C86D44]/[0.12]"
      >
        <div className="w-32 h-32 rounded-full border border-[#0F8B8D]/[0.11]" />
      </motion.div>

      {/* Multi-depth floating frosted glass panes */}
      <motion.div
        animate={{ y: [0, -14, 0], x: [0, 6, 0], rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:block absolute top-[14%] left-[4%] w-52 h-36 rounded-[26px] backdrop-blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(15, 139, 141, 0.1) 0%, rgba(255, 255, 255, 0.52) 100%)",
          border: "1px solid rgba(15, 139, 141, 0.18)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 12px 30px rgba(15, 139, 141, 0.05)",
        }}
      />

      <motion.div
        animate={{ y: [0, 12, 0], x: [0, -8, 0], rotate: [2, -1, 2] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="hidden sm:block absolute top-[18%] left-[38%] w-32 h-12 rounded-full backdrop-blur-md"
        style={{
          background:
            "linear-gradient(90deg, rgba(0, 85, 255, 0.07) 0%, rgba(15, 139, 141, 0.07) 100%)",
          border: "1px solid rgba(0, 85, 255, 0.14)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        }}
      />

      <motion.div
        animate={{ y: [0, 14, 0], x: [0, -6, 0], rotate: [1.5, -1.5, 1.5] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:block absolute top-[38%] right-[4%] w-56 h-40 rounded-[28px] backdrop-blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(0, 85, 255, 0.075) 0%, rgba(255, 255, 255, 0.5) 100%)",
          border: "1px solid rgba(0, 85, 255, 0.15)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 12px 32px rgba(0, 85, 255, 0.04)",
        }}
      />

      <motion.div
        animate={{ y: [0, -10, 0], x: [0, 8, 0], rotate: [-2, 1, -2] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:block absolute top-[56%] left-[3%] w-40 h-28 rounded-[22px] backdrop-blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(200, 109, 68, 0.085) 0%, rgba(255, 255, 255, 0.48) 100%)",
          border: "1px solid rgba(200, 109, 68, 0.16)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        }}
      />

      <motion.div
        animate={{ y: [0, 11, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="hidden lg:block absolute top-[26%] right-[24%] w-24 h-24 rounded-[20px] backdrop-blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(200, 109, 68, 0.075) 0%, rgba(255, 255, 255, 0.45) 100%)",
          border: "1px solid rgba(200, 109, 68, 0.15)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.78)",
        }}
      />

      <motion.div
        animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        className="hidden lg:block absolute bottom-[10%] left-[8%] w-48 h-28 rounded-[22px] backdrop-blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(15, 139, 141, 0.08) 0%, rgba(255, 255, 255, 0.48) 100%)",
          border: "1px solid rgba(15, 139, 141, 0.16)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.78)",
        }}
      />

      <motion.div
        animate={{ y: [0, 10, 0], x: [0, -10, 0], rotate: [1, -2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:block absolute bottom-[14%] right-[7%] w-44 h-32 rounded-[24px] backdrop-blur-md"
        style={{
          background:
            "linear-gradient(135deg, rgba(0, 85, 255, 0.065) 0%, rgba(15, 139, 141, 0.065) 100%)",
          border: "1px solid rgba(15, 139, 141, 0.16)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        }}
      />

      {/* Micro-Grain Paper / Noise SVG overlay at 0.025 opacity */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
        <filter id="apple-micro-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#apple-micro-grain)" />
      </svg>

      {/* Teal primary background acoustic wave 1 */}
      <svg
        className="absolute top-[20%] left-0 w-[200%] h-24 text-[#0F8B8D]"
        style={{ opacity: isActive ? 0.36 : 0.19 }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,60 C 120,24 240,96 360,60 C 480,24 600,96 720,60 C 840,24 960,96 1080,60 C 1200,24 1320,96 1440,60"
          fill="none"
          stroke="currentColor"
          strokeWidth={isActive ? "2.1" : "1.5"}
          animate={{
            d: [
              "M 0,60 C 120,24 240,96 360,60 C 480,24 600,96 720,60 C 840,24 960,96 1080,60 C 1200,24 1320,96 1440,60",
              "M 0,60 C 120,96 240,24 360,60 C 480,96 600,24 720,60 C 840,96 960,24 1080,60 C 1200,96 1320,24 1440,60",
              "M 0,60 C 120,24 240,96 360,60 C 480,24 600,96 720,60 C 840,24 960,96 1080,60 C 1200,24 1320,96 1440,60",
            ],
            x: [0, -720],
          }}
          transition={{
            d: { duration: isActive ? 3.2 : 9, repeat: Infinity, ease: "easeInOut" },
            x: { duration: isActive ? 14 : 30, repeat: Infinity, ease: "linear" },
          }}
        />
      </svg>

      {/* Deep Royal Blue acoustic wave 2 */}
      <svg
        className="absolute top-[52%] left-0 w-[200%] h-24 text-[#0055FF]"
        style={{ opacity: isActive ? 0.3 : 0.14 }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,55 C 180,95 360,15 540,55 C 720,95 900,15 1080,55 C 1260,95 1440,15 1620,55"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          animate={{ x: [0, -720] }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* Warm Terracotta acoustic wave 3 */}
      <svg
        className="absolute bottom-[15%] left-0 w-[200%] h-24 text-[#C86D44]"
        style={{ opacity: isActive ? 0.28 : 0.13 }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,65 C 240,102 480,28 720,65 C 960,102 1200,28 1440,65 C 1680,102 1920,28 2160,65"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          animate={{ x: [0, -720] }}
          transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
        />
      </svg>
    </div>
  );
}
