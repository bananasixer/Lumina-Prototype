import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large JSON payloads for base64 audio recordings & uploads
app.use(express.json({ limit: "50mb" }));

// In-memory log of parental notices (for audit and verification)
const parentalNoticeLogs: Array<{
  type: "welcome" | "crisis_alert";
  parentEmail: string;
  userEmail?: string;
  timestamp: number;
  message: string;
}> = [];

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
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
    message
  });

  res.setHeader("Content-Type", "application/json");
  res.json({
    status: "dispatched",
    parentEmail,
    type,
    timestamp,
    message
  });
});

// API route: Automatic 95+ Language Audio & Text Capture + Analysis
app.post("/api/analyze-audio", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { audio, mimeType, textBackup, liveTranscript, pastEntries, userAge, parentEmail } = req.body;

    const effectiveText = (textBackup || liveTranscript || "").trim();

    if (!audio && !effectiveText) {
      res.setHeader("Content-Type", "application/json");
      res.status(400).json({ error: "Either audio or text reflection must be provided" });
      return;
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    const systemPrompt = `
      You are the automatic multilingual voice transcription and reflection engine for Lumina.
      
      AUTOMATIC 95+ LANGUAGE DETECTION & CODE-SWITCHING DIRECTIVE:
      - Automatically detect the spoken or written language(s) across 95+ languages (including English, Urdu, Arabic, Spanish, French, Mandarin Chinese, Hindi, German, Japanese, Korean, Portuguese, Turkish, Punjabi, Bengali, Russian, Indonesian, etc.) and natural mid-sentence code-switching (e.g., Urdu + English, Spanish + English, Arabic + French).
      - Set "detectedLanguage" to a crisp human-readable label (e.g. "English", "Urdu", "Urdu · English", "Arabic", "Spanish", "Mandarin", "Japanese", "Hindi · English").
      - Transcribe accurately in the "transcript" field: preserve the speaker's exact words and meaning faithfully. If spoken in a non-English language or code-switched mix, transcribe naturally in its native or clean readable form without dropping any detail.
      - Write "win", "feedback", "slowdownCause", and "tags" in clear, everyday English so the user's progress record stays unified and easy to scan.

      CRITICAL PLAIN-LANGUAGE RULE:
      - NEVER use academic, robotic, or buzzword vocabulary.
      - Strictly avoid words like "crystallize", "agency", "sovereign", "defused", "locus", "epistemic", "heuristic", "synthesize", "companion", "friction point", "void".
      - Write in plain, direct, grounded language that someone building alone can read immediately.

      THREE CLEAR CATEGORIES:
      Classify the entry into ONE of these 3 categories:
      1. "win" (Default if accomplished or positive progress):
         The user shipped something, completed work, practiced a skill, fixed an issue, or hit a milestone.
         Set category="win", isWin=true, resiliencePoint=false.
      2. "resilience":
         The user pushed through real difficulty, stress, rejection, or fatigue and stayed steady.
         Set category="resilience", isWin=false, resiliencePoint=true.
      3. "slowdown":
         The user procrastinated, got distracted, lost momentum, or stalled on goals.
         Set category="slowdown", isWin=false, resiliencePoint=false.

      SLOWDOWN CAUSE:
      - If category is "slowdown" (or procrastination is described), state in 1 plain sentence what triggered it in "slowdownCause". Otherwise set slowdownCause to null.

      MAIN TAKEAWAY ("win"):
      - 1 short, specific sentence (max 15 words) stating the real outcome.

      FEEDBACK ("feedback"):
      - 1 or 2 grounded, direct sentences referencing something specific they actually said. No cheerleading clichés.

      SAFETY TIER:
      - "standard" for normal work, stress, or venting.
      - "crisis" ONLY if explicit danger to life or self-harm is stated; set isCrisis=true and provide crisisResources ("988 Suicide & Crisis Lifeline (US/CA) · Text HOME to 741741 · Find local helplines at findahelpline.com").

      Return valid JSON matching the schema.
    `;

    if (pastEntries && Array.isArray(pastEntries) && pastEntries.length > 0) {
      contents.push({
        text: `RECENT CONTEXT (max 4):\n${JSON.stringify(pastEntries.slice(0, 4))}`
      });
    }

    if (userAge) {
      contents.push({
        text: `USER AGE: ${userAge}`
      });
    }

    // Prioritize real audio whenever present so multilingual speech & mid-sentence code-switching
    // are accurately auto-detected directly by Gemini rather than browser SpeechRecognition
    if (audio) {
      contents.push({
        inlineData: {
          data: audio,
          mimeType: mimeType || "audio/webm",
        },
      });
      contents.push({
        text: systemPrompt + (effectiveText
          ? `\nBrowser live preview hint (may be partial or single-language, trust the actual audio above): "${effectiveText}"`
          : "\nListen carefully, auto-detect the spoken language(s), transcribe verbatim, and return the JSON result.")
      });
    } else {
      contents.push({
        text: systemPrompt + `\nAuto-detect the language(s) and analyze this written entry:\n"${effectiveText}"`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        thinkingConfig: {
          thinkingBudget: 0
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            detectedLanguage: { type: "STRING" },
            transcript: { type: "STRING" },
            category: { type: "STRING" },
            win: { type: "STRING" },
            feedback: { type: "STRING" },
            slowdownCause: { type: "STRING" },
            isWin: { type: "BOOLEAN" },
            resiliencePoint: { type: "BOOLEAN" },
            tone: { type: "STRING" },
            isGrowthStory: { type: "BOOLEAN" },
            toneEvolution: { type: "STRING" },
            tags: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            safetyTier: { type: "STRING" },
            pauseOffer: { type: "STRING" },
            isCrisis: { type: "BOOLEAN" },
            crisisResources: { type: "STRING" },
            parentAlertTriggered: { type: "BOOLEAN" },
            patternObservation: { type: "STRING" }
          },
          required: ["detectedLanguage", "transcript", "category", "win", "feedback", "isWin", "resiliencePoint", "tone", "tags", "safetyTier", "isCrisis"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI engine");
    }

    const parsedResult = parseGeminiJson(responseText);

    if (parsedResult.isCrisis && (userAge < 18 || parsedResult.parentAlertTriggered) && parentEmail) {
      parentalNoticeLogs.push({
        type: "crisis_alert",
        parentEmail,
        timestamp: Date.now(),
        message: `Crisis alert dispatched. Resources surfaced: ${parsedResult.crisisResources || "988 Lifeline"}`
      });
    }

    res.setHeader("Content-Type", "application/json");
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/analyze-audio:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      error: error.message || "An error occurred while processing the recording"
    });
  }
});

