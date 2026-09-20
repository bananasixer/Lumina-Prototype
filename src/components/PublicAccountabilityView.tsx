import React from "react";
import { ShieldCheck, Flame, Lock, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

interface PublicAccountabilityViewProps {
  userName: string;
  streakCount: number;
  totalCheckins: number;
  onClose: () => void;
}

export default function PublicAccountabilityView({
  userName,
  streakCount,
  totalCheckins,
  onClose
}: PublicAccountabilityViewProps) {
  return (
    <div className="min-h-screen bg-earth-50 text-earth-900 font-sans flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl border border-earth-200 shadow-xl overflow-hidden text-left"
      >
        {/* Header bar */}
        <div className="bg-earth-900 text-earth-50 px-6 py-4 flex justify-between items-center border-b border-earth-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sage" />
            <span className="font-serif text-sm font-semibold tracking-tight">
              Lumina Accountability Check
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono text-earth-300 hover:text-white cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-1 text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-terracotta font-bold">
              Accountability Partner Share
            </span>
            <h2 className="text-2xl font-serif text-earth-900 font-bold">
              {userName}'s Streak
            </h2>
            <p className="text-xs text-earth-500 font-mono">
              Quiet verification of daily reflection consistency
            </p>
          </div>

          {/* Big Streak Stat */}
          <div className="p-6 bg-earth-50 rounded-2xl border border-earth-200/80 text-center space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-earth-500 font-bold block">
              Current Consecutive Streak
            </span>
            <p className="text-4xl sm:text-5xl font-serif text-earth-900 font-bold">
              {streakCount}{" "}
              <span className="text-sm font-sans font-normal text-earth-500">
                {streakCount === 1 ? "day" : "days"}
              </span>
            </p>
            <p className="text-xs text-earth-600 pt-1">
              {totalCheckins} total check-in {totalCheckins === 1 ? "session" : "sessions"} logged to date
            </p>
          </div>

          {/* Privacy confirmation */}
          <div className="p-4 bg-sage/5 border border-sage/20 rounded-2xl flex items-start gap-3">
            <Lock className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
            <p className="text-xs text-earth-700 leading-relaxed">
              <strong>Content Privacy Preserved:</strong> As an accountability partner, you are viewing streak consistency only. Reflective transcripts, audio recordings, and private wins are sovereign and never shared.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-earth-900 hover:bg-earth-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Enter Lumina Hub
          </button>
        </div>

        <div className="bg-earth-50 px-6 py-3 border-t border-earth-200 text-center">
          <p className="text-[9px] font-mono text-earth-400 uppercase tracking-widest">
            Protected by Lumina Sovereign Protocols • Zero Leaderboards
          </p>
        </div>
      </motion.div>
    </div>
  );
}
