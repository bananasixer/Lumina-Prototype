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

// Local speech correction & misspelling/wrong-word fixer (resilient fallback when free API quota is unavailable)
const refineSpeechLocally = (rawText: string): string => {
  let text = (rawText || "").replace(/\s+/g, " ").trim();
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
    [/\bpeace of mind\b/gi, "peace of mind"],
    [/\bbrake time\b/gi, "break time"],
    [/\bweather or not\b/gi, "whether or not"],
    [/\bsuppose to\b/gi, "supposed to"],
    [/\buse to\b/gi, "used to"],
    [/\bi done\b/gi, "I finished"],
    [/\bbuilded\b/gi, "built"],
    [/\bwrited\b/gi, "wrote"],
    [/\bmaked\b/gi, "made"],
  ];

  for (const [pattern, replacement] of wordFixes) {
    text = text.replace(pattern, replacement);
  }

  // Split overly long run-on spoken phrases before contrast markers if missing punctuation
  text = text.replace(/\s+(however|although)\s+/gi, ". $1 ");
  text = text.replace(/([^.!?])\s+(later today|after that|on the other hand)\s+/gi, "$1. $2 ");

  // Capitalize sentences cleanly and ensure punctuation
  const sentences = text
    .split(/(?<=[.!?۔])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const capitalized = s.charAt(0).toUpperCase() + s.slice(1);
      return /[.!?۔]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    });

  return sentences.join(" ");
};

