import React from "react";
import { motion } from "motion/react";

export default function GammaWavesBackground() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0" id="gamma-waves-bg">
      {/* Wave 1: Sage High Frequency Gamma wave */}
      <svg
        className="absolute top-[12%] left-0 w-[200%] h-32 opacity-[0.08] text-sage"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,60 C 120,20 240,100 360,60 C 480,20 600,100 720,60 C 840,20 960,100 1080,60 C 1200,20 1320,100 1440,60 L 1440,120 L 0,120 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          animate={{
            d: [
              "M 0,60 C 120,20 240,100 360,60 C 480,20 600,100 720,60 C 840,20 960,100 1080,60 C 1200,20 1320,100 1440,60 L 1440,120 L 0,120 Z",
              "M 0,60 C 120,100 240,20 360,60 C 480,100 600,20 720,60 C 840,100 960,20 1080,60 C 1200,100 1320,20 1440,60 L 1440,120 L 0,120 Z",
              "M 0,60 C 120,20 240,100 360,60 C 480,20 600,100 720,60 C 840,20 960,100 1080,60 C 1200,20 1320,100 1440,60 L 1440,120 L 0,120 Z"
            ],
            x: [0, -720]
          }}
          transition={{
            d: { duration: 9, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 30, repeat: Infinity, ease: "linear" }
          }}
        />
      </svg>

      {/* Wave 2: Earthy Green Medium Wave */}
      <svg
        className="absolute top-[40%] left-0 w-[200%] h-32 opacity-[0.06] text-sage/80"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,50 C 180,90 360,10 540,50 C 720,90 900,10 1080,50 C 1260,90 1440,10 1620,50 C 1800,90 1980,10 2160,50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          animate={{
            d: [
              "M 0,50 C 180,90 360,10 540,50 C 720,90 900,10 1080,50 C 1260,90 1440,10 1620,50 C 1800,90 1980,10 2160,50",
              "M 0,50 C 180,10 360,90 540,50 C 720,10 900,90 1080,50 C 1260,10 1440,90 1620,50 C 1800,10 1980,90 2160,50",
              "M 0,50 C 180,90 360,10 540,50 C 720,90 900,10 1080,50 C 1260,90 1440,10 1620,50 C 1800,90 1980,10 2160,50"
            ],
            x: [0, -720]
          }}
          transition={{
            d: { duration: 12, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 40, repeat: Infinity, ease: "linear" }
          }}
        />
      </svg>

      {/* Wave 3: Double-Frequency Premium Sound Wave line */}
      <svg
        className="absolute top-[68%] left-0 w-[200%] h-24 opacity-[0.04] text-sage/60"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,60 Q 90,100 180,60 T 360,60 T 540,60 T 720,60 T 900,60 T 1080,60 T 1260,60 T 1440,60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          animate={{
            x: [0, -720]
          }}
          transition={{
            x: { duration: 25, repeat: Infinity, ease: "linear" }
          }}
        />
      </svg>

      {/* Wave 4: Gold Ochre Low Frequency Harmonic Wave */}
      <svg
        className="absolute bottom-[15%] left-0 w-[200%] h-40 opacity-[0.05] text-gold-ochre/70"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 0,70 C 240,110 480,30 720,70 C 960,110 1200,30 1440,70 C 1680,110 1920,30 2160,70"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          animate={{
            d: [
              "M 0,70 C 240,110 480,30 720,70 C 960,110 1200,30 1440,70 C 1680,110 1920,30 2160,70",
              "M 0,70 C 240,30 480,110 720,70 C 960,30 1200,110 1440,70 C 1680,30 1920,110 2160,70",
              "M 0,70 C 240,110 480,30 720,70 C 960,110 1200,30 1440,70 C 1680,110 1920,30 2160,70"
            ],
            x: [0, -720]
          }}
          transition={{
            d: { duration: 16, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 50, repeat: Infinity, ease: "linear" }
          }}
        />
      </svg>

      {/* Subtle floating particle lights indicating focus */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            y: [0, -15, 0],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-sage/40"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            opacity: [0.2, 0.6, 0.2]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-[30%] right-[20%] w-2.5 h-2.5 rounded-full bg-sage/30"
        />
        <motion.div
          animate={{
            y: [0, -25, 0],
            opacity: [0.15, 0.5, 0.15]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-[55%] right-[35%] w-2 h-2 rounded-full bg-gold-ochre/30"
        />
      </div>
    </div>
  );
}
