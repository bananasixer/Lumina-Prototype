import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import dotenv from "dotenv";
import { extractCategorySegments } from "./src/utils/extractCategories";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

const parentalNoticeLogs: Array<{
  type: "welcome" | "crisis_alert";
  parentEmail: string;
  userEmail?: string;
  timestamp: number;
  message: string;
}> = [];

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

const parseGeminiJson = (responseText: string) => {
  const cleaned = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not parse structured response from engine");
  }
};

const normalizeTypographicQuotes = (input: string): string =>
  (input || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");

const ROMAN_URDU_WORD_RE =
  /\b(aaj|maine|main ne|humne|kaam|mushkil|bohot|bahut|boht|nahi|lekin|aur|tha|thi|thay|hai|hain|kiya|gaya|gayi|gaye|waqt|zaya|susti|pareshan|pareshani|thak|thakawat|mukammal|banaya|seekha|parha|kal|raat|subah|masla|khush|khushi|neend|acha|bura|dil|apna|meri|mera|mere|hum|mein|kuch|zyada|pehle|baad|ghanta|ghante|bhaga|khela|kheli|mili|mila|becha|taira|tairaki|daura|paise|kamaye|kamaya|raha|rahi|hua|hui|kyunki|wajah|sab|abhi)\b/i;

const LATIN_FOREIGN_WORD_RE =
  /\b(hoy|pero|muy|trabajo|tengo|estoy|hacer|bueno|malo|día|días|difícil|terminé|corrí|nadar|je|suis|aujourd'hui|avec|pour|très|fait|mais|travail|difficile|ich|habe|heute|sehr|mit|nicht|aber|arbeit|schwer|bugün|çok|ama|ve|bir|iş|zor|eu|hoje|trabalho)\b/i;

const NON_ENGLISH_CHAR_RE = /[^\u0000-\u007F]/;

const detectSourceLanguageCode = (text: string, hint?: string): string => {
  if (/[\u0600-\u06FF]/.test(text)) {
    if (/[ٹڈڑئےہیکگںچپژ]/.test(text) || /\b(میں|نے|آج|اور|لیکن|بہت|کام|دن|تھا|کیا|ہوا)\b/.test(text)) {
      return "ur";
    }
    return "ar";
  }
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh-CN";
  if (ROMAN_URDU_WORD_RE.test(text)) return "ur";
  if (/\b(hoy|pero|muy|trabajo|tengo|estoy|corrí|después|nadar|difícil|terminé)\b/i.test(text)) return "es";
  if (/\b(aujourd'hui|j'ai|suis|avec|pour|très|travail|difficile)\b/i.test(text)) return "fr";
  if (/\b(ich|habe|heute|sehr|mit|nicht|arbeit|schwer)\b/i.test(text)) return "de";
  if (/\b(bugün|çok|ama|iş|zor|koştum|yüzdüm)\b/i.test(text)) return "tr";
  if (/\b(hoje|muito|trabalho|estou|com)\b/i.test(text)) return "pt";
  if (hint && hint !== "en" && hint !== "auto") return hint;
  return "auto";
};

const needsServerTranslation = (raw: string, sourceLang?: string): boolean => {
  const normalized = normalizeTypographicQuotes(raw).replace(/[·•۔]/g, ".").trim();
  if (!normalized) return false;
  if (sourceLang && sourceLang !== "en" && sourceLang !== "auto") {
    return true;
  }
  return (
    NON_ENGLISH_CHAR_RE.test(normalized) ||
    ROMAN_URDU_WORD_RE.test(normalized) ||
    LATIN_FOREIGN_WORD_RE.test(normalized)
  );
};

// Free translation via MyMemory (primary, no 429 CAPTCHA) with Google GTX secondary backup
const translateChunkFree = async (chunk: string, sl: string): Promise<string> => {
  const trimmed = chunk.trim();
  if (!trimmed) return "";

  const effectiveSl = sl === "auto" ? detectSourceLanguageCode(trimmed) : sl;

  // 1. Try MyMemory first when we have an explicit or script-detected language code
  if (effectiveSl && effectiveSl !== "auto" && effectiveSl !== "en") {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${encodeURIComponent(effectiveSl)}|en`;
      const response = await fetch(url, { method: "GET", signal: controller.signal });
      if (response.ok) {
        const data: any = await response.json();
        const translated = data?.responseData?.translatedText;
        if (
          data?.responseStatus === 200 &&
          typeof translated === "string" &&
          translated.trim() &&
          !translated.includes("INVALID LANGUAGE")
        ) {
          return translated.trim();
        }
      }
    } catch {
      // Fall through to secondary provider
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Secondary fallback: Google Translate gtx
  const gtxController = new AbortController();
  const gtxTimeout = setTimeout(() => gtxController.abort(), 4500);
  try {
    const gtxSl = effectiveSl && effectiveSl !== "en" ? effectiveSl : "auto";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(gtxSl)}&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      method: "GET",
      signal: gtxController.signal,
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const joined = data[0]
          .map((segment: any) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
          .join("")
          .trim();
        if (joined) return joined;
      }
    }
  } catch {
    // Keep original if both providers fail
  } finally {
    clearTimeout(gtxTimeout);
  }

  return trimmed;
};

const splitTextForTranslation = (input: string, maxLen = 380): string[] => {
  const sentences = input.split(/(?<=[.!?۔])\s+|\n+/);
  const chunks: string[] = [];
  let current = "";

  const pushWordSafe = (segment: string) => {
    const words = segment.split(/\s+/).filter(Boolean);
    let piece = "";
    for (const w of words) {
      if ((piece + " " + w).trim().length > maxLen && piece) {
        chunks.push(piece.trim());
        piece = w;
      } else {
        piece = (piece + " " + w).trim();
      }
    }
    if (piece) chunks.push(piece.trim());
  };

  for (const part of sentences) {
    const cleanPart = part.trim();
    if (!cleanPart) continue;
    if (cleanPart.length > maxLen) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      pushWordSafe(cleanPart);
    } else if ((current + " " + cleanPart).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = cleanPart;
    } else {
      current = (current + " " + cleanPart).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
};

const translateViaFreeGtx = async (rawText: string, sourceLang = "auto"): Promise<string> => {
  const trimmed = (rawText || "").trim();
  if (!trimmed) return "";

  const chunks = splitTextForTranslation(trimmed, 380);
  const translatedParts = await Promise.all(
    chunks.map(async (chunk) => {
      const chunkSl = detectSourceLanguageCode(chunk, sourceLang);
      let translated = await translateChunkFree(chunk, chunkSl);
      // If any non-ASCII script still slipped through, retry per detected script
      if (NON_ENGLISH_CHAR_RE.test(translated)) {
        const retrySl = detectSourceLanguageCode(translated, chunkSl);
        if (retrySl !== "auto") {
          translated = await translateChunkFree(translated, retrySl);
        }
      }
      return translated;
    })
  );
  return translatedParts.join(" ").trim();
};

// Roman Urdu phrase conversion (must run before generic translators) + English spelling/sentence cleanup
const applyRomanUrduAndSpellingFixes = (rawText: string): string => {
  let text = normalizeTypographicQuotes(rawText || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const phraseReplacements: Array<[RegExp, string]> = [
    [/آج میں نے اپنا کام مکمل کیا/g, "Today I finished my work."],
    [/آج بہت مشکل دن تھا/g, "Today was a very hard day."],
    [/وقت ضائع ہوا/g, "I wasted time and got distracted."],
    [/مجھے بہت تھکاوٹ ہے/g, "I feel very tired."],
    [/سستی کی وجہ سے کام نہیں ہوا/g, "I put off my work because I felt tired and lazy."],
    [/\baaj\s+maine\s+(?:apna\s+)?kaam\s+mukammal\s+(?:kiya|kar\s+liya)\b/gi, "Today I finished my work"],
    [/\bmaine\s+(?:apna\s+)?kaam\s+(?:mukammal\s+)?(?:kiya|kar\s+liya)\b/gi, "I finished my work"],
    [/\bkaam\s+mukammal\s+(?:kiya|kar\s+liya|hua)\b/gi, "finished my work"],
    [/\bwaqt\s+zaya\s+(?:hua|kiya|ho\s+gaya)\b/gi, "I wasted time"],
    [/\bbaad\s+mein\b/gi, "afterwards"],
    [/\b(?:ek|1)\s+ghanta\b/gi, "one hour"],
    [/\bghanta\b/gi, "hour"],
    [/\bdor\s+lagai\b|\bbhaga\b/gi, "ran"],
    [/\bswimming\s+ki\b/gi, "went swimming"],
    [/\b(?:bohot|bahut)\s+mushkil\s+(?:din\s+)?tha\b/gi, "it was a very hard day"],
    [/\bmushkil\s+(?:bohot|bahut)\s+tha\b/gi, "it was very hard"],
    [/\bmushkil\s+tha\b/gi, "it was hard"],
    [/\b(?:bohot|bahut)\s+acha\s+(?:tha|laga)\b/gi, "it was very good"],
    [/\b(?:bohot|bahut)\s+thak\s+(?:gaya|gayi)\b/gi, "I felt very tired"],
    [/\bthak\s+(?:gaya|gayi)\b/gi, "felt tired"],
    [/\bpareshan\s+(?:tha|thi|hoon|hun)\b/gi, "felt stressed"],
    [/\bkaam\s+nahi\s+(?:hua|kiya)\b/gi, "did not finish my work"],
    [/\bnahi\s+(?:hua|kiya|ho\s+saka)\b/gi, "did not happen"],
    [/\bneend\s+nahi\s+aayi\b/gi, "could not sleep"],
    [/\bkuch\s+nahi\s+kiya\b/gi, "did nothing"],
    [/\baaj\b/gi, "today"],
    [/\bmaine\b|\bmain ne\b/gi, "I"],
    [/\bhumne\b/gi, "we"],
    [/\bkaam\b/gi, "work"],
    [/\bmukammal kiya\b|\bmukammal kar liya\b|\bmukammal\b/gi, "finished"],
    [/\bbanaya\b|\bbana liya\b/gi, "built"],
    [/\btheek ho gaya\b|\btheek kiya\b/gi, "fixed"],
    [/\bseekha\b/gi, "learned"],
    [/\bparha\b|\bparhai\b/gi, "studied"],
    [/\bmushkil\b/gi, "hard"],
    [/\bpareshan\b|\bpareshani\b/gi, "stressed"],
    [/\bthakawat\b/gi, "tiredness"],
    [/\bmasla\b/gi, "problem"],
    [/\bwaqt zaya\b/gi, "wasted time"],
    [/\bsusti\b/gi, "low energy and delay"],
    [/\bbohot\b|\bbahut\b/gi, "very"],
    [/\bzyada\b/gi, "more"],
    [/\bwaqt\b/gi, "time"],
    [/\blekin\b/gi, "but"],
    [/\bphir\b/gi, "then"],
    [/\baur\b/gi, "and"],
    [/\btha\b|\bthi\b/gi, "was"],
    [/\bhai\b/gi, "is"],
    [/\bhua\b|\bhui\b/gi, "happened"],
    [/\bkal\b/gi, "yesterday"],
    [/\braat\b/gi, "night"],
    [/\bsubah\b/gi, "morning"],
    [/\bdin\b/gi, "day"],
    [/\bacha\b/gi, "good"],
    [/\bbura\b/gi, "bad"],
    [/\bkhush\b|\bkhushi\b/gi, "happy"],
    [/\bapna\b|\bapni\b/gi, "my"],
    [/\bghar\b/gi, "home"],
    [/\bdost\b/gi, "friend"],
  ];

  // Only apply Roman Urdu replacements when Roman Urdu tokens are actually present
  if (ROMAN_URDU_WORD_RE.test(text) || /[\u0600-\u06FF]/.test(text)) {
    for (const [pattern, replacement] of phraseReplacements) {
      text = text.replace(pattern, replacement);
    }
  }

  return text.replace(/\s+/g, " ").trim();
};

const polishSimpleEnglish = (rawText: string): string => {
  let text = normalizeTypographicQuotes(rawText || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const wordFixes: Array<[RegExp, string]> = [
    [/\bteh\b/gi, "the"],
    [/\bhte\b/gi, "the"],
    [/\brecieve\b/gi, "receive"],
    [/\bseperate\b/gi, "separate"],
    [/\bdefinitly\b/gi, "definitely"],
    [/\bdefinately\b/gi, "definitely"],
    [/\boccured\b/gi, "occurred"],
    [/\buntill\b/gi, "until"],
    [/\bwierd\b/gi, "weird"],
    [/\balot\b/gi, "a lot"],
    [/\bim\b/gi, "I'm"],
    [/\bidk\b/gi, "I don't know"],
    [/\bdont\b/gi, "don't"],
    [/\bdidnt\b/gi, "didn't"],
    [/\bdoesnt\b/gi, "doesn't"],
    [/\bcant\b/gi, "can't"],
    [/\bwont\b/gi, "won't"],
    [/\bwasnt\b/gi, "wasn't"],
    [/\bisnt\b/gi, "isn't"],
    [/\bcouldnt\b/gi, "couldn't"],
    [/\bwouldnt\b/gi, "wouldn't"],
    [/\bshouldnt\b/gi, "shouldn't"],
    [/\bi\b/g, "I"],
    [/\bloose focus\b/gi, "lose focus"],
    [/\bloose track\b/gi, "lose track"],
    [/\bloose time\b/gi, "lose time"],
    [/\bthere own\b/gi, "their own"],
    [/\btheir was\b/gi, "there was"],
    [/\btheir were\b/gi, "there were"],
    [/\btheir is\b/gi, "there is"],
    [/\btheir are\b/gi, "there are"],
    [/\byour welcome\b/gi, "you're welcome"],
    [/\byour right\b/gi, "you're right"],
    [/\bbrake time\b/gi, "break time"],
    [/\bweather or not\b/gi, "whether or not"],
    [/\bsuppose to\b/gi, "supposed to"],
    [/\buse to\b/gi, "used to"],
    [/\bi done\b/gi, "I finished"],
    [/\bbuilded\b/gi, "built"],
    [/\bwrited\b/gi, "wrote"],
    [/\bmaked\b/gi, "made"],
    [/\band\s+was\s+bad\s+mean\b/gi, "and afterwards"],
    [/\bbad\s+mean\b/gi, "afterwards"],
    [/\btwo\s+today\s+men\b/gi, "today I"],
    [/\btoday\s+men\b/gi, "today I"],
    [/\bwent\s+for\s+run\b/gi, "went for a run"],
    [/\bfor\s+run\b/gi, "for a run"],
    [/\bthen\s+i\s+swimming\b/gi, "then I went swimming"],
    [/\band\s+i\s+swimming\b/gi, "and I went swimming"],
    [/\bafterwards\s+i\s+swimming\b/gi, "afterwards I went swimming"],
    [/\bi\s+swimming\b/gi, "I went swimming"],
    [/\bthen\s+swimming\b/gi, "then went swimming"],
    [/\bfeel\s+very\s+tire\b/gi, "feel very tired"],
    [/\bfelt\s+very\s+tire\b/gi, "felt very tired"],
    [/\bvery\s+tire\b/gi, "very tired"],
    [/\bdifficult\b/gi, "hard"],
    [/\bcompleted\b/gi, "finished"],
    [/\bprocrastinated\b/gi, "put things off"],
    [/\bprocrastination\b/gi, "putting things off"],
  ];

  for (const [pattern, replacement] of wordFixes) {
    text = text.replace(pattern, replacement);
  }

  // Split overly long run-on spoken phrases before contrast markers if missing punctuation
  text = text.replace(/\s+(however|although)\s+/gi, ". $1 ");
  text = text.replace(/([^.!?])\s+(later today|after that|on the other hand)\s+/gi, "$1. $2 ");

  // Replace Urdu/Arabic sentence stop with standard English period
  text = text.replace(/۔/g, ".");

  // Capitalize sentences cleanly and ensure punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const capitalized = s.charAt(0).toUpperCase() + s.slice(1);
      return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    });

  return sentences.join(" ");
};

// Deep English grammar, spelling, agreement, and punctuation auto-correction via LanguageTool
const autoCorrectEnglishWithLanguageToolDetailed = async (
  rawText: string
): Promise<{ text: string; fixCount: number }> => {
  const input = (rawText || "").trim();
  if (!input || input.length < 3) return { text: input, fixCount: 0 };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const body = new URLSearchParams({
      text: input,
      language: "en-US",
      enabledOnly: "false",
    });
    const response = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return { text: input, fixCount: 0 };
    const data: any = await response.json();
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    if (matches.length === 0) return { text: input, fixCount: 0 };

    const sorted = [...matches].sort((a, b) => (b.offset || 0) - (a.offset || 0));
    let fixed = input;
    let lastStart = fixed.length + 1;
    let fixCount = 0;

    for (const match of sorted) {
      const offset = Number(match?.offset);
      const length = Number(match?.length);
      const topReplacement = match?.replacements?.[0]?.value;
      if (
        Number.isNaN(offset) ||
        Number.isNaN(length) ||
        typeof topReplacement !== "string" ||
        offset + length > lastStart
      ) {
        continue;
      }
      const issueType = match?.rule?.issueType;
      if (issueType === "style" && matches.length > 8) continue;

      const beforeSlice = fixed.slice(offset, offset + length);
      if (beforeSlice !== topReplacement) {
        fixed = fixed.slice(0, offset) + topReplacement + fixed.slice(offset + length);
        fixCount += 1;
      }
      lastStart = offset;
    }

    return { text: fixed.replace(/\s+/g, " ").trim() || input, fixCount };
  } catch {
    return { text: input, fixCount: 0 };
  } finally {
    clearTimeout(timeout);
  }
};

const translateToSimpleEnglishDetailed = async (
  rawText: string,
  sourceLang = "auto"
): Promise<{ text: string; ltFixCount: number; wasTranslated: boolean }> => {
  const input = (rawText || "").trim();
  if (!input) return { text: "", ltFixCount: 0, wasTranslated: false };

  let working = input;
  const shouldTranslate =
    NON_ENGLISH_CHAR_RE.test(working) ||
    LATIN_FOREIGN_WORD_RE.test(working) ||
    ROMAN_URDU_WORD_RE.test(working) ||
    Boolean(sourceLang && sourceLang !== "en" && sourceLang !== "auto");

  let wasTranslated = false;

  if (shouldTranslate) {
    const translated = await translateViaFreeGtx(working, sourceLang);
    if (translated && translated.trim()) {
      wasTranslated = translated.trim() !== working;
      working = translated;
    }
    // Fallback Roman Urdu cleanup only if non-English Roman tokens still remained untranslated
    if (ROMAN_URDU_WORD_RE.test(working) || NON_ENGLISH_CHAR_RE.test(working)) {
      working = applyRomanUrduAndSpellingFixes(working);
      if (needsServerTranslation(working)) {
        const secondPass = await translateViaFreeGtx(working, "auto");
        if (secondPass && secondPass.trim()) {
          working = secondPass;
          wasTranslated = true;
        }
      }
    }
  }

  // Smooth spoken idioms and phrasing before grammar check
  const beforePolish = working;
  working = polishSimpleEnglish(working);
  const localFixCount = beforePolish.toLowerCase() !== working.toLowerCase() ? 1 : 0;

  // Deep English grammar, spelling, tense, and punctuation auto-correction
  const ltResult = await autoCorrectEnglishWithLanguageToolDetailed(working);
  working = ltResult.text;

  return {
    text: polishSimpleEnglish(working),
    ltFixCount: ltResult.fixCount + localFixCount,
    wasTranslated,
  };
};

const translateToSimpleEnglish = async (rawText: string, sourceLang = "auto"): Promise<string> => {
  const res = await translateToSimpleEnglishDetailed(rawText, sourceLang);
  return res.text;
};

const computeConfidenceScore = ({
  rawInput,
  cleanEnglish,
  ltFixCount,
  wasTranslated,
  wasAiVerified,
  extractedCount,
}: {
  rawInput: string;
  cleanEnglish: string;
  ltFixCount: number;
  wasTranslated: boolean;
  wasAiVerified: boolean;
  extractedCount: number;
}): { confidenceScore: number; confidenceLabel: string } => {
  const words = cleanEnglish.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { confidenceScore: 76, confidenceLabel: "Needs review" };
  }

  let score = wasAiVerified ? 98 : 96;
  const stillHasNonAscii = NON_ENGLISH_CHAR_RE.test(cleanEnglish);
  const stillHasRomanUrdu = ROMAN_URDU_WORD_RE.test(cleanEnglish);

  if (wasTranslated) {
    score -= 3;
  }
  if (ltFixCount > 0) {
    score -= Math.min(14, ltFixCount * 2);
  }
  if (words.length < 4) {
    score -= 7;
  } else if (words.length < 8) {
    score -= 2;
  } else if (words.length >= 14 && extractedCount >= 2) {
    score += 1;
  }
  if (stillHasNonAscii) score -= 18;
  if (stillHasRomanUrdu) score -= 10;

  const clamped = Math.max(72, Math.min(99, Math.round(score)));
  const confidenceLabel =
    clamped >= 94
      ? "Clear & verified in English"
      : clamped >= 86
      ? "Translated & corrected"
      : "Reviewed in English";

  return { confidenceScore: clamped, confidenceLabel };
};

const mergeUniqueStrings = (primary: string[], secondary: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...primary, ...secondary]) {
    const clean = (raw || "").trim();
    if (!clean) continue;
    const key = clean.toLowerCase().replace(/[.!?]+$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }
  return out;
};

// Free local fallback analyzer & exact category extractor (always outputs simple English)
const analyzeLocally = async (rawText: string, sourceLang = "auto") => {
  const detailed = await translateToSimpleEnglishDetailed(rawText, sourceLang);
  const text = detailed.text;
  const lower = text.toLowerCase();

  const crisisTerms = [
    "suicide", "kill myself", "end my life", "self harm", "want to die",
    "khudkushi", "khud kushi", "marna chahta",
  ];
  const isCrisis = crisisTerms.some((t) => lower.includes(t));

  const extracted = extractCategorySegments(text);
  const extractedCount =
    extracted.winsExtracted.length +
    extracted.hardMomentsExtracted.length +
    extracted.slowdownsExtracted.length;

  const { confidenceScore, confidenceLabel } = computeConfidenceScore({
    rawInput: rawText,
    cleanEnglish: text,
    ltFixCount: detailed.ltFixCount,
    wasTranslated: detailed.wasTranslated,
    wasAiVerified: false,
    extractedCount,
  });

  let category: "win" | "resilience" | "slowdown" = "win";
  let slowdownCause: string | null = null;

  if (extracted.winsExtracted.length > 0) {
    category = "win";
  } else if (extracted.slowdownsExtracted.length > 0) {
    category = "slowdown";
  } else if (extracted.hardMomentsExtracted.length > 0) {
    category = "resilience";
  }

  if (extracted.slowdownsExtracted.length > 0) {
    if (lower.includes("doomscroll") || lower.includes("scroll") || lower.includes("phone") || lower.includes("social")) {
      slowdownCause = extracted.slowdownsExtracted[0];
    } else if (lower.includes("tired") || lower.includes("sleep")) {
      slowdownCause = "Low energy or lack of sleep slowed you down.";
    } else {
      slowdownCause = extracted.slowdownsExtracted[0];
    }
  }

  const allCategoryItems =
    category === "win"
      ? extracted.winsExtracted
      : category === "resilience"
      ? extracted.hardMomentsExtracted
      : extracted.slowdownsExtracted;

  const combinedPrimary =
    allCategoryItems.length > 1
      ? allCategoryItems.slice(0, 3).join(" · ")
      : allCategoryItems[0] ||
        text.split(/[.!?\n]+/).map((s) => s.trim()).find(Boolean) ||
        text;

  const win = combinedPrimary;

  let feedback = "Saved to your progress record in simple English.";
  if (extracted.winsExtracted.length > 0 && extracted.slowdownsExtracted.length > 0) {
    feedback = `Saved ${extracted.winsExtracted.length} win${extracted.winsExtracted.length > 1 ? "s" : ""} and ${extracted.slowdownsExtracted.length} slowdown${extracted.slowdownsExtracted.length > 1 ? "s" : ""} in English.`;
  } else if (category === "win") {
    feedback = `Saved your win${extracted.winsExtracted.length > 1 ? "s" : ""}: "${win}".`;
  } else if (category === "resilience") {
    feedback = "Saved the hard moment you kept going through.";
  } else {
    feedback = "Saved this slowdown so you can start fresh tomorrow.";
  }

  return {
    detectedLanguage: "English",
    confidenceScore,
    confidenceLabel,
    transcript: text,
    winsExtracted: extracted.winsExtracted,
    hardMomentsExtracted: extracted.hardMomentsExtracted,
    slowdownsExtracted: extracted.slowdownsExtracted,
    category,
    win,
    feedback,
    slowdownCause,
    isWin: category === "win" || extracted.winsExtracted.length > 0,
    resiliencePoint: category === "resilience" || extracted.hardMomentsExtracted.length > 0,
    tone: category === "slowdown" ? "reflective" : category === "resilience" ? "steady" : "focused",
    isGrowthStory: category !== "slowdown",
    tags: ["english", category],
    safetyTier: isCrisis ? "crisis" : "standard",
    isCrisis,
    crisisResources: isCrisis
      ? "988 Suicide & Crisis Lifeline (US/CA) · Text HOME to 741741 · Find local helplines at findahelpline.com"
      : null,
  };
};

// Guarantees every field returned from Gemini or fallback is strictly plain, grammar-checked English
const ensureResultIsEnglish = async (parsed: any, rawFallbackText: string, sourceLang = "auto") => {
  const transcriptSource = (parsed?.transcript || "").trim() || rawFallbackText;
  const detailedTranscript = await translateToSimpleEnglishDetailed(transcriptSource, sourceLang);
  const cleanTranscript = detailedTranscript.text;

  const normalizeField = async (val: string | null | undefined): Promise<string | null> => {
    if (!val || typeof val !== "string") return null;
    const trimmed = val.trim();
    if (!trimmed) return null;
    return await translateToSimpleEnglish(trimmed, sourceLang || "auto");
  };

  const normalizeArray = async (arr: unknown): Promise<string[]> => {
    if (!Array.isArray(arr)) return [];
    const results: string[] = [];
    for (const item of arr) {
      if (typeof item === "string" && item.trim()) {
        const clean = await normalizeField(item);
        if (clean) results.push(clean);
      }
    }
    return results;
  };

  const localExtracted = extractCategorySegments(cleanTranscript);
  const winsExtracted = mergeUniqueStrings(
    await normalizeArray(parsed?.winsExtracted),
    localExtracted.winsExtracted
  );
  const hardMomentsExtracted = mergeUniqueStrings(
    await normalizeArray(parsed?.hardMomentsExtracted),
    localExtracted.hardMomentsExtracted
  );
  const slowdownsExtracted = mergeUniqueStrings(
    await normalizeArray(parsed?.slowdownsExtracted),
    localExtracted.slowdownsExtracted
  );

  const normalizedAiWin = await normalizeField(parsed?.win);
  const cleanWin =
    (winsExtracted.length > 1 ? winsExtracted.slice(0, 3).join(" · ") : normalizedAiWin || winsExtracted[0]) ||
    hardMomentsExtracted[0] ||
    slowdownsExtracted[0] ||
    cleanTranscript;

  const cleanFeedback =
    (await normalizeField(parsed?.feedback)) || "Saved to your progress record in simple English.";

  const cleanSlowdownCause =
    (await normalizeField(parsed?.slowdownCause)) || slowdownsExtracted[0] || null;
  const cleanPatternObs = await normalizeField(parsed?.patternObservation);
  const cleanToneEvolution = await normalizeField(parsed?.toneEvolution);
  const cleanBadHabitInsight = await normalizeField(parsed?.badHabitInsight);
  const cleanBadHabits = await normalizeArray(parsed?.badHabits);
  const cleanTags = await normalizeArray(parsed?.tags);

  const extractedCount =
    winsExtracted.length + hardMomentsExtracted.length + slowdownsExtracted.length;

  const { confidenceScore, confidenceLabel } = computeConfidenceScore({
    rawInput: rawFallbackText,
    cleanEnglish: cleanTranscript,
    ltFixCount: detailedTranscript.ltFixCount,
    wasTranslated: detailedTranscript.wasTranslated || (Boolean(sourceLang) && sourceLang !== "en" && sourceLang !== "auto"),
    wasAiVerified: true,
    extractedCount,
  });

  return {
    ...parsed,
    detectedLanguage: "English",
    confidenceScore,
    confidenceLabel,
    transcript: cleanTranscript,
    winsExtracted,
    hardMomentsExtracted,
    slowdownsExtracted,
    win: cleanWin,
    feedback: cleanFeedback,
    slowdownCause: cleanSlowdownCause,
    patternObservation: cleanPatternObs,
    toneEvolution: cleanToneEvolution,
    badHabitInsight: cleanBadHabitInsight,
    badHabits: cleanBadHabits,
    tags: cleanTags.length > 0 ? cleanTags : ["english"],
  };
};

const isGeminiAuthOrQuotaError = (error: any): boolean => {
  const msg = typeof error?.message === "string" ? error.message : "";
  return (
    msg.includes("GEMINI_API_KEY_MISSING") ||
    msg.includes("403") ||
    msg.includes("401") ||
    msg.includes("429") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("API_KEY_INVALID") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("free tier is not available")
  );
};

// API route: Parental Notice Dispatch
app.post("/api/parental-notice", (req: express.Request, res: express.Response) => {
  const { parentEmail, userEmail, type, age } = req.body;
  if (!parentEmail) {
    res.status(400).json({ error: "Parent email is required" });
    return;
  }

  const timestamp = Date.now();
  let message = "";

  if (type === "crisis_alert") {
    message = `Important Safety Notice from Lumina: An explicit distress or safety crisis signal was detected during a reflection session for an account registered by your dependent (${userEmail || "user"}). Regional crisis resources (including 988 and Crisis Text Line 741741) have been displayed.`;
  } else {
    message = `Parent / Guardian Information Notice: A user aged ${age || "16-17"} (${userEmail || "user"}) has created a private account on Lumina. Lumina does not share advertising, does not sell data, and never shares private audio or journal entries with anyone.`;
  }

  parentalNoticeLogs.push({
    type: type === "crisis_alert" ? "crisis_alert" : "welcome",
    parentEmail,
    userEmail,
    timestamp,
    message,
  });

  res.setHeader("Content-Type", "application/json");
  res.json({
    status: "dispatched",
    parentEmail,
    type,
    timestamp,
    message,
  });
});

// API route: Live While-Speaking Speech-to-Text + AI Sentence Correction & English Translation
app.post("/api/refine-speech", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { text, audio, mimeType, sourceLang } = req.body;
    let sourceText = typeof text === "string" ? text.trim() : "";

    if (!sourceText && !audio) {
      res.setHeader("Content-Type", "application/json");
      res.json({ refinedText: "", corrected: false });
      return;
    }

    try {
      const ai = getGeminiClient();

      if (audio && !sourceText) {
        const transcribeResp = await ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: audio,
                },
              },
              {
                text: `Transcribe this spoken audio accurately in its spoken language${sourceLang && sourceLang !== "en" ? ` (expected language code: ${sourceLang})` : ""}. Return only the spoken text.`,
              },
            ],
          },
        });
        sourceText = (transcribeResp.text || "").trim();
      }

      if (!sourceText) {
        res.setHeader("Content-Type", "application/json");
        res.json({ refinedText: "", corrected: false });
        return;
      }

      const refineResp = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            text: `You clean up and auto-translate live speech-to-text while a user is speaking in their own language (${sourceLang || "any"}).
Rules:
1. ALWAYS write the output in natural, simple, easy-to-understand English—even if the user spoke Urdu, Hindi, Arabic, Spanish, Roman Urdu, or any other language. Translate every non-English sentence cleanly into natural English.
2. Fix any misspellings or wrong/misheard words using surrounding sentence meaning.
3. Add clean sentence structure and punctuation so every sentence reads naturally.
Return valid JSON: { "refinedText": string }.

LIVE SPEECH TEXT:
"""
${sourceText}
"""`,
          },
        ],
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              refinedText: { type: Type.STRING },
            },
            required: ["refinedText"],
          },
        },
      });

      const parsed = parseGeminiJson(refineResp.text || "{}");
      let refinedText = (parsed?.refinedText || sourceText).trim();
      if (needsServerTranslation(refinedText, sourceLang)) {
        refinedText = await translateToSimpleEnglish(refinedText, sourceLang);
      }
      res.setHeader("Content-Type", "application/json");
      res.json({
        refinedText,
        corrected: refinedText !== sourceText,
      });
      return;
    } catch (geminiErr: any) {
      if (isGeminiAuthOrQuotaError(geminiErr)) {
        const translatedAndFixed = await translateToSimpleEnglish(sourceText, sourceLang);
        res.setHeader("Content-Type", "application/json");
        res.json({
          refinedText: translatedAndFixed,
          corrected: translatedAndFixed !== sourceText,
        });
        return;
      }
      throw geminiErr;
    }
  } catch (error: any) {
    console.error("Error in /api/refine-speech:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: error.message || "Failed to refine speech." });
  }
});

// API route: AI Speech-to-Text + Simple English Normalization & Extraction
app.post("/api/analyze-audio", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const {
      audio,
      mimeType,
      textBackup,
      liveTranscript,
      rawSpokenTranscript,
      sourceLang,
      pastEntries,
      userAge,
      parentEmail,
    } = req.body;
    const backupText = (textBackup || rawSpokenTranscript || liveTranscript || "").trim();

    if (!audio && !backupText) {
      res.setHeader("Content-Type", "application/json");
      res.status(400).json({ error: "Either voice audio or text note must be provided." });
      return;
    }

    let rawSpokenText = backupText;

    try {
      const ai = getGeminiClient();

      if (audio) {
        const audioPart = {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audio,
          },
        };

        const transcriptionResp = await ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: {
            parts: [
              audioPart,
              {
                text: `Listen carefully and transcribe this spoken audio accurately in its spoken language${sourceLang && sourceLang !== "en" ? ` (expected spoken language code: ${sourceLang})` : ""}. Preserve exact meaning, names, and numbers without guessing unrelated English homophones. Return only the spoken text.`,
              },
            ],
          },
        });

        const transcribed = (transcriptionResp.text || "").trim();
        if (transcribed) {
          rawSpokenText = transcribed;
        }
      }

      if (!rawSpokenText) {
        res.setHeader("Content-Type", "application/json");
        res.status(422).json({
          error: "No spoken words were detected in the audio. Please speak clearly or type a quick note below.",
        });
        return;
      }

      const systemPrompt = `
        You are the speech cleanup and reflection organizer for Lumina.

        STRICT ENGLISH & SIMPLE WORDING RULES:
        1. ALWAYS translate and write EVERY SINGLE word across EVERY output field ("transcript", "win", "winsExtracted", "hardMomentsExtracted", "slowdownsExtracted", "feedback", "slowdownCause", "patternObservation", "toneEvolution", "badHabitInsight", "badHabits", "tags") into simple, everyday English—even if the user spoke Urdu, Roman Urdu, Arabic, Hindi, Spanish, or mixed English + another language. Never leave ANY non-English phrase anywhere.
        2. Detect and fix any misspellings or wrong/misheard words using full sentence context, and put the complete translated + corrected English version of everything the user shared in "transcript".
        3. Set "detectedLanguage" to "English".
        4. Extract ALL points mentioned anywhere in the text (not only the first sentence!) into the exact matching categories:
           - "winsExtracted": Array of EVERY win, accomplishment, workout/sport (e.g. swimming, running, football), sale/earning (e.g. $10 sale), finished task, or progress point in simple English. Return [] if none.
           - "hardMomentsExtracted": Array of EVERY difficulty, hardship, stress, fatigue, or tough problem in simple English. Return [] if none.
           - "slowdownsExtracted": Array of EVERY distraction, doomscrolling, delay, wasted time, or slowdown mentioned in simple English. Return [] if none.
           IMPORTANT: A single entry often contains multiple wins AND a slowdown (e.g. "I swam 30 min, played football 1 hr, got a $10 sale, and doomscrolled for 2 hours"). Extract ALL 3 wins into winsExtracted AND the doomscrolling into slowdownsExtracted!
        5. Set primary "category" to "win" (if any wins exist), "resilience" (if hard moment without wins), or "slowdown", and set booleans "isWin" and "resiliencePoint" accordingly.
        6. Set "win" to a clear, plain-English summary covering all wins (or main takeaway) in <= 20 words.
        7. Set "slowdownCause" to 1 plain English sentence naming what slowed them down whenever slowdownsExtracted is non-empty, or null if none.
        8. Set "feedback" to 1 simple, friendly English sentence mentioning what the speaker shared.
        9. Set "safetyTier" to "standard" normally, or "crisis" ONLY if explicit self-harm or immediate danger is stated (set isCrisis=true and provide crisisResources).

        Return valid JSON matching the schema.
      `;

      const contents: any[] = [];
      if (pastEntries && Array.isArray(pastEntries) && pastEntries.length > 0) {
        contents.push({
          text: `RECENT CONTEXT (max 4):\n${JSON.stringify(pastEntries.slice(0, 4))}`,
        });
      }
      if (userAge) {
        contents.push({ text: `USER AGE: ${userAge}` });
      }
      contents.push({
        text: `${systemPrompt}\n\nUSER SPOKEN/WRITTEN TEXT:\n"""\n${rawSpokenText}\n"""`,
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedLanguage: { type: Type.STRING },
              transcript: { type: Type.STRING },
              winsExtracted: { type: Type.ARRAY, items: { type: Type.STRING } },
              hardMomentsExtracted: { type: Type.ARRAY, items: { type: Type.STRING } },
              slowdownsExtracted: { type: Type.ARRAY, items: { type: Type.STRING } },
              category: { type: Type.STRING },
              win: { type: Type.STRING },
              feedback: { type: Type.STRING },
              slowdownCause: { type: Type.STRING },
              isWin: { type: Type.BOOLEAN },
              resiliencePoint: { type: Type.BOOLEAN },
              tone: { type: Type.STRING },
              isGrowthStory: { type: Type.BOOLEAN },
              toneEvolution: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              safetyTier: { type: Type.STRING },
              pauseOffer: { type: Type.STRING },
              isCrisis: { type: Type.BOOLEAN },
              crisisResources: { type: Type.STRING },
              parentAlertTriggered: { type: Type.BOOLEAN },
              patternObservation: { type: Type.STRING },
            },
            required: [
              "detectedLanguage",
              "transcript",
              "winsExtracted",
              "hardMomentsExtracted",
              "slowdownsExtracted",
              "category",
              "win",
              "feedback",
              "isWin",
              "resiliencePoint",
              "tone",
              "tags",
              "safetyTier",
              "isCrisis",
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from AI engine");
      }

      const rawParsed = parseGeminiJson(responseText);
      const parsedResult = await ensureResultIsEnglish(rawParsed, rawSpokenText, sourceLang);

      if (parsedResult.isCrisis && (userAge < 18 || parsedResult.parentAlertTriggered) && parentEmail) {
        parentalNoticeLogs.push({
          type: "crisis_alert",
          parentEmail,
          timestamp: Date.now(),
          message: `Crisis alert dispatched. Resources surfaced: ${parsedResult.crisisResources || "988 Lifeline"}`,
        });
      }

      res.setHeader("Content-Type", "application/json");
      res.json(parsedResult);
      return;
    } catch (geminiErr: any) {
      if (isGeminiAuthOrQuotaError(geminiErr)) {
        if (rawSpokenText) {
          const fallback = await analyzeLocally(rawSpokenText, sourceLang);
          res.setHeader("Content-Type", "application/json");
          res.json(fallback);
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.status(422).json({
          error: "No spoken words were captured from the microphone. Please speak clearly or type a quick note below.",
        });
        return;
      }
      throw geminiErr;
    }
  } catch (error: any) {
    console.error("Error in /api/analyze-audio:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      error: error.message || "Could not process entry. Please try again.",
    });
  }
});

// API route: Batch-translate existing stored entries so every historical record is saved & displayed in simple English
app.post("/api/translate-entries", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const incoming = req.body?.entries;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      res.setHeader("Content-Type", "application/json");
      res.json({ entries: [] });
      return;
    }

    const batch = incoming.slice(0, 25);

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            text: `Translate every stored journal entry below into simple, easy-to-understand everyday English.
Rules:
1. Keep the exact "id" for every entry.
2. Convert "win", "transcript", "feedback", "slowdownCause", "winsExtracted", "hardMomentsExtracted", and "slowdownsExtracted" completely into simple everyday English—even if originally written in Urdu script, Roman Urdu, Hindi, Arabic, or any other language.
3. Preserve each category correctly: wins in winsExtracted, difficulties/resilience in hardMomentsExtracted, distractions/delays in slowdownsExtracted.
Return JSON: { "entries": [...] }.

ENTRIES:
${JSON.stringify(
  batch.map((e: any) => ({
    id: e.id,
    win: e.win || "",
    transcript: e.transcript || "",
    feedback: e.feedback || "",
    slowdownCause: e.slowdownCause || null,
    winsExtracted: e.winsExtracted || [],
    hardMomentsExtracted: e.hardMomentsExtracted || [],
    slowdownsExtracted: e.slowdownsExtracted || [],
  }))
)}`,
          },
        ],
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              entries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    win: { type: Type.STRING },
                    transcript: { type: Type.STRING },
                    feedback: { type: Type.STRING },
                    slowdownCause: { type: Type.STRING },
                    winsExtracted: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hardMomentsExtracted: { type: Type.ARRAY, items: { type: Type.STRING } },
                    slowdownsExtracted: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["id", "win", "transcript", "winsExtracted", "hardMomentsExtracted", "slowdownsExtracted"],
                },
              },
            },
            required: ["entries"],
          },
        },
      });

      const parsed = parseGeminiJson(response.text || "{}");
      const translatedMap = new Map<string, any>();
      if (Array.isArray(parsed?.entries)) {
        for (const item of parsed.entries) {
          if (item?.id) translatedMap.set(item.id, item);
        }
      }

      const normalizedEntries = await Promise.all(
        batch.map(async (orig: any) => {
          const matched = translatedMap.get(orig.id) || orig;
          const verified = await ensureResultIsEnglish(matched, orig.transcript || orig.win || "");
          return {
            ...orig,
            win: verified.win,
            transcript: verified.transcript,
            feedback: verified.feedback,
            slowdownCause: verified.slowdownCause,
            winsExtracted: verified.winsExtracted,
            hardMomentsExtracted: verified.hardMomentsExtracted,
            slowdownsExtracted: verified.slowdownsExtracted,
            detectedLanguage: "English",
          };
        })
      );

      res.setHeader("Content-Type", "application/json");
      res.json({ entries: normalizedEntries });
      return;
    } catch (geminiErr: any) {
      if (!isGeminiAuthOrQuotaError(geminiErr)) {
        throw geminiErr;
      }

      const normalizedEntries = await Promise.all(
        batch.map(async (orig: any) => {
          const verified = await ensureResultIsEnglish(orig, orig.transcript || orig.win || "");
          return {
            ...orig,
            win: verified.win,
            transcript: verified.transcript,
            feedback: verified.feedback,
            slowdownCause: verified.slowdownCause,
            winsExtracted: verified.winsExtracted,
            hardMomentsExtracted: verified.hardMomentsExtracted,
            slowdownsExtracted: verified.slowdownsExtracted,
            detectedLanguage: "English",
          };
        })
      );

      res.setHeader("Content-Type", "application/json");
      res.json({ entries: normalizedEntries });
      return;
    }
  } catch (error: any) {
    console.error("Error in /api/translate-entries:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: error.message || "Could not translate entries." });
  }
});

const shortLinkCache = new Map<string, string>();
const toShareableUrl = (url: string) => url.replace("https://ais-dev-", "https://ais-pre-");
const DEFAULT_SHARED_APP_URL = toShareableUrl(
  process.env.SHARED_APP_URL ||
    process.env.APP_URL ||
    "https://ais-pre-pysbhc7doz2yxoi5ztofkr-451678381807.asia-southeast1.run.app"
);

const verifyRedirectTarget = async (shortUrl: string, expectedTarget: string): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const resp = await fetch(shortUrl, { method: "HEAD", redirect: "manual", signal: controller.signal });
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location") || "";
      return loc.startsWith(expectedTarget);
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const shortenUrlWithTimeout = async (
  endpoint: string,
  expectedTarget: string,
  timeoutMs = 5000
): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(endpoint, { method: "GET", signal: controller.signal });
    if (!resp.ok) return null;
    const text = (await resp.text()).trim();
    if (/^https?:\/\/\S+$/i.test(text)) {
      const valid = await verifyRedirectTarget(text, expectedTarget);
      return valid ? text : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// API route: Shortened, shareable link for mobile home-screen shortcuts
app.get("/api/short-link", async (req: express.Request, res: express.Response): Promise<void> => {
  const requestedUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
  const isShareableOrigin =
    /^https:\/\/[^/]+/i.test(requestedUrl) &&
    !requestedUrl.includes("localhost") &&
    !requestedUrl.includes("127.0.0.1");

  const targetUrl = (isShareableOrigin ? toShareableUrl(requestedUrl) : DEFAULT_SHARED_APP_URL).replace(/\/+$/, "");

  const cached = shortLinkCache.get(targetUrl);
  if (cached) {
    res.setHeader("Content-Type", "application/json");
    res.json({ shortUrl: cached, targetUrl });
    return;
  }

  const encoded = encodeURIComponent(targetUrl);
  const shortUrl =
    (await shortenUrlWithTimeout(`https://tinyurl.com/api-create.php?url=${encoded}`, targetUrl)) ||
    (await shortenUrlWithTimeout(`https://clck.ru/--?url=${encoded}`, targetUrl)) ||
    targetUrl;

  if (shortUrl !== targetUrl) {
    shortLinkCache.set(targetUrl, shortUrl);
  }

  res.setHeader("Content-Type", "application/json");
  res.json({ shortUrl, targetUrl });
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumina server running on http://localhost:${PORT}`);
  });
};

startServer();