// API route: One-Click Output Transformations (Translate, Summarize, Format)
app.post("/api/transform-entry", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { text, action, targetLanguage, formatStyle } = req.body;

    if (!text || !text.trim()) {
      res.setHeader("Content-Type", "application/json");
      res.status(400).json({ error: "Text content is required for transformation" });
      return;
    }

    const ai = getGeminiClient();

    let instruction = "";
    if (action === "translate") {
      const lang = (targetLanguage || "English").trim();
      instruction = `Translate the following text accurately and naturally into ${lang}. Preserve names, numbers, and intent. Return JSON { "result": string, "label": string } where "label" is "Translated to ${lang}".`;
    } else if (action === "summarize") {
      instruction = `Write a crisp, factual 2-3 sentence summary capturing the key decisions, outcomes, and facts in the following text. Plain language only. Return JSON { "result": string, "label": string } where "label" is "Executive Summary".`;
    } else if (action === "format") {
      const style = formatStyle || "Structured Notes";
      instruction = `Reformat the following transcript into clean ${style} with concise headings or bullet points and explicit action items if mentioned. Do not invent facts. Return JSON { "result": string, "label": string } where "label" is "${style}".`;
    } else {
      res.setHeader("Content-Type", "application/json");
      res.status(400).json({ error: "Invalid transformation action" });
      return;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `${instruction}\n\nTEXT:\n"""\n${text.trim()}\n"""`
        }
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            result: { type: "STRING" },
            label: { type: "STRING" }
          },
          required: ["result", "label"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty transformation response");
    }

    const parsed = parseGeminiJson(responseText);
    res.setHeader("Content-Type", "application/json");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/transform-entry:", error);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      error: error.message || "Could not transform entry"
    });
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Vite middleware for development vs static asset serving for production
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
