import { WinEntry, DidIWinData } from "../types";

export interface DailyProgressPoint {
  date: string;
  shortLabel: string;
  dayNumber: string;
  hasEntry: boolean;
  winsCount: number;
  resilienceCount: number;
  slowdownCount: number;
  sentimentScore: number;
  dailyDelta: number;
  cumulativeGrowth: number;
  topTakeaway: string | null;
}

export interface CompoundingGrowthPoint {
  periodKey: string;
  monthLabel: string;
  entriesCount: number;
  winsAndResilienceCount: number;
  compoundedGrowth: number;
}

function stepIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  return dt.toISOString().split("T")[0];
}

export function isWinEntry(entry: WinEntry): boolean {
  return (
    entry.category === "win" ||
    (Array.isArray(entry.winsExtracted) && entry.winsExtracted.length > 0) ||
    (entry.isWin === true && !entry.resiliencePoint && entry.category !== "slowdown")
  );
}

export function calculateWinStreak(entries: WinEntry[]): {
  currentStreak: number;
  bestStreak: number;
  recordedToday: boolean;
} {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, bestStreak: 0, recordedToday: false };
  }

  const winDates = Array.from(
    new Set(entries.filter(isWinEntry).map((e) => e.date).filter(Boolean))
  ).sort();

  if (winDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, recordedToday: false };
  }

  const dateSet = new Set(winDates);
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = stepIsoDate(todayStr, -1);
  const recordedToday = dateSet.has(todayStr);

  // Compute longest historical streak of consecutive win days
  let bestStreak = 0;
  let running = 0;
  for (let i = 0; i < winDates.length; i++) {
    if (i === 0) {
      running = 1;
    } else if (winDates[i] === stepIsoDate(winDates[i - 1], 1)) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > bestStreak) bestStreak = running;
  }

  // Compute current active consecutive-day streak ending today or yesterday
  const anchor = recordedToday ? todayStr : dateSet.has(yesterdayStr) ? yesterdayStr : null;
  let currentStreak = 0;
  if (anchor) {
    let cursor = anchor;
    while (dateSet.has(cursor)) {
      currentStreak += 1;
      cursor = stepIsoDate(cursor, -1);
    }
  }

  return { currentStreak, bestStreak, recordedToday };
}

