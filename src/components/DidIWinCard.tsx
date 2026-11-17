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
              <span className="text-[#86868B] block text-[11px]">Streak</span>
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

        {/* Daily Attendance Strip: Recorded Days Filled, Missed Days Left Blank */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#515154]">
            <span className="font-medium text-[#1D1D1F]">
              Daily Record (Missed days left blank)
            </span>
            <span className="hidden sm:inline text-[#86868B]">Filled = Recorded · Blank = Missed</span>
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
                    ? `${day.winsCount + day.resilienceCount + day.slowdownCount} logged`
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

        {/* Growth Graph (Teal -> Royal Blue -> Terracotta Curve) */}
        <div className="rounded-[16px] apple-well p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F8B8D]">
              <TrendingUp className="w-4 h-4 text-[#0F8B8D]" />
              <span>Growth Trajectory</span>
            </div>
            {activeHover && (
              <div className="text-xs font-mono text-[#515154] tabular-nums">
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
                <linearGradient id="growthLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0F8B8D" />
                  <stop offset="60%" stopColor="#0055FF" />
                  <stop offset="100%" stopColor="#C86D44" />
                </linearGradient>
                <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F8B8D" stopOpacity="0.22" />
                  <stop offset="65%" stopColor="#0055FF" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#0F8B8D" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0.25, 0.5, 0.75, 1].map((frac) => {
                const y = padY + usableH * (1 - frac);
                return (
                  <line
                    key={frac}
                    x1={padX}
                    y1={y}
                    x2={graphWidth - padX}
                    y2={y}
                    stroke="rgba(15, 139, 141, 0.14)"
                    strokeDasharray="3 3"
                  />
                );
              })}

              <line
                x1={padX}
                y1={graphHeight - padY}
                x2={graphWidth - padX}
                y2={graphHeight - padY}
                stroke="rgba(15, 139, 141, 0.24)"
              />

              {areaPath && <path d={areaPath} fill="url(#growthAreaGrad)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#growthLineGrad)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((pt, idx) => (
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
                      r={activeHover?.date === pt.data.date ? 5.2 : 3.8}
                      fill={idx % 2 === 0 ? "#0F8B8D" : "#0055FF"}
                      stroke="#FFFFFF"
                      strokeWidth="1.6"
                    />
                  ) : (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={3}
                      fill="#EDF7F6"
                      stroke="rgba(15, 139, 141, 0.35)"
                      strokeWidth="1.2"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#86868B] pt-1">
            <span>{dailySeries[0]?.shortLabel}</span>
            <span>{dailySeries[Math.floor(dailySeries.length / 2)]?.shortLabel}</span>
            <span>{dailySeries[dailySeries.length - 1]?.shortLabel}</span>
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
          {cardData.slowdowns.length === 0 || cardData.slowdowns[0] === "No major slowdowns recorded." ? (
            <p className="text-xs text-[#86868B]">No major slowdowns recorded for this period.</p>
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
