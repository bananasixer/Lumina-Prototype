import React, { useMemo, useState } from "react";
import { WinEntry, UserSession } from "../types";
import { Calendar, Activity, Eye, EyeOff } from "lucide-react";
import { getWeeklyMirrorData, calculateStreak } from "../utils/sovereignMetrics";

interface LuminaInsightsProps {
  entries: WinEntry[];
  user: UserSession;
}

export default function LuminaInsights({ entries }: LuminaInsightsProps) {
  const [showObservations, setShowObservations] = useState(true);
  const streak = useMemo(() => calculateStreak(entries), [entries]);
  const weeklyMirror = useMemo(() => getWeeklyMirrorData(entries), [entries]);

  const patternWatch = useMemo(() => {
    const observations: { title: string; count: number; notes: string }[] = [];
    if (!entries || entries.length < 2) {
      return { observations: [] };
    }

    let distractionDays = 0;
    let postponementDays = 0;
    let busyworkDays = 0;
    let fatigueDays = 0;

    entries.forEach((e) => {
      const text = `${e.transcript || ""} ${e.win || ""}`.toLowerCase();
      const habits = (e.badHabits || []).join(" ").toLowerCase();
      const combined = `${text} ${habits}`;

      if (
        combined.includes("scroll") ||
        combined.includes("distract") ||
        combined.includes("phone") ||
        combined.includes("social media") ||
        combined.includes("youtube")
      ) {
        distractionDays++;
      }
      if (
        combined.includes("avoid") ||
        combined.includes("put off") ||
        combined.includes("postpone") ||
        combined.includes("procrastinat") ||
        combined.includes("delay")
      ) {
        postponementDays++;
      }
      if (combined.includes("busywork") || combined.includes("trivial") || combined.includes("tangent")) {
        busyworkDays++;
      }
      if (
        combined.includes("exhaust") ||
        combined.includes("burned out") ||
        combined.includes("late night") ||
        combined.includes("sleep") ||
        combined.includes("tired")
      ) {
        fatigueDays++;
      }
    });

    if (distractionDays >= 2) {
      observations.push({
        title: "Phone & Screen Distractions",
        count: distractionDays,
        notes: `Came up in ${distractionDays} entries.`,
      });
    }
    if (postponementDays >= 2) {
      observations.push({
        title: "Putting Off Hard Tasks",
        count: postponementDays,
        notes: `Put off a tough task on ${postponementDays} days.`,
      });
    }
    if (busyworkDays >= 2) {
      observations.push({
        title: "Small Tasks Taking Over",
        count: busyworkDays,
        notes: `Spent time on minor tasks on ${busyworkDays} days.`,
      });
    }
    if (fatigueDays >= 2) {
      observations.push({
        title: "Feeling Tired",
        count: fatigueDays,
        notes: `Low energy or poor sleep came up on ${fatigueDays} days.`,
      });
    }

    return { observations };
  }, [entries]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto text-left" id="lumina-insights-root">
      <div className="border-b border-[#0F8B8D]/15 pb-5 space-y-1">
        <span className="text-xs font-semibold text-[#0F8B8D]">Your Patterns</span>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#1D1D1F] tracking-[-0.025em]">
          Only what you shared
        </h2>
      </div>

      <div
        className="apple-card rounded-[24px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
        id="lumina-mirror-streak-module"
      >
        <div className="space-y-1">
          <span className="text-xs font-medium text-[#86868B]">Daily Streak</span>
          <div className="text-3xl font-display font-bold text-[#1D1D1F] tabular-nums">
            Day {streak}
          </div>
          <p className="text-xs text-[#515154]">
            {streak > 0
              ? `${streak} ${streak === 1 ? "day" : "days"} in a row.`
              : "Record today to start Day 1."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
            const isCompleted = streak >= dayNum;
            return (
              <div
                key={dayNum}
                className={`w-10 h-11 rounded-[12px] flex flex-col items-center justify-center text-[10px] font-mono tabular-nums border ${
                  isCompleted
                    ? "bg-[#0F8B8D] border-[#0F8B8D] text-white font-bold"
                    : "bg-transparent border-dashed border-[#0F8B8D]/25 text-[#86868B]"
                }`}
              >
                <span className="text-[9px]">D</span>
                <span className="text-xs font-bold leading-none mt-0.5">{dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold text-[#1D1D1F] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0055FF]" />
            <span>Recent Notes</span>
          </h3>
          {weeklyMirror && (
            <span className="text-xs font-mono text-[#86868B] tabular-nums">
              {weeklyMirror.startDate} – {weeklyMirror.endDate}
            </span>
          )}
        </div>

        {weeklyMirror ? (
          <div className="apple-card rounded-[24px] p-5 space-y-2.5">
            {weeklyMirror.entries.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="rounded-[16px] apple-well p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <p className="text-sm text-[#1D1D1F] font-medium">{entry.win}</p>
                  <p className="text-xs text-[#515154]">Saved in English</p>
                </div>
                <span className="text-xs font-mono text-[#86868B] shrink-0 tabular-nums">
                  {entry.date}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="apple-card rounded-[24px] p-8 text-center text-xs text-[#86868B]">
            Your recent notes will show up here once you save an entry.
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-[#0F8B8D]/15 pt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-display font-semibold text-[#1D1D1F] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C86D44]" />
            <span>Repeated Habits</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowObservations(!showObservations)}
            className="btn-secondary-apple min-h-[38px] px-3.5 py-1 rounded-full text-xs font-medium text-[#515154] hover:text-[#1D1D1F] inline-flex items-center gap-1.5 cursor-pointer"
          >
            {showObservations ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showObservations ? "Hide" : "Show"}</span>
          </button>
        </div>

        {showObservations && (
          <>
            {patternWatch.observations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patternWatch.observations.map((obs, idx) => (
                  <div key={idx} className="apple-card rounded-[20px] p-5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-display font-semibold text-[#1D1D1F]">
                        {obs.title}
                      </h4>
                      <span className="text-xs font-mono text-[#C86D44] tabular-nums font-medium">
                        {obs.count} days
                      </span>
                    </div>
                    <p className="text-xs text-[#515154] leading-relaxed">{obs.notes}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="apple-card rounded-[20px] p-6 text-center text-xs text-[#86868B]">
                {entries.length < 2
                  ? "Save at least 2 days of notes to spot repeating habits."
                  : "No repeating slowdown habits found yet."}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
