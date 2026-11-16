import { WinEntry, DidIWinData } from "../types";

export interface DailyProgressPoint {
  date: string;
  shortLabel: string;
  dayNumber: string;
  hasEntry: boolean;
  winsCount: number;
  resilienceCount: number;
  slowdownCount: number;
  dailyDelta: number;
  cumulativeGrowth: number;
  topTakeaway: string | null;
}

export function calculateStreak(entries: WinEntry[]): number {
  if (!entries || entries.length === 0) return 0;

  const uniqueDates = Array.from(
    new Set(entries.map((e) => e.date).filter(Boolean))
  ).sort().reverse();

  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const latestDate = uniqueDates[0];

  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  const checkDate = new Date(latestDate);

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedStr = checkDate.toISOString().split("T")[0];
    if (uniqueDates.includes(expectedStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function getWeeklyMirrorData(entries: WinEntry[]) {
  if (!entries || entries.length === 0) return null;

  const last7 = entries.slice(0, 7);
  if (last7.length === 0) return null;

  const userVerbatimPoints: string[] = [];
  const userTopicsSet = new Set<string>();
  const growthStories = last7.filter((e) => e.isGrowthStory);
  const resilienceSaves = last7.filter((e) => e.resiliencePoint);

  last7.forEach((entry) => {
    if (entry.win) userVerbatimPoints.push(entry.win);
    (entry.tags || []).forEach((t) => userTopicsSet.add(t));
  });

  return {
    entries: last7,
    count: last7.length,
    startDate: last7[last7.length - 1]?.date,
    endDate: last7[0]?.date,
    userVerbatimPoints,
    userTopics: Array.from(userTopicsSet),
    growthStoriesCount: growthStories.length,
    resilienceSavesCount: resilienceSaves.length,
  };
}

/**
 * Generates exact calendar days for the requested window ending today.
 * Missed days have hasEntry=false so the Progress Card renders them completely blank.
 * Also calculates cumulative growth points for the Growth Graph.
 */
export function getDailyProgressSeries(
  entries: WinEntry[],
  periodDays: number
): DailyProgressPoint[] {
  const byDate: Record<string, WinEntry[]> = {};
  entries.forEach((e) => {
    if (!e.date) return;
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  const series: DailyProgressPoint[] = [];
  let runningGrowth = 0;

  for (let offset = periodDays - 1; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const iso = d.toISOString().split("T")[0];
    const dayEntries = byDate[iso] || [];
    const hasEntry = dayEntries.length > 0;

    let winsCount = 0;
    let resilienceCount = 0;
    let slowdownCount = 0;

    dayEntries.forEach((e) => {
      if (e.category === "slowdown" || (!e.category && e.slowdownCause)) {
        slowdownCount++;
      } else if (e.category === "resilience" || (!e.category && e.resiliencePoint)) {
        resilienceCount++;
      } else {
        winsCount++;
      }
    });

    // Growth increments on active days (+1 per win/resilience, +0.5 for showing up on slowdown)
    const dailyDelta = winsCount * 1 + resilienceCount * 1 + slowdownCount * 0.5;
    runningGrowth += dailyDelta;

    const shortLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayNumber = String(d.getDate());

    series.push({
      date: iso,
      shortLabel,
      dayNumber,
      hasEntry,
      winsCount,
      resilienceCount,
      slowdownCount,
      dailyDelta,
      cumulativeGrowth: Number(runningGrowth.toFixed(1)),
      topTakeaway: dayEntries[0]?.win || null,
    });
  }

  return series;
}

export function generateDidIWinCard(
  entries: WinEntry[],
  milestone: "3-day" | "7-day" | "14-day" | "30-day" = "7-day"
): DidIWinData {
  const periodDays =
    milestone === "3-day" ? 3 : milestone === "7-day" ? 7 : milestone === "14-day" ? 14 : 30;

  const series = getDailyProgressSeries(entries, periodDays);
  const windowDates = new Set(series.map((s) => s.date));
  const targetEntries = entries.filter((e) => e.date && windowDates.has(e.date));

  const daysRecorded = series.filter((s) => s.hasEntry).length;
  const daysMissed = Math.max(0, periodDays - daysRecorded);

  const winEntries = targetEntries.filter(
    (e) => e.category === "win" || (e.isWin && !e.resiliencePoint && e.category !== "slowdown")
  );
  const wins = winEntries.map((e) => e.win).filter(Boolean).slice(0, 5);

  const resilienceCount = targetEntries.filter(
    (e) => e.category === "resilience" || (e.resiliencePoint && e.category !== "slowdown")
  ).length;

  const slowdownEntries = targetEntries.filter(
    (e) => e.category === "slowdown" || Boolean(e.slowdownCause)
  );
  const slowdowns = slowdownEntries.map((e) => e.win).filter(Boolean).slice(0, 4);
  const slowdownCauses = slowdownEntries
    .map((e) => e.slowdownCause)
    .filter((c): c is string => Boolean(c && c.trim()))
    .slice(0, 4);

  const topicCounts: Record<string, number> = {};
  targetEntries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => {
      const normalized = tag.toLowerCase().trim();
      topicCounts[normalized] = (topicCounts[normalized] || 0) + 1;
    });
  });

  const whatRepeated = Object.entries(topicCounts)
    .filter(([_, count]) => count >= 2)
    .map(([topic, count]) => `${topic} (${count} times)`)
    .slice(0, 4);

  let userOwnWordsQuote = "No reflections recorded in this period yet.";
  for (const entry of targetEntries) {
    if (entry.transcript && entry.transcript.length > 10) {
      const sentences = entry.transcript
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 12);
      if (sentences.length > 0) {
        userOwnWordsQuote = sentences[0];
        break;
      }
    }
  }

  const growthStoryCount = targetEntries.filter((e) => e.isGrowthStory).length;
  const streakCount = calculateStreak(entries);

  return {
    milestone,
    daysRecorded,
    daysMissed,
    totalDaysInPeriod: periodDays,
    wins,
    resilienceCount,
    slowdowns: slowdowns.length > 0 ? slowdowns : ["No major slowdowns recorded."],
    slowdownCauses,
    whatRepeated: whatRepeated.length > 0 ? whatRepeated : ["Keep recording to surface themes."],
    userOwnWordsQuote,
    periodLabel: `${periodDays}-Day Progress Card`,
    growthStoryCount,
    streakCount,
  };
}