// Free local fallback analyzer & exact category extractor
const analyzeLocally = (rawText: string) => {
  const text = refineSpeechLocally(rawText);
  const lower = text.toLowerCase();

  const hasUrduScript = /[\u0600-\u06FF]/.test(text);
  const romanUrduTokens = [
    "aaj", "kaam", "gaya", "gayi", "nahi", "karna", "kiya", "aur", "tha", "thi",
    "hai", "hain", "mein", "hum", "mera", "meri", "mere", "bohot", "bahut",
    "mushkil", "waqt", "shukriya", "kya", "lekin", "phir", "abhi", "yeh", "woh",
    "bhi", "sab", "acha", "theek", "banaya", "mukammal", "seekha", "parha",
    "susti", "pareshan", "masla", "kal", "raat", "subah", "dil", "apna"
  ];
  const words = lower.split(/[\s,.;!?]+/).filter(Boolean);
  const romanHits = words.filter((w) => romanUrduTokens.includes(w)).length;
  const hasEnglishWords = words.some(
    (w) => /^[a-z]{2,}$/.test(w) && !romanUrduTokens.includes(w)
  );

  let detectedLanguage = "English";
  if (hasUrduScript && hasEnglishWords) {
    detectedLanguage = "Urdu · English";
  } else if (hasUrduScript) {
    detectedLanguage = "Urdu";
  } else if (romanHits >= 2 && hasEnglishWords) {
    detectedLanguage = "Urdu · English";
  } else if (romanHits >= 2) {
    detectedLanguage = "Urdu";
  }

  const crisisTerms = [
    "suicide", "kill myself", "end my life", "self harm", "want to die",
    "khudkushi", "khud kushi", "marna chahta", "خودکشی", "جان دینا"
  ];
  const isCrisis = crisisTerms.some((t) => lower.includes(t));

  const extracted = extractCategorySegments(text);

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
    if (lower.includes("scroll") || lower.includes("phone") || lower.includes("social")) {
      slowdownCause = "Phone or screen distraction interrupted focus.";
    } else if (lower.includes("tired") || lower.includes("sleep") || lower.includes("thak")) {
      slowdownCause = "Low energy or lack of rest slowed momentum.";
    } else {
      slowdownCause = "Momentum stalled on the planned task.";
    }
  }

  const primaryLine =
    (category === "win" && extracted.winsExtracted[0]) ||
    (category === "resilience" && extracted.hardMomentsExtracted[0]) ||
    (category === "slowdown" && extracted.slowdownsExtracted[0]) ||
    text.split(/[.!?۔\n]+/).map((s) => s.trim()).find(Boolean) ||
    text;

  const takeawayWords = primaryLine.split(/\s+/);
  const win =
    takeawayWords.length > 18
      ? `${takeawayWords.slice(0, 17).join(" ")}...`
      : primaryLine;

  let feedback = "Logged clearly to your private progress record.";
  if (category === "win") {
    feedback = `Recorded your progress: "${win}".`;
  } else if (category === "resilience") {
    feedback = `Noted the hard moment you worked through.`;
  } else {
    feedback = `Noted this slowdown honestly so you can reset on your next step.`;
  }

  return {
    detectedLanguage,
    transcript: text,
    winsExtracted: extracted.winsExtracted,
    hardMomentsExtracted: extracted.hardMomentsExtracted,
    slowdownsExtracted: extracted.slowdownsExtracted,
    category,
    win,
    feedback,
    slowdownCause,
    isWin: category === "win",
    resiliencePoint: category === "resilience",
    tone: category === "slowdown" ? "reflective" : category === "resilience" ? "steady" : "focused",
    isGrowthStory: category !== "slowdown",
    tags: [detectedLanguage.toLowerCase().includes("urdu") ? "urdu" : "english", category],
    safetyTier: isCrisis ? "crisis" : "standard",
    isCrisis,
    crisisResources: isCrisis
      ? "988 Suicide & Crisis Lifeline (US/CA) · Text HOME to 741741 · Find local helplines at findahelpline.com"
      : null,
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

// API route: Live While-Speaking Speech-to-Text + AI Sentence Correction & Misspelling/Wrong-Word Fix
app.post("/api/refine-speech", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { text, audio, mimeType } = req.body;
    let sourceText = typeof text === "string" ? text.trim() : "";

    if (!sourceText && !audio) {
      res.setHeader("Content-Type", "application/json");
      res.json({ refinedText: "", corrected: false });
      return;
    }

    try {
      const ai = getGeminiClient();

      // Convert live audio chunk to text first when browser speech text is missing
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
                text: "Transcribe this spoken audio accurately in its spoken language. Return only the spoken text.",
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

      // Run live spoken text through Gemini AI to fix misspellings, replace misheard/wrong words,
      // and form complete sensible sentences without changing what the speaker meant.
      const refineResp = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            text: `You clean up live speech-to-text while a user is speaking.
Rules:
1. Detect and fix any misspellings or wrong/misheard words (e.g., homophones or speech-recognition mistakes that don't fit the sentence context) using surrounding meaning.
2. Add clean sentence structure, punctuation, capitalization, and light natural phrasing where fragmented so every sentence makes clear sense.
3. Preserve the speaker's actual ideas, names, numbers, and original language (English, Urdu, or mixed) without adding unrelated content.
Return valid JSON: { "refinedText": string }.

LIVE SPEECH TEXT:
"""
${sourceText}
"""`,
          },
        ],
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
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
      const refinedText = (parsed?.refinedText || sourceText).trim();
      res.setHeader("Content-Type", "application/json");
      res.json({
        refinedText,
        corrected: refinedText !== sourceText,
      });
      return;
    } catch (geminiErr: any) {
      if (isGeminiAuthOrQuotaError(geminiErr)) {
        const locallyFixed = refineSpeechLocally(sourceText);
        res.setHeader("Content-Type", "application/json");
        res.json({
          refinedText: locallyFixed,
          corrected: locallyFixed !== sourceText,
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

// API route: AI Speech-to-Text (gemini-3.5-transcribe) + AI Sentence/Word Correction & Extraction (gemini-3.1-flash-lite)
app.post("/api/analyze-audio", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { audio, mimeType, textBackup, liveTranscript, pastEntries, userAge, parentEmail } = req.body;
    const backupText = (textBackup || liveTranscript || "").trim();

    if (!audio && !backupText) {
      res.setHeader("Content-Type", "application/json");
      res.status(400).json({ error: "Either voice audio or text note must be provided." });
      return;
    }

    let rawSpokenText = backupText;

    try {
      const ai = getGeminiClient();

      // Step 1: Convert voice audio to text using gemini-3.5-transcribe
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
                text: "Transcribe this spoken audio accurately in its spoken language. Preserve exact words, names, and numbers. Return only the spoken text.",
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
          error: "No spoken words were detected in the audio. Please speak clearly or type a quick note.",
        });
        return;
      }

      // Step 2: AI cleans misspellings / wrong-word errors, ensures sensible sentence structure,
      // and extracts ONLY category-specific statements (Wins / Hard Moments / Slowdowns).
      const systemPrompt = `
        You are the speech cleanup and reflection organizer for Lumina.

        STRICT CORRECTION & EXTRACTION RULES:
        1. Review the input spoken/written text carefully:
           - Detect any misspellings or wrong/misheard words (e.g., speech-to-text homophone mistakes that contradict sentence context) and correct them.
           - Add clear sentence boundaries, punctuation, and natural connecting words only where incomplete so every sentence makes clear, natural sense while keeping the speaker's exact meaning, facts, and language.
           - Put this corrected, natural version into "transcript".
        2. Detect the language ("English", "Urdu", or "Urdu · English") in "detectedLanguage".
        3. Extract ONLY the specific statements belonging to each category directly from the corrected text:
           - "winsExtracted": Array of ONLY the accomplishments, finished tasks, breakthroughs, or positive progress. Return [] if none.
           - "hardMomentsExtracted": Array of ONLY the difficulties, stress, fatigue, obstacles, or emotional weight. Return [] if none.
           - "slowdownsExtracted": Array of ONLY the distractions, procrastination, wasted time, delays, or lost focus. Return [] if none.
           IMPORTANT: Do NOT put the whole text into these arrays unless the entire text is a single sentence of that category. Extract only the relevant clauses/sentences!
        4. Set primary "category" to "win", "resilience" (for hard moment), or "slowdown" based on the dominant outcome, and set booleans "isWin" and "resiliencePoint" accordingly.
        5. Set "win" to 1 concise sentence (max 15 words) summarizing the primary point in plain everyday language.
        6. Set "slowdownCause" to 1 plain sentence naming what triggered any slowdown, or null if none.
        7. Set "feedback" to 1 direct grounded sentence referencing something specific the speaker actually said.
        8. Set "safetyTier" to "standard" normally, or "crisis" ONLY if explicit self-harm or immediate danger to life is stated (set isCrisis=true and provide crisisResources).
        9. Never use robotic buzzwords like "crystallize", "agency", "sovereign", "locus", "synthesize", or "void".

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
            thinkingLevel: ThinkingLevel.MINIMAL,
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

      const parsedResult = parseGeminiJson(responseText);
      const correctedTranscript = (parsedResult.transcript || "").trim() || refineSpeechLocally(rawSpokenText);
      parsedResult.transcript = correctedTranscript;

      // Ensure non-empty deterministic arrays if Gemini missed any
      if (
        (!parsedResult.winsExtracted || parsedResult.winsExtracted.length === 0) &&
        (!parsedResult.hardMomentsExtracted || parsedResult.hardMomentsExtracted.length === 0) &&
        (!parsedResult.slowdownsExtracted || parsedResult.slowdownsExtracted.length === 0)
      ) {
        const localExtracted = extractCategorySegments(correctedTranscript);
        parsedResult.winsExtracted = localExtracted.winsExtracted;
        parsedResult.hardMomentsExtracted = localExtracted.hardMomentsExtracted;
        parsedResult.slowdownsExtracted = localExtracted.slowdownsExtracted;
      }

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
          const fallback = analyzeLocally(rawSpokenText);
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
