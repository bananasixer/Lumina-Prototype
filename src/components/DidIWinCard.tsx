import React, { useState, useRef, useEffect } from "react";
import { WinEntry } from "../types";
import { generateDidIWinCard } from "../utils/sovereignMetrics";
import { Printer, Quote, CheckCircle2, RotateCcw, Award, Flame, AlertCircle, Clock, Sparkles } from "lucide-react";

interface DidIWinCardProps {
  entries: WinEntry[];
  userName?: string;
  onClose?: () => void;
}

export default function DidIWinCard({ entries, userName }: DidIWinCardProps) {
  // Automatically choose milestone based on user's logged entries
  const getAutoMilestone = (): "3-day" | "7-day" | "14-day" | "30-day" => {
    const uniqueDays = new Set(entries.map(e => e.date).filter(Boolean)).size;
    if (uniqueDays >= 30) return "30-day";
    if (uniqueDays >= 14) return "14-day";
    if (uniqueDays >= 7) return "7-day";
    return "3-day";
  };

  const [milestone, setMilestone] = useState<"3-day" | "7-day" | "14-day" | "30-day">(getAutoMilestone());
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMilestone(getAutoMilestone());
  }, [entries.length]);

  const cardData = generateDidIWinCard(entries, milestone);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto text-left" id="report-card-root">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-earth-200 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-terracotta" />
            <h3 className="text-xl font-serif text-earth-900 font-bold">
              Your Report Card
            </h3>
          </div>
          <p className="text-xs text-earth-600 mt-0.5">
            Generated automatically after 3 days, 7 days, 14 days, and 30 days of check-ins.
          </p>
        </div>

        {/* Milestone Selector Tabs: 3 Days, 7 Days, 14 Days, 30 Days */}
        <div className="flex items-center gap-1 bg-earth-100 p-1 rounded-xl border border-earth-200 text-xs font-mono">
          {(["3-day", "7-day", "14-day", "30-day"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setMilestone(cycle)}
              className={`px-3 py-1.5 rounded-lg transition-all capitalize font-semibold cursor-pointer ${
                milestone === cycle
                  ? "bg-white text-earth-900 shadow-sm border border-earth-200/60"
                  : "text-earth-600 hover:text-earth-900"
              }`}
            >
              {cycle === "3-day" ? "3 Days" : cycle === "7-day" ? "7 Days" : cycle === "14-day" ? "14 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* The Printable / Exportable One-Page Card */}
      <div
        ref={cardRef}
        id="report-card-printable"
        className="bg-white rounded-3xl border border-earth-200/90 p-8 sm:p-10 shadow-lg space-y-8 print:border-none print:shadow-none print:p-4 relative overflow-hidden"
      >
        {/* Subtle decorative background accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-terracotta/[0.03] to-sage/[0.04] rounded-bl-full pointer-events-none" />

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-earth-100 pb-5 gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-terracotta font-bold">
              {cardData.periodLabel}
            </span>
            <h4 className="text-2xl font-serif text-earth-900 font-bold mt-1">
              Personal Progress Card
            </h4>
            <p className="text-xs text-earth-500 font-mono mt-0.5">
              Review for {userName || "You"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-earth-50 border border-earth-200 rounded-xl text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-earth-400 block font-bold">
                Streak
              </span>
              <span className="text-sm font-mono font-bold text-earth-900">
                {cardData.streakCount} {cardData.streakCount === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="px-3.5 py-1.5 bg-sage/5 border border-sage/20 rounded-xl text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-sage block font-bold">
                Logged
              </span>
              <span className="text-sm font-mono font-bold text-sage">
                {cardData.daysRecorded}/{cardData.totalDaysInPeriod} days
              </span>
            </div>
          </div>
        </div>

        {/* Days Logged vs Days Missed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-earth-50 rounded-2xl border border-earth-200/80 space-y-1">
            <div className="flex items-center gap-2 text-earth-700">
              <CheckCircle2 className="w-4 h-4 text-sage" />
              <span className="text-xs font-mono uppercase tracking-wider font-bold">Days Checked In</span>
            </div>
            <p className="text-3xl font-serif text-earth-900 font-bold">
              {cardData.daysRecorded}{" "}
              <span className="text-xs font-sans text-earth-500 font-normal">
                out of {cardData.totalDaysInPeriod} days
              </span>
            </p>
            <p className="text-[11px] text-earth-600 leading-relaxed pt-1">
              Days you took a minute to record what you did and how your day went.
            </p>
          </div>

          <div className="p-5 bg-earth-50 rounded-2xl border border-earth-200/80 space-y-1">
            <div className="flex items-center gap-2 text-earth-700">
              <RotateCcw className="w-4 h-4 text-earth-400" />
              <span className="text-xs font-mono uppercase tracking-wider font-bold">Days Missed</span>
            </div>
            <p className="text-3xl font-serif text-earth-900 font-bold">
              {cardData.daysMissed}{" "}
              <span className="text-xs font-sans text-earth-500 font-normal">
                {cardData.daysMissed === 1 ? "day" : "days"}
              </span>
            </p>
            <p className="text-[11px] text-earth-600 leading-relaxed pt-1">
              No guilt or bad marks. Just honest tracking so you see your real habits.
            </p>
          </div>
        </div>

        {/* Wins Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sage" />
            <h5 className="text-xs font-mono uppercase tracking-wider text-earth-700 font-bold">
              Your Wins ({cardData.wins.length})
            </h5>
          </div>
          {cardData.wins.length === 0 ? (
            <p className="text-xs text-earth-500 italic p-4 bg-earth-50 rounded-xl">
              No wins logged yet in this {cardData.totalDaysInPeriod}-day window. Record a check-in to see your wins!
            </p>
          ) : (
            <div className="space-y-2">
              {cardData.wins.map((win, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-earth-50 rounded-xl border border-earth-100 flex items-start gap-2.5"
                >
                  <span className="text-sage font-bold text-xs mt-0.5">🏆</span>
                  <p className="text-xs text-earth-900 leading-relaxed font-medium">
                    {win}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What Slowed You Down & What Caused You to Fall Back */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-terracotta" />
            <h5 className="text-xs font-mono uppercase tracking-wider text-earth-700 font-bold">
              What Slowed You Down (Procrastination & Distractions)
            </h5>
          </div>
          
          {cardData.slowdowns.length === 0 || cardData.slowdowns[0] === "No major slowdowns recorded." ? (
            <p className="text-xs text-earth-600 bg-earth-50 p-3.5 rounded-xl border border-earth-100">
              No major procrastination or slowdowns recorded for this period. Great focus!
            </p>
          ) : (
            <div className="space-y-3">
              {cardData.slowdowns.map((slowdown, idx) => (
                <div key={idx} className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-terracotta mt-0.5">⏳</span>
                    <p className="text-xs text-earth-900 font-medium leading-relaxed">
                      {slowdown}
                    </p>
                  </div>
                  {cardData.slowdownCauses[idx] && (
                    <div className="pl-5 text-xs text-amber-900/90 leading-relaxed">
                      <span className="font-semibold text-amber-950">What caused you to fall back: </span>
                      {cardData.slowdownCauses[idx]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Common Topics */}
        <div className="space-y-2">
          <h5 className="text-[10px] font-mono uppercase tracking-widest text-earth-400 font-bold">
            What Kept Coming Up
          </h5>
          <div className="flex flex-wrap gap-2">
            {cardData.whatRepeated.map((item, idx) => (
              <span
                key={idx}
                className="text-xs font-mono px-3 py-1.5 rounded-xl bg-earth-100 text-earth-800 border border-earth-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Quote in user's own words */}
        <div className="space-y-2 bg-sage/5 border border-sage/15 p-5 rounded-2xl relative">
          <Quote className="w-5 h-5 text-sage/30 absolute top-4 right-4" />
          <h5 className="text-[10px] font-mono uppercase tracking-widest text-sage font-bold">
            Something You Said
          </h5>
          <p className="text-sm font-serif italic text-earth-900 leading-relaxed">
            "{cardData.userOwnWordsQuote}"
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-earth-100 pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-earth-400 gap-2">
          <span>Lumina • Simple Daily Growth & Wins</span>
          <span>Updated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* Export / Print Actions */}
      <div className="flex items-center justify-end gap-3 print:hidden pt-2">
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2.5 bg-earth-900 hover:bg-earth-800 text-earth-50 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
