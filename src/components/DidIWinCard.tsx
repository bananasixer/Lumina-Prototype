import React, { useState, useEffect, useMemo } from "react";
import { WinEntry } from "../types";
import {
  generateDidIWinCard,
  getDailyProgressSeries,
  getCompoundingGrowthSeries,
  DailyProgressPoint,
} from "../utils/sovereignMetrics";
import { Printer, Check, Award, Sparkles, Clock, TrendingUp, Flame, Layers } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DidIWinCardProps {
  entries: WinEntry[];
  userName?: string;
  userCreatedAt?: number;
  onNavigateRecord?: () => void;
}

export default function DidIWinCard({
  entries,
  userName,
  userCreatedAt,
  onNavigateRecord,
}: DidIWinCardProps) {
  const getAutoMilestone = (): "3-day" | "7-day" | "14-day" | "30-day" => {
    const uniqueDays = new Set(entries.map((e) => e.date).filter(Boolean)).size;
    if (uniqueDays >= 30) return "30-day";
    if (uniqueDays >= 14) return "14-day";
    if (uniqueDays >= 7) return "7-day";
    return "7-day";
  };

  const [milestone, setMilestone] = useState<"3-day" | "7-day" | "14-day" | "30-day">(
    getAutoMilestone()
  );
  const [hoveredDay, setHoveredDay] = useState<DailyProgressPoint | null>(null);

  useEffect(() => {
    setMilestone(getAutoMilestone());
  }, [entries.length]);

  const periodDays =
    milestone === "3-day" ? 3 : milestone === "7-day" ? 7 : milestone === "14-day" ? 14 : 30;
  const cardData = useMemo(() => generateDidIWinCard(entries, milestone), [entries, milestone]);
  const dailySeries = useMemo(
    () => getDailyProgressSeries(entries, periodDays),
    [entries, periodDays]
  );
  const compoundingSeries = useMemo(
    () => getCompoundingGrowthSeries(entries, userCreatedAt),
    [entries, userCreatedAt]
  );

  const activeHover = hoveredDay;

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-left" id="report-card-root">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0F8B8D]/15 pb-4 print:hidden">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F8B8D]">
            <Award className="w-3.5 h-3.5 text-[#0F8B8D]" />
            <span>Progress Card</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-[#1D1D1F] tracking-[-0.025em]">
            Did I Win?
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[#EDF7F6] p-1 rounded-[14px] text-xs font-medium self-start sm:self-auto border border-[#0F8B8D]/15">
          {(["3-day", "7-day", "14-day", "30-day"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => {
                setMilestone(cycle);
                setHoveredDay(null);
              }}
              className={`min-h-[34px] px-3 py-1 rounded-[10px] transition-all cursor-pointer whitespace-nowrap tabular-nums ${
                milestone === cycle
                  ? "bg-[#FFFFFF] text-[#0F8B8D] font-semibold shadow-xs"
                  : "text-[#515154] hover:text-[#1D1D1F]"
              }`}
            >
              {cycle === "3-day" ? "3d" : cycle === "7-day" ? "7d" : cycle === "14-day" ? "14d" : "30d"}
            </button>
          ))}
        </div>
      </div>

      {/* Printable Progress Card */}
      <div id="report-card-printable" className="apple-card rounded-[24px] p-6 sm:p-8 space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#0F8B8D]/15 pb-5 gap-3">
          <div>
            <span className="text-xs font-semibold text-[#0F8B8D]">{cardData.periodLabel}</span>
            <h3 className="text-2xl font-display font-bold text-[#1D1D1F] tracking-[-0.02em] mt-0.5">
              Personal Progress Card
            </h3>
            <p className="text-xs text-[#86868B] mt-0.5">{userName || "Builder"}</p>
          </div>

          <div className="flex items-center gap-4 text-xs tabular-nums">
            <div>
              <span className="text-[#86868B] block text-[11px]">Daily Streak</span>
              <span className="text-base font-bold text-[#0055FF]">
                {cardData.streakCount} {cardData.streakCount === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="border-l border-[#0F8B8D]/20 pl-4">
              <span className="text-[#86868B] block text-[11px]">Recorded</span>
              <span className="text-base font-bold text-[#0F8B8D]">
                {cardData.daysRecorded}/{cardData.totalDaysInPeriod}
              </span>
            </div>
            <div className="border-l border-[#0F8B8D]/20 pl-4">
              <span className="text-[#86868B] block text-[11px]">Missed</span>
              <span className="text-base font-bold text-[#C86D44]">{cardData.daysMissed}</span>
            </div>
          </div>
        </div>

        {/* Dedicated Daily Streak Counter for Consecutive Win Days */}
        <div
          id="daily-streak-counter"
          className="rounded-[18px] apple-well p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#0F8B8D]/15"
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 border ${
                cardData.streakCount > 0
                  ? "bg-[#C86D44]/[0.10] border-[#C86D44]/25 text-[#C86D44]"
                  : "bg-[#FFFFFF] border-[#0F8B8D]/15 text-[#86868B]"
              }`}
            >
              <Flame className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#1E4449]">Daily Streak</span>
                {cardData.wonToday ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F8B8D]">
                    <Check className="w-3 h-3" /> Win logged today
                  </span>
                ) : null}
              </div>
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-2xl sm:text-[28px] font-display font-bold text-[#1D1D1F] leading-none">
                  {cardData.streakCount}
                </span>
                <span className="text-xs font-medium text-[#515154]">
                  consecutive {cardData.streakCount === 1 ? "day" : "days"} recording wins
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#0F8B8D]/10">
            <div className="text-left sm:text-right tabular-nums">
              <span className="block text-[11px] text-[#86868B]">Best Streak</span>
              <span className="text-sm font-semibold text-[#0055FF]">
                {cardData.bestStreak || 0} {(cardData.bestStreak || 0) === 1 ? "day" : "days"}
              </span>
            </div>
            {!cardData.wonToday && onNavigateRecord && (
              <button
                type="button"
                onClick={onNavigateRecord}
                className="btn-royal min-h-[38px] px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer shrink-0 print:hidden"
              >
                {cardData.streakCount > 0 ? "Extend Streak" : "Start Streak"}
              </button>
            )}
          </div>
        </div>

        {/* Daily Check-In: Recorded Days Checked, Missed Days Left Blank */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#515154]">
            <span className="font-medium text-[#1D1D1F]">
              Daily Check-In (Missed days stay blank)
            </span>
            <span className="hidden sm:inline text-[#86868B]">
              {activeHover
                ? `${activeHover.shortLabel}: ${
                    activeHover.hasEntry
                      ? `${activeHover.winsCount} wins · ${activeHover.resilienceCount} resilience`
                      : "Missed (0)"
                  }`
                : "Checked = Saved · Blank = Missed"}
            </span>
          </div>

          <div
            className={`grid gap-2 ${
              periodDays === 3
                ? "grid-cols-3"
                : periodDays === 7
                ? "grid-cols-7"
                : periodDays === 14
                ? "grid-cols-7"
                : "grid-cols-6 sm:grid-cols-10"
            }`}
          >
            {dailySeries.map((day) => (
              <button
                key={day.date}
                type="button"
                onMouseEnter={() => setHoveredDay(day)}
                onClick={() => setHoveredDay(day)}
                title={`${day.shortLabel}: ${
                  day.hasEntry
                    ? `${day.winsCount + day.resilienceCount + day.slowdownCount} saved`
                    : "Missed (blank)"
                }`}
                className={`h-14 rounded-[14px] border flex flex-col items-center justify-between py-2 px-1 transition-all cursor-pointer ${
                  day.hasEntry
                    ? "bg-[#EDF7F6] border-[#0F8B8D]/30 text-[#1D1D1F]"
                    : "bg-transparent border-dashed border-[#0F8B8D]/20 text-[#86868B]"
                }`}
              >
                <span className="text-[11px] font-mono tabular-nums">{day.dayNumber}</span>
                {day.hasEntry ? (
                  <span className="w-4 h-4 rounded-full bg-[#0F8B8D] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span className="w-4 h-4" aria-label="Missed day" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chart 1: Recharts Line Graph - Sentiment, Wins & Resilience Points */}
        <div
          id="sentiment-trend-chart"
          className="rounded-[16px] apple-well p-4 sm:p-5 space-y-3"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F8B8D]">
              <TrendingUp className="w-4 h-4 text-[#0F8B8D]" />
              <span>Sentiment, Wins &amp; Resilience Trend</span>
            </div>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              Spikes on days you record · Returns to 0 when you skip a day
            </p>
          </div>

          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={dailySeries} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 139, 141, 0.14)" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fill: "#86868B", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(15, 139, 141, 0.2)" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  tick={{ fill: "#86868B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const point = payload[0].payload as DailyProgressPoint;
                    return (
                      <div className="rounded-[12px] bg-[#FFFFFF] border border-[#0F8B8D]/20 shadow-md px-3.5 py-2.5 text-xs space-y-1">
                        <div className="font-semibold text-[#1D1D1F]">{point.shortLabel}</div>
                        {point.hasEntry ? (
                          <div className="space-y-0.5 tabular-nums">
                            <div className="text-[#0055FF] font-medium">Wins: {point.winsCount}</div>
                            <div className="text-[#0F8B8D] font-medium">
                              Resilience Points: {point.resilienceCount}
                            </div>
                            <div className="text-[#C86D44] font-medium">
                              Sentiment: {point.sentimentScore} / 5
                            </div>
                          </div>
                        ) : (
                          <div className="text-[#86868B]">No entry (0)</div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="winsCount"
                  name="Wins"
                  stroke="#0055FF"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: "#0055FF", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="resilienceCount"
                  name="Resilience Points"
                  stroke="#0F8B8D"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: "#0F8B8D", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="sentimentScore"
                  name="Sentiment"
                  stroke="#C86D44"
                  strokeWidth={2.2}
                  dot={{ r: 3, fill: "#C86D44", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Recharts Solid Line Graph - Compounding Growth Over Time */}
        <div
          id="compounding-growth-chart"
          className="rounded-[16px] apple-well p-4 sm:p-5 space-y-3"
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0055FF]">
              <Layers className="w-4 h-4 text-[#0055FF]" />
              <span>Compounding Growth Over Time</span>
            </div>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              Starts from your signup day · Moves upward only on days you add entries
            </p>
          </div>

          <div className="w-full h-[210px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={compoundingSeries} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 139, 141, 0.14)" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: "#86868B", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(15, 139, 141, 0.2)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#86868B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="rounded-[12px] bg-[#FFFFFF] border border-[#0F8B8D]/20 shadow-md px-3.5 py-2.5 text-xs space-y-1">
                        <div className="font-semibold text-[#1D1D1F]">{p.monthLabel}</div>
                        <div className="space-y-0.5 tabular-nums">
                          <div className="text-[#0F8B8D] font-medium">
                            Compounded Growth: {p.compoundedGrowth}
                          </div>
                          <div className="text-[#515154]">Entries: {p.entriesCount}</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="compoundedGrowth"
                  name="Compounding Growth"
                  stroke="#0F8B8D"
                  strokeWidth={2.6}
                  dot={{ r: compoundingSeries.length <= 2 ? 4.5 : 3.5, fill: "#0F8B8D", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wins Summary */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-[#1E4449] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0055FF]" />
            <span>Wins ({cardData.wins.length})</span>
          </h4>
          {cardData.wins.length === 0 ? (
            <div className="rounded-[16px] apple-well p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#515154]">No wins logged in this window yet.</p>
              {onNavigateRecord && (
                <button
                  type="button"
                  onClick={onNavigateRecord}
                  className="btn-royal min-h-[38px] px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer shrink-0"
                >
                  Record Now
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {cardData.wins.map((win, idx) => (
                <div
                  key={idx}
                  className="rounded-[14px] apple-well px-4 py-3 text-sm text-[#1D1D1F]"
                >
                  {win}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slowdowns */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[#1E4449] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C86D44]" />
            <span>Slowdowns</span>
          </h4>
          {cardData.slowdowns.length === 0 ||
          cardData.slowdowns[0] === "No slowdowns logged." ||
          cardData.slowdowns[0] === "No major slowdowns recorded." ? (
            <p className="text-xs text-[#86868B]">No slowdowns logged in these days.</p>
          ) : (
            <div className="space-y-2">
              {cardData.slowdowns.map((slowdown, idx) => (
                <div
                  key={idx}
                  className="rounded-[14px] bg-[#C86D44]/[0.05] border border-[#C86D44]/20 p-3.5 text-xs space-y-1"
                >
                  <p className="text-[#1D1D1F] font-medium">{slowdown}</p>
                  {cardData.slowdownCauses[idx] && (
                    <p className="text-[#C86D44] font-medium">Cause: {cardData.slowdownCauses[idx]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-teal min-h-[44px] px-5 py-2 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>
    </div>
  );
}
