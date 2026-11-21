export interface ExtractedCategories {
  winsExtracted: string[];
  hardMomentsExtracted: string[];
  slowdownsExtracted: string[];
}

const SLOWDOWN_TERMS = [
  "doomscroll",
  "doom scroll",
  "procrastinat",
  "scroll",
  "distract",
  "delay",
  "postpone",
  "stalled",
  "wasted",
  "waste",
  "skipped",
  "avoided",
  "avoid",
  "lazy",
  "couldn't focus",
  "could not focus",
  "lost focus",
  "lost track",
  "lost time",
  "did nothing",
  "youtube",
  "instagram",
  "tiktok",
  "reels",
  "shorts",
  "netflix",
  "binge",
  "gaming",
  "overslept",
  "slept in",
  "social media",
  "phone",
  "tangent",
  "put off",
  "putting off",
  "slacked",
  "slowed me down",
  "slowing me down",
  "slowed down",
  "susti",
  "waqt zaya",
  "nahi kiya",
  "taal diya",
  "chhor diya",
  "ضائع",
  "سستی",
  "نہیں کیا",
];

const WIN_TERMS = [
  "shipped",
  "fixed",
  "completed",
  "complete",
  "finished",
  "finish",
  "built",
  "build",
  "launched",
  "launch",
  "solved",
  "solve",
  "resolved",
  "resolve",
  "deployed",
  "deploy",
  "passed",
  "pass",
  "done",
  "won",
  "win",
  "achieved",
  "achieve",
  "learned",
  "learn",
  "studied",
  "study",
  "practiced",
  "practice",
  "wrote",
  "created",
  "improved",
  "cleaned",
  "organized",
  "worked out",
  "exercised",
  "exercise",
  "workout",
  "swam",
  "swim",
  "swimming",
  "ran",
  "run",
  "running",
  "jog",
  "jogged",
  "walked",
  "cycled",
  "football",
  "soccer",
  "basketball",
  "cricket",
  "tennis",
  "badminton",
  "gym",
  "sale",
  "sales",
  "sold",
  "earned",
  "earn",
  "client",
  "order",
  "deal",
  "revenue",
  "profit",
  "income",
  "paid",
  "scored",
  "published",
  "submitted",
  "recorded",
  "made progress",
  "wrapped up",
  "meditated",
  "focused",
  "productive",
  "helped",
  "cooked",
  "mukammal",
  "banaya",
  "theek ho",
  "kar liya",
  "seekha",
  "parha",
  "مکمل",
  "بنایا",
];

const HARD_MOMENT_TERMS = [
  "hard",
  "tough",
  "tired",
  "exhausted",
  "stress",
  "stressed",
  "stuck",
  "failed",
  "fail",
  "crash",
  "crashed",
  "difficult",
  "fatigue",
  "overwhelmed",
  "despite",
  "struggl",
  "frustrat",
  "anxious",
  "anxiety",
  "rejected",
  "rejection",
  "pressure",
  "burnout",
  "burned out",
  "headache",
  "rough",
  "pain",
  "lonely",
  "bug",
  "error",
  "sick",
  "fever",
  "worried",
  "worry",
  "problem",
  "mushkil",
  "thak",
  "masla",
  "pareshan",
  "مشکل",
  "تھک",
  "پریشان",
];

const SHORT_BOUNDARY_WORDS = new Set([
  "run",
  "ran",
  "win",
  "won",
  "gym",
  "bug",
  "sad",
  "low",
  "paid",
  "sold",
  "sale",
  "deal",
  "earn",
  "fail",
  "hard",
  "pain",
  "pass",
  "done",
  "swim",
  "swam",
  "jog",
]);

const matchesAnyTerm = (lower: string, terms: string[]): boolean => {
  return terms.some((term) => {
    if (SHORT_BOUNDARY_WORDS.has(term)) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
    }
    return lower.includes(term);
  });
};

const normalizeSegment = (seg: string) =>
  seg
    .replace(/^[\s,.\-–—•]+/, "")
    .replace(/^(?:and\s+then|and\s+also|then|and|also|plus|so)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

const capitalizeFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Splits a multi-part reflection into individual event/topic clauses and extracts
 * EVERY win, hard moment, and slowdown mentioned anywhere in the text.
 */
export function extractCategorySegments(rawText: string): ExtractedCategories {
  const clean = (rawText || "").trim();
  if (!clean) {
    return { winsExtracted: [], hardMomentsExtracted: [], slowdownsExtracted: [] };
  }

  // 1. Split first by sentence terminators and newlines
  const rawSentences = clean
    .split(/(?<=[.!?۔])\s+|\n+/)
    .map((s) => s.replace(/^[\s,.\-–—•]+/, "").trim())
    .filter(Boolean);

  // 2. Split multi-action / multi-topic spoken clauses (including "and", "and then", "but", commas)
  const segments: string[] = [];
  rawSentences.forEach((sentence) => {
    const subClauses = sentence
      .split(
        /\s*(?:;\s*|,\s+(?:and\s+then|and\s+also|and|but|however|though|although|yet|later|then|while|plus|also|so|lekin)\s+|\s+(?:but|however|although|though|while|afterwards|afterward|after\s+that|and\s+then|lekin|phir)\s+|\s+and\s+(?=(?:i\s+|we\s+|got\b|made\b|played\b|swam\b|ran\b|finished\b|wasted\b|doomscroll|scroll))|\s+then\s+(?=(?:i\s+|we\s+|played\b|swam\b|ran\b|finished\b))|,\s*(?=(?:i\s+|we\s+|getting\s+|got\s+|made\s+|doomscroll|scroll|wasted|played|swam|ran)))/i
      )
      .map((s) => capitalizeFirst(normalizeSegment(s)))
      .filter((s) => s.length >= 4);

    if (subClauses.length > 1) {
      segments.push(...subClauses);
    } else {
      segments.push(capitalizeFirst(normalizeSegment(sentence)));
    }
  });

  const winsSet = new Set<string>();
  const hardSet = new Set<string>();
  const slowSet = new Set<string>();

  segments.forEach((segment) => {
    const lower = segment.toLowerCase();

    const hasSlowdown = matchesAnyTerm(lower, SLOWDOWN_TERMS);
    const hasWin =
      matchesAnyTerm(lower, WIN_TERMS) || /\$\s*\d+/.test(lower) || /\bplayed\s+\w+/.test(lower);
    const hasHard = matchesAnyTerm(lower, HARD_MOMENT_TERMS);

    if (hasSlowdown) {
      slowSet.add(segment);
    }
    if (hasHard && !hasSlowdown) {
      hardSet.add(segment);
    }
    if (hasWin && !hasSlowdown) {
      winsSet.add(segment);
    }
  });

  // If no explicit keyword hit any bucket, treat non-empty line cleanly
  if (winsSet.size === 0 && hardSet.size === 0 && slowSet.size === 0 && segments.length > 0) {
    winsSet.add(segments[0]);
  }

  return {
    winsExtracted: Array.from(winsSet),
    hardMomentsExtracted: Array.from(hardSet),
    slowdownsExtracted: Array.from(slowSet),
  };
}
