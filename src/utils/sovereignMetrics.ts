import { WinEntry, DidIWinData } from "../types";

/**
 * Calculates consecutive days checked in quietly.
 * Never guilt-trips; if a day was missed, the count simply restarts.
 * No mascots, no sad faces, no punishing language.
 */
export function calculateStreak(entries: WinEntry[]): number {
  if (!entries || entries.length === 0) return 0;

  // Extract unique sorted dates (YYYY-MM-DD) descending
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

  // Must have an entry today or yesterday to have an active streak
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let checkDate = new Date(latestDate);

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

/**
 * Weekly Mirror: Reflect back ONLY what the user already said that week.
 * A quiet summary, strictly without unsolicited coaching or commentary.
 */
export function getWeeklyMirrorData(entries: WinEntry[]) {
  if (!entries || entries.length === 0) return null;

  // Group latest 7 check-ins (or entries within the last 7 calendar days)
  const last7 = entries.slice(0, 7);
  if (last7.length === 0) return null;

  // Compile user's own topics and stated actions without added commentary
  const userVerbatimPoints: string[] = [];
  const userTopicsSet = new Set<string>();
  const growthStories = last7.filter((e) => e.isGrowthStory);
  const resilienceSaves = last7.filter((e) => e.resiliencePoint);

  last7.forEach((entry) => {
    if (entry.win) {
      userVerbatimPoints.push(entry.win);
    }
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
    resilienceSavesCount: resilienceSaves.length
  };
}

/**
 * Report Card Data Generator
 * Honest accounting across 3-day, 7-day, 14-day, and 30-day windows.
 * Plain English: Days recorded, wins, hard moments pushed through,
 * and what caused you to fall back or slow down.
 */
export function generateDidIWinCard(
  entries: WinEntry[],
  milestone: "3-day" | "7-day" | "14-day" | "30-day" = "3-day"
): DidIWinData {
  const periodDays = milestone === "3-day" ? 3 : milestone === "7-day" ? 7 : milestone === "14-day" ? 14 : 30;

  // Filter entries in the window
  const targetEntries = entries.slice(0, periodDays * 2); // get entries from the period
  const uniqueDatesRecorded = new Set(targetEntries.map((e) => e.date).filter(Boolean));
  const daysRecorded = Math.min(uniqueDatesRecorded.size, periodDays);
  const daysMissed = Math.max(0, periodDays - daysRecorded);

  // 1. Wins (clear accomplishments)
  const winEntries = targetEntries.filter(e => e.category === "win" || (e.isWin && !e.resiliencePoint));
  const wins = (winEntries.length > 0 ? winEntries : targetEntries.filter(e => !e.resiliencePoint && e.category !== "slowdown"))
    .map(e => e.win)
    .filter(Boolean)
    .slice(0, 5);

  // 2. Hard Moments (resilience)
  const resilienceCount = targetEntries.filter(e => e.category === "resilience" || e.resiliencePoint).length;

  // 3. What Slowed You Down & Reasons for Falling Back
  const slowdownEntries = targetEntries.filter(e => e.category === "slowdown" || Boolean(e.slowdownCause));
  const slowdowns = slowdownEntries.map(e => e.win).filter(Boolean).slice(0, 4);
  const slowdownCauses = slowdownEntries
    .map(e => e.slowdownCause)
    .filter((c): c is string => Boolean(c && c.trim()))
    .slice(0, 4);

  // Detect repeated themes
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

  // One line in user's own words
  let userOwnWordsQuote = "I kept showing up and doing what I could.";
  for (const entry of targetEntries) {
    if (entry.transcript && entry.transcript.length > 15) {
      const sentences = entry.transcript.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
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
    wins: wins.length > 0 ? wins : ["Check-ins logged for this time window."],
    resilienceCount,
    slowdowns: slowdowns.length > 0 ? slowdowns : ["No major slowdowns recorded."],
    slowdownCauses: slowdownCauses.length > 0 ? slowdownCauses : [],
    whatRepeated: whatRepeated.length > 0 ? whatRepeated : ["Consistent check-in focus."],
    userOwnWordsQuote,
    periodLabel: `${periodDays}-Day Report Card`,
    growthStoryCount,
    streakCount
  };
}