export function calculateStreak(entries: WinEntry[]): number {
  if (!entries || entries.length === 0) return 0;

  const uniqueDates = Array.from(
    new Set(entries.map((e) => e.date).filter(Boolean))
  ).sort().reverse();

  if (uniqueDates.length === 0) return 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = stepIsoDate(todayStr, -1);
  const latestDate = uniqueDates[0];

  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  const dateSet = new Set(uniqueDates);
  let streak = 0;
  let cursor = latestDate;
  while (dateSet.has(cursor)) {
    streak++;
    cursor = stepIsoDate(cursor, -1);
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
  const todayStr = new Date().toISOString().split("T")[0];
  let runningGrowth = 0;

  for (let offset = periodDays - 1; offset >= 0; offset--) {
    const iso = stepIsoDate(todayStr, -offset);
    const [y, m, dayNum] = iso.split("-").map(Number);
    const d = new Date(Date.UTC(y, (m || 1) - 1, dayNum || 1));
    const dayEntries = byDate[iso] || [];
    const hasEntry = dayEntries.length > 0;

    let winsCount = 0;
    let resilienceCount = 0;
    let slowdownCount = 0;
    let sentimentSum = 0;

    dayEntries.forEach((e) => {
      const wItems = Array.isArray(e.winsExtracted) ? e.winsExtracted.length : 0;
      const hItems = Array.isArray(e.hardMomentsExtracted) ? e.hardMomentsExtracted.length : 0;
      const sItems = Array.isArray(e.slowdownsExtracted) ? e.slowdownsExtracted.length : 0;

      if (wItems > 0 || hItems > 0 || sItems > 0) {
        winsCount += wItems;
        resilienceCount += hItems;
        slowdownCount += sItems;
      } else if (e.category === "slowdown" || (!e.category && e.slowdownCause)) {
        slowdownCount++;
      } else if (e.category === "resilience" || (!e.category && e.resiliencePoint)) {
        resilienceCount++;
      } else {
        winsCount++;
      }

      // Compute clean 1..5 sentiment score for logged entries
      const base =
        e.category === "slowdown"
          ? 2.2
          : e.category === "resilience"
          ? 3.4
          : 4.3;
      const toneBonus =
        e.tone === "focused" ? 0.5 : e.tone === "steady" ? 0.3 : e.tone === "reflective" ? -0.1 : 0;
      sentimentSum += Math.min(5, Math.max(1, base + toneBonus));
    });

    const sentimentScore = hasEntry
      ? Number((sentimentSum / dayEntries.length).toFixed(1))
      : 0;

    // Spike upward on days with entries; drop straight back to 0 when the next day has no entry
    const dailyDelta = winsCount * 1 + resilienceCount * 1 + slowdownCount * 0.5;
    if (hasEntry) {
      runningGrowth = Number((runningGrowth + dailyDelta).toFixed(1));
    } else {
      runningGrowth = 0;
    }

    const shortLabel = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const dayNumber = String(d.getUTCDate());

    series.push({
      date: iso,
      shortLabel,
      dayNumber,
      hasEntry,
      winsCount,
      resilienceCount,
      slowdownCount,
      sentimentScore,
      dailyDelta,
      cumulativeGrowth: hasEntry ? runningGrowth : 0,
      topTakeaway: dayEntries[0]?.win || null,
    });
  }

  return series;
}

/**
 * Generates a compounding growth line series starting strictly from the day the user
 * signed up or logged in (never backfilling fake pre-signup months/days).
 * Only days/periods with new entries increase or compound growth; inactive periods stay flat
 * so a single entry does not keep increasing artificially.
 */
export function getCompoundingGrowthSeries(
  entries: WinEntry[],
  userCreatedAt?: number
): CompoundingGrowthPoint[] {
  const todayStr = new Date().toISOString().split("T")[0];

  const byDate: Record<string, WinEntry[]> = {};
  const validDates: string[] = [];
  entries.forEach((e) => {
    if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return;
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
    validDates.push(e.date);
  });

  validDates.sort();

  let startDateIso = todayStr;
  if (userCreatedAt && !Number.isNaN(userCreatedAt)) {
    const joinedIso = new Date(userCreatedAt).toISOString().split("T")[0];
    if (joinedIso <= todayStr) {
      startDateIso = joinedIso;
    }
  }
  if (validDates.length > 0 && validDates[0] < startDateIso) {
    startDateIso = validDates[0];
  }

  const startMs = Date.parse(`${startDateIso}T00:00:00Z`);
  const endMs = Date.parse(`${todayStr}T00:00:00Z`);
  const spanDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);

  const countEntryUnits = (entry: WinEntry): number => {
    const wItems = Array.isArray(entry.winsExtracted) ? entry.winsExtracted.length : 0;
    const hItems = Array.isArray(entry.hardMomentsExtracted) ? entry.hardMomentsExtracted.length : 0;
    const sItems = Array.isArray(entry.slowdownsExtracted) ? entry.slowdownsExtracted.length : 0;
    if (wItems > 0 || hItems > 0) return wItems + hItems;
    if (sItems > 0 || entry.category === "slowdown") return 0.5;
    return 1;
  };

  // Up to 45 days since signup: show daily progression strictly from startDateIso -> today
  if (spanDays <= 45) {
    const series: CompoundingGrowthPoint[] = [];
    let compoundedGrowth = 0;

    for (let i = 0; i < spanDays; i++) {
      const iso = stepIsoDate(startDateIso, i);
      const dayEntries = byDate[iso] || [];
      const [y, m, d] = iso.split("-").map(Number);
      const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
      const label = dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });

      let winsAndResilienceCount = 0;
      dayEntries.forEach((e) => {
        winsAndResilienceCount += countEntryUnits(e);
      });

      if (dayEntries.length > 0) {
        const gain = Number(winsAndResilienceCount.toFixed(1));
        compoundedGrowth =
          compoundedGrowth === 0
            ? gain
            : Number((compoundedGrowth * 1.12 + gain).toFixed(1));
      }
      // If dayEntries.length === 0, compoundedGrowth stays strictly unchanged (flat)

      series.push({
        periodKey: iso,
        monthLabel: label,
        entriesCount: dayEntries.length,
        winsAndResilienceCount: Number(winsAndResilienceCount.toFixed(1)),
        compoundedGrowth,
      });
    }

    return series;
  }

  // Over 45 days since signup: group by calendar months starting from startDateIso's month -> current month
  const [sy, sm] = startDateIso.split("-").map(Number);
  const [ey, em] = todayStr.split("-").map(Number);
  const totalMonths = (ey - sy) * 12 + (em - sm) + 1;

  const byMonth: Record<string, WinEntry[]> = {};
  entries.forEach((e) => {
    if (!e.date || e.date.length < 7) return;
    const ym = e.date.slice(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(e);
  });

  const series: CompoundingGrowthPoint[] = [];
  let compoundedGrowth = 0;

  for (let i = 0; i < totalMonths; i++) {
    const dt = new Date(Date.UTC(sy, (sm - 1) + i, 1));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const monthLabel = dt.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });

    const monthEntries = byMonth[monthKey] || [];
    let winsAndResilienceCount = 0;
    monthEntries.forEach((e) => {
      winsAndResilienceCount += countEntryUnits(e);
    });

    if (monthEntries.length > 0) {
      const gain = Number(winsAndResilienceCount.toFixed(1));
      compoundedGrowth =
        compoundedGrowth === 0
          ? gain
          : Number((compoundedGrowth * 1.15 + gain).toFixed(1));
    }
    // Inactive months stay flat (no automatic growth when no entries are added)

    series.push({
      periodKey: monthKey,
      monthLabel,
      entriesCount: monthEntries.length,
      winsAndResilienceCount: Number(winsAndResilienceCount.toFixed(1)),
      compoundedGrowth,
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

  let userOwnWordsQuote = "No entries saved in this time period yet.";
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
  const winStreak = calculateWinStreak(entries);

  return {
    milestone,
    daysRecorded,
    daysMissed,
    totalDaysInPeriod: periodDays,
    wins,
    resilienceCount,
    slowdowns: slowdowns.length > 0 ? slowdowns : ["No slowdowns logged."],
    slowdownCauses,
    whatRepeated: whatRepeated.length > 0 ? whatRepeated : ["Keep recording to spot patterns."],
    userOwnWordsQuote,
    periodLabel: `${periodDays}-Day Progress Card`,
    growthStoryCount,
    streakCount: winStreak.currentStreak,
    bestStreak: winStreak.bestStreak,
    wonToday: winStreak.recordedToday,
  };
}
