import React, { useState, useEffect, useMemo } from "react";
import { WinEntry } from "../types";
import {
  generateDidIWinCard,
  getDailyProgressSeries,
  DailyProgressPoint,
} from "../utils/sovereignMetrics";
import { Printer, Check, Award, Sparkles, Clock, TrendingUp } from "lucide-react";

interface DidIWinCardProps {
  entries: WinEntry[];
  userName?: string;
  onNavigateRecord?: () => void;
}

export default function DidIWinCard({ entries, userName, onNavigateRecord }: DidIWinCardProps) {
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

  // Compute SVG coordinates for the Growth Graph
  const graphWidth = 640;
  const graphHeight = 160;
  const padX = 24;
  const padY = 20;
  const usableW = graphWidth - padX * 2;
  const usableH = graphHeight - padY * 2;
  const maxGrowth = Math.max(3, ...dailySeries.map((d) => d.cumulativeGrowth));

  const points = dailySeries.map((d, idx) => {
    const x =
      dailySeries.length === 1
        ? padX + usableW / 2
        : padX + (idx / (dailySeries.length - 1)) * usableW;
    const y = padY + usableH - (d.cumulativeGrowth / maxGrowth) * usableH;
    return { x, y, data: d };
  });

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
      : "";

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(graphHeight - padY).toFixed(
          1
        )} L ${points[0].x.toFixed(1)} ${(graphHeight - padY).toFixed(1)} Z`
      : "";

  const activeHover = hoveredDay || dailySeries[dailySeries.length - 1] || null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-left" id="report-card-root">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#233428]/10 pb-4 print:hidden">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
            <Award className="w-3.5 h-3.5" />
            <span>Progress Card</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-[#1D241F]">Did I Win?</h2>
        </div>

        <div className="flex items-center gap-1 glass-panel p-1 rounded-xl text-xs font-mono self-start sm:self-auto">
          {(["3-day", "7-day", "14-day", "30-day"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => {
                setMilestone(cycle);
                setHoveredDay(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                milestone === cycle
                  ? "bg-[#4B6B53] text-white font-medium"
                  : "text-[#546257] hover:text-[#1D241F]"
              }`}
            >
              {cycle === "3-day" ? "3d" : cycle === "7-day" ? "7d" : cycle === "14-day" ? "14d" : "30d"}
            </button>
          ))}
        </div>
      </div>

      {/* Printable Progress Card */}
      <div id="report-card-printable" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-7">
        {/* Card Top Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#233428]/10 pb-5 gap-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
              {cardData.periodLabel}
            </span>
            <h3 className="text-2xl font-display font-bold text-[#1D241F] mt-0.5">
              Personal Progress Card
            </h3>
            <p className="text-xs font-mono text-[#546257] mt-0.5">{userName || "Builder"}</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <div>
              <span className="text-[#546257] block text-[10px] uppercase">Streak</span>
              <span className="text-base font-bold text-[#1D241F]">
                {cardData.streakCount} {cardData.streakCount === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="border-l border-[#233428]/12 pl-4">
              <span className="text-[#546257] block text-[10px] uppercase">Recorded</span>
              <span className="text-base font-bold text-[#4B6B53]">
                {cardData.daysRecorded}/{cardData.totalDaysInPeriod}
              </span>
            </div>
            <div className="border-l border-[#233428]/12 pl-4">
              <span className="text-[#546257] block text-[10px] uppercase">Missed</span>
              <span className="text-base font-bold text-[#C86F52]">{cardData.daysMissed}</span>
            </div>
          </div>
        </div>

        {/* Daily Attendance Strip: Recorded Days Filled, Missed Days Left Blank */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#546257]">
            <span className="uppercase tracking-wider">Daily Record (Missed days left blank)</span>
            <span className="hidden sm:inline">Filled = Recorded · Blank = Missed</span>
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
                  day.hasEntry ? `${day.winsCount + day.resilienceCount + day.slowdownCount} logged` : "Missed (blank)"
                }`}
                className={`h-14 rounded-xl border flex flex-col items-center justify-between py-2 px-1 transition-all cursor-pointer ${
                  day.hasEntry
                    ? "bg-[#4B6B53]/12 border-[#4B6B53]/40 text-[#1D241F]"
                    : "bg-transparent border-dashed border-[#233428]/18 text-[#546257]/60"
                }`}
              >
                <span className="text-[10px] font-mono tabular-nums">{day.dayNumber}</span>
                {day.hasEntry ? (
                  <span className="w-4 h-4 rounded-full bg-[#4B6B53] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  /* Intentionally left blank so missed days stand out clearly */
                  <span className="w-4 h-4" aria-label="Missed day" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Growth Graph */}
        <div className="rounded-2xl bg-[#F4F6F0] border border-[#233428]/10 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#4B6B53] font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>Growth Trajectory</span>
            </div>
            {activeHover && (
              <div className="text-xs font-mono text-[#546257] tabular-nums">
                {activeHover.shortLabel} ·{" "}
                {activeHover.hasEntry
                  ? `Score ${activeHover.cumulativeGrowth} (${activeHover.winsCount}W / ${activeHover.resilienceCount}H / ${activeHover.slowdownCount}S)`
                  : "Blank (No entry)"}
              </div>
            )}
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className="w-full h-36 sm:h-40 overflow-visible"
              role="img"
              aria-label="Cumulative Growth Graph"
            >
              <defs>
                <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4B6B53" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#4B6B53" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Subtle horizontal reference lines */}
              {[0.25, 0.5, 0.75, 1].map((frac) => {
                const y = padY + usableH * (1 - frac);
                return (
                  <line
                    key={frac}
                    x1={padX}
                    y1={y}
                    x2={graphWidth - padX}
                    y2={y}
                    stroke="rgba(35, 52, 40, 0.08)"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* Baseline */}
              <line
                x1={padX}
                y1={graphHeight - padY}
                x2={graphWidth - padX}
                y2={graphHeight - padY}
                stroke="rgba(35, 52, 40, 0.16)"
              />

              {/* Area + Line */}
              {areaPath && <path d={areaPath} fill="url(#growthAreaGrad)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#4B6B53"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Nodes: Solid sage on recorded days, hollow blank circle on missed days */}
              {points.map((pt) => (
                <g
                  key={pt.data.date}
                  onMouseEnter={() => setHoveredDay(pt.data)}
                  className="cursor-pointer"
                >
                  <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                  {pt.data.hasEntry ? (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={activeHover?.date === pt.data.date ? 5 : 3.8}
                      fill="#4B6B53"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  ) : (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={3}
                      fill="#F4F6F0"
                      stroke="rgba(84, 98, 87, 0.4)"
                      strokeWidth="1.2"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#546257] pt-1">
            <span>{dailySeries[0]?.shortLabel}</span>
            <span>{dailySeries[Math.floor(dailySeries.length / 2)]?.shortLabel}</span>
            <span>{dailySeries[dailySeries.length - 1]?.shortLabel}</span>
          </div>
        </div>

        {/* Wins Summary */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#546257] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4B6B53]" />
            <span>Wins ({cardData.wins.length})</span>
          </h4>
          {cardData.wins.length === 0 ? (
            <div className="rounded-xl bg-[#F4F6F0] border border-[#233428]/10 p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#546257]">No wins logged in this window yet.</p>
              {onNavigateRecord && (
                <button
                  type="button"
                  onClick={onNavigateRecord}
                  className="btn-sage px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0"
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
                  className="rounded-xl bg-[#F4F6F0] border border-[#233428]/10 px-4 py-2.5 text-sm text-[#1D241F]"
                >
                  {win}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slowdowns */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#546257] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C86F52]" />
            <span>Slowdowns</span>
          </h4>
          {cardData.slowdowns.length === 0 || cardData.slowdowns[0] === "No major slowdowns recorded." ? (
            <p className="text-xs text-[#546257]">No major slowdowns recorded for this period.</p>
          ) : (
            <div className="space-y-2">
              {cardData.slowdowns.map((slowdown, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-[#C86F52]/10 border border-[#C86F52]/25 p-3 text-xs space-y-1"
                >
                  <p className="text-[#1D241F] font-medium">{slowdown}</p>
                  {cardData.slowdownCauses[idx] && (
                    <p className="text-[#C86F52]">Cause: {cardData.slowdownCauses[idx]}</p>
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
          className="btn-sage min-h-[40px] px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>
    </div>
  );
}
