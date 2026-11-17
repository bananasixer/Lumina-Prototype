export interface ExtractedCategories {
  winsExtracted: string[];
  hardMomentsExtracted: string[];
  slowdownsExtracted: string[];
}

const SLOWDOWN_PATTERNS = [
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
  "lost time",
  "did nothing",
  "youtube",
  "instagram",
  "tiktok",
  "reels",
  "social media",
  "phone",
  "tangent",
  "put off",
  "putting off",
  "slacked",
  "susti",
  "waqt zaya",
  "nahi kiya",
  "taal diya",
  "chhor diya",
  "ضائع",
  "سستی",
  "نہیں کیا",
];

const WIN_PATTERNS = [
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
  "published",
  "submitted",
  "recorded",
  "made progress",
  "wrapped up",
  "mukammal",
  "banaya",
  "theek ho",
  "kar liya",
  "seekha",
  "parha",
  "مکمل",
  "بنایا",
];

const HARD_MOMENT_PATTERNS = [
  "hard",
  "tough",
  "tired",
  "exhausted",
  "stress",
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
  "mushkil",
  "thak",
  "masla",
  "pareshan",
  "مشکل",
  "تھک",
  "پریشان",
];

const normalizeSegment = (seg: string) =>
  seg.replace(/^[\s,.\-–—•]+/, "").replace(/\s+/g, " ").trim();

/**
 * Splits a reflection into natural sentences/clauses and extracts ONLY the specific
 * wins, hard moments, and slowdowns mentioned in the text.
 */
export function extractCategorySegments(rawText: string): ExtractedCategories {
  const clean = (rawText || "").trim();
  if (!clean) {
    return { winsExtracted: [], hardMomentsExtracted: [], slowdownsExtracted: [] };
  }

  // Split first by sentence terminators and newlines
  const rawSentences = clean
    .split(/(?<=[.!?۔])\s+|\n+/)
    .map((s) => normalizeSegment(s))
    .filter(Boolean);

  // Split contrast or sequential multi-topic clauses only if long enough
  const segments: string[] = [];
  rawSentences.forEach((sentence) => {
    const subClauses = sentence
      .split(/\s*(?:;\s*|,\s+(?:but|however|though|although|yet|later|then|while|lekin)\s+|\s+(?:but|however|lekin)\s+)\s*/i)
      .map((s) => normalizeSegment(s))
      .filter((s) => s.length >= 4);

    if (subClauses.length > 1) {
      segments.push(...subClauses);
    } else {
      segments.push(sentence);
    }
  });

  const winsSet = new Set<string>();
  const hardSet = new Set<string>();
  const slowSet = new Set<string>();

  segments.forEach((segment) => {
    const lower = segment.toLowerCase();

    const hasSlowdown = SLOWDOWN_PATTERNS.some((p) => lower.includes(p));
    const hasWin = WIN_PATTERNS.some((p) => lower.includes(p));
    const hasHard = HARD_MOMENT_PATTERNS.some((p) => lower.includes(p));

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

  // If no explicit keyword hit any bucket, treat a non-empty entry as an honest win/log line
  if (winsSet.size === 0 && hardSet.size === 0 && slowSet.size === 0 && segments.length > 0) {
    winsSet.add(segments[0]);
  }

  return {
    winsExtracted: Array.from(winsSet),
    hardMomentsExtracted: Array.from(hardSet),
    slowdownsExtracted: Array.from(slowSet),
  };
}
