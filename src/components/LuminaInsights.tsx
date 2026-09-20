import React, { useMemo, useState } from "react";
import { WinEntry, UserSession } from "../types";
import { 
  Calendar, 
  Activity, 
  Eye, 
  EyeOff, 
  FileText, 
  Sparkles, 
  Compass, 
  CheckCircle2, 
  Quote, 
  Award, 
  Clock 
} from "lucide-react";
import { motion } from "motion/react";
import { getWeeklyMirrorData } from "../utils/sovereignMetrics";

interface LuminaInsightsProps {
  entries: WinEntry[];
  user: UserSession;
}

export default function LuminaInsights({ entries, user }: LuminaInsightsProps) {
  const [showObservations, setShowObservations] = useState(true);

  // 1. Weekly Mirror: Strictly reflect back only what the user already said that week
  const weeklyMirror = useMemo(() => {
    return getWeeklyMirrorData(entries);
  }, [entries]);

  // 2. Pattern Watch: Multi-day repeating patterns ONLY (never off a single day)
  const patternWatch = useMemo(() => {
    const observations: { title: string; count: number; description: string; notes: string }[] = [];

    if (!entries || entries.length < 2) {
      return {
        observations: [],
        hasMultipleEntries: false
      };
    }

    // Check occurrences across distinct check-in days
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
        combined.includes("browse") ||
        combined.includes("youtube") ||
        combined.includes("reddit")
      ) {
        distractionDays++;
      }

      if (
        combined.includes("avoid") ||
        combined.includes("put off") ||
        combined.includes("postpone") ||
        combined.includes("procrastinat") ||
        combined.includes("delay") ||
        combined.includes("hesitat")
      ) {
        postponementDays++;
      }

      if (
        combined.includes("busywork") ||
        combined.includes("trivial") ||
        combined.includes("rabbit hole") ||
        combined.includes("tangent")
      ) {
        busyworkDays++;
      }

      if (
        combined.includes("exhaust") ||
        combined.includes("burned out") ||
        combined.includes("late night") ||
        combined.includes("sleep") ||
        combined.includes("drained")
      ) {
        fatigueDays++;
      }
    });

    // Rule: ONLY surface observations when repeated across multiple days (>= 2)
    if (distractionDays >= 2) {
      observations.push({
        title: "Digital Distraction & Context Switching",
        count: distractionDays,
        description: `Mentioned on ${distractionDays} separate check-in days.`,
        notes: "Navigating away during friction points or high-focus blocks was noted across several sessions."
      });
    }

    if (postponementDays >= 2) {
      observations.push({
        title: "Task Postponement on High-Friction Items",
        count: postponementDays,
        description: `Mentioned on ${postponementDays} separate check-in days.`,
        notes: "Challenging tasks or hard conversations were postponed until later in the daily cycle."
      });
    }

    if (busyworkDays >= 2) {
      observations.push({
        title: "Tangent / Secondary Tasks Prioritization",
        count: busyworkDays,
        description: `Mentioned on ${busyworkDays} separate check-in days.`,
        notes: "Secondary formatting or auxiliary items occupied focus windows before primary goals."
      });
    }

    if (fatigueDays >= 2) {
      observations.push({
        title: "Energy & Recovery Depletion",
        count: fatigueDays,
        description: `Mentioned on ${fatigueDays} separate check-in days.`,
        notes: "Fatigue or sleep strain appeared repeatedly as a headwind against focus."
      });
    }

    return {
      observations,
      hasMultipleEntries: true
    };
  }, [entries]);

  return (
    <div className="space-y-12 max-w-3xl mx-auto text-left py-2" id="lumina-insights-root">
      
      {/* Header */}
      <div className="space-y-2 border-b border-earth-200 pb-6">
        <h2 className="text-2xl sm:text-3xl font-serif text-earth-900 font-bold tracking-tight">
          Mirror & Observations
        </h2>
        <p className="text-xs sm:text-sm text-earth-600 leading-relaxed max-w-xl">
          A quiet, non-punishing mirror reflecting back only what you spoke. No unsolicited commentary, no gamification badges, and no scolding.
        </p>
      </div>

      {/* SECTION 1: THE WEEKLY MIRROR */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sage" />
            <h3 className="text-lg font-serif text-earth-900 font-bold">
              Weekly Mirror
            </h3>
          </div>
          {weeklyMirror && (
            <span className="text-[10px] font-mono text-earth-500 uppercase tracking-wider font-semibold">
              Window: {weeklyMirror.startDate} to {weeklyMirror.endDate}
            </span>
          )}
        </div>

        {weeklyMirror ? (
          <div className="bg-white rounded-3xl border border-earth-200 p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Mirror Premise */}
            <div className="p-4 bg-earth-50 rounded-2xl border border-earth-100 text-xs text-earth-700 leading-relaxed">
              <span className="font-semibold text-earth-900 font-mono text-[10px] uppercase tracking-wider block mb-1">
                Quiet Reflection Protocol
              </span>
              Below is the exact summary of what you logged across your recent check-ins. No editorializing or judgment has been added.
            </div>

            {/* Stated Actions & Wins */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-earth-400 font-bold">
                Actions & Accomplishments You Logged ({weeklyMirror.count})
              </h4>
              <div className="space-y-2.5">
                {weeklyMirror.entries.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-3.5 bg-earth-50/70 rounded-2xl border border-earth-100 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <p className="text-xs text-earth-900 font-medium leading-relaxed">
                        "{entry.win}"
                      </p>
                      {entry.tone && (
                        <span className="text-[9px] font-mono text-earth-500 uppercase tracking-wider inline-block">
                          Tone: {entry.tone}
                        </span>
                      )}
                      {entry.isGrowthStory && (
                        <span className="text-[9px] font-mono text-sage bg-sage/10 px-2 py-0.5 rounded border border-sage/20 ml-2 font-semibold">
                          ✓ Growth Story
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-earth-400 flex-shrink-0">
                      {entry.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Topics Handled This Week */}
            {weeklyMirror.userTopics.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-earth-100">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-earth-400 font-bold">
                  Topics Stated By You
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {weeklyMirror.userTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono px-3 py-1 bg-earth-50 text-earth-800 rounded-xl border border-earth-200"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-dashed border-earth-200 p-8 text-center space-y-2">
            <p className="text-xs font-mono text-earth-500">
              Your Weekly Mirror compiles automatically once you record check-ins.
            </p>
            <p className="text-[11px] text-earth-400">
              Check in with your voice to see your quiet 7-day reflection reflected back here.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: PATTERN WATCH */}
      <div className="space-y-6 border-t border-earth-200 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-terracotta" />
              <h3 className="text-lg font-serif text-earth-900 font-bold">
                Pattern Watch
              </h3>
            </div>
            <p className="text-xs text-earth-600">
              Gentle observations about lost time or procrastination surfaced only when repeating across several check-ins.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowObservations(!showObservations)}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-mono border border-earth-200 bg-white hover:bg-earth-50 text-earth-700 flex items-center gap-1.5 transition-all cursor-pointer font-medium"
          >
            {showObservations ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-earth-400" />
                Hide Observations
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-earth-400" />
                Show Observations
              </>
            )}
          </button>
        </div>

        {showObservations && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {patternWatch.observations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patternWatch.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-white rounded-2xl border border-earth-200 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-serif font-bold text-earth-900">
                        {obs.title}
                      </h4>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-terracotta/10 text-terracotta border border-terracotta/20 font-bold">
                        {obs.count} check-ins
                      </span>
                    </div>
                    <p className="text-xs text-earth-600 leading-relaxed">
                      {obs.notes}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-earth-50 rounded-2xl border border-earth-200/80 text-center space-y-1">
                <p className="text-xs font-mono text-earth-700 font-medium">
                  {entries.length < 2
                    ? "Lumina requires at least 2 distinct check-in days to evaluate repeating patterns."
                    : "No multi-day friction patterns detected."}
                </p>
                <p className="text-[11px] text-earth-500 max-w-md mx-auto leading-relaxed">
                  Lumina adheres to a strict principle: when uncertain whether entries connect, we default to staying silent rather than guessing wrong or scolding.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

    </div>
  );
}
