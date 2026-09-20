import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large JSON payloads for base64 audio
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
  return new GoogleGenAI({ apiKey });
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
    message = `Important Safety Notice from Lumina: An explicit distress or safety crisis signal was detected during a reflection session for an account registered by your dependent (${userEmail || "teen user"}). We have provided regional crisis resources (including 988 and Crisis Text Line 741741) and gently paused the session. Please check in with them directly.`;
  } else {
    message = `Parent / Guardian Information Notice: A teen aged ${age || "16-17"} (${userEmail || "user"}) has created a private account on Lumina, a personal voice reflection and growth ledger. Lumina does not share advertising, does not sell data, and never shares their private audio or journal entries with anyone. No account or login is required on your part. If an explicit safety crisis is ever signaled during a session, you will be notified immediately alongside crisis resource support.`;
  }

  parentalNoticeLogs.push({
    type: type === "crisis_alert" ? "crisis_alert" : "welcome",
    parentEmail,
    userEmail,
    timestamp,
    message
  });

  console.log(`[Lumina Parent Notice Dispatch] [${type}] To: ${parentEmail}`, message);

  res.json({
    status: "dispatched",
    parentEmail,
    type,
    timestamp,
    message
  });
});

// API route: Analyze audio or text check-in
app.post("/api/analyze-audio", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { audio, mimeType, textBackup, pastEntries, userAge, parentEmail, languageMode } = req.body;

    if (!audio && !textBackup) {
      res.status(400).json({ error: "Either audio or textBackup must be provided" });
      return;
    }

    const ai = getGeminiClient();
    let contents: any[] = [];

    const isUrduMode = languageMode === "urdu";

    const systemPrompt = `
      You are a warm, humble, and practical assistant for a daily check-in app.
      Your task is to transcribe what the user said, and summarize it in everyday, crystal-clear, simple English.

      LANGUAGE & TRANSLATION DIRECTIVE:
      - All output fields (including transcript, win, feedback, slowdownCause, and tags) MUST be returned in clear, everyday English.
      ${isUrduMode ? `- SPEAK IN URDU MODE ACTIVE: The user is speaking (or writing) in Urdu (اردو), colloquial Urdu, or mixed Roman Urdu. Listen attentively to their Urdu audio. Accurately translate their spoken thoughts into clear, fluent, natural English for the "transcript" field. The saved transcript MUST be in plain English so the entire user journal and ledger remain consistently in English.` : `- If the user happens to speak in Urdu or any non-English language, automatically translate what they said into clear, fluent English for the "transcript" field and maintain all output in English.`}

      CRITICAL LANGUAGE RULE (ANTI-COMPLEXITY):
      - NEVER use big, fancy, academic, robotic, or AI words.
      - Avoid words like "crystallize", "agency", "sovereign", "defused", "locus", "epistemic", "heuristic", "synthesize", "friction point", "void".
      - Speak in plain, kind, easy words that an exhausted person can instantly understand without thinking.

      THREE CLEAR CATEGORIES:
      You MUST classify the check-in into ONE of these 3 clear categories:
      1. "win" (Default if positive or accomplished):
         The user accomplished something, finished a task, made progress, exercised, completed work, or had a good moment.
         IMPORTANT: If the user describes something they worked on or accomplished, ALWAYS classify it as "win". Do NOT mark normal achievements as resilience!
         Set category="win", isWin=true, resiliencePoint=false.

      2. "resilience":
         The user faced a hard challenge, distress, emotional stress, or difficult obstacle, but pushed through it or handled it.
         Set category="resilience", isWin=false, resiliencePoint=true.

      3. "slowdown":
         The user procrastinated, got distracted, put off what they needed to do, felt unmotivated, or fell back on their goals.
         Set category="slowdown", isWin=false, resiliencePoint=false.

      WHAT CAUSED YOU TO FALL BACK (FOR SLOWDOWN / PROCRASTINATION):
      If the category is "slowdown" (or whenever the user fell back or procrastinated), clearly state in 1 simple sentence what triggered or caused them to fall back.
      Examples:
      - "Feeling overwhelmed by the task made you put off getting started."
      - "Being tired after work led to scrolling on your phone instead of exercising."
      - "Uncertainty about the first step caused you to delay the project."
      If there was no procrastination or falling back, set slowdownCause to null.

      MAIN TAKEAWAY ("win"):
      - 1 short, simple sentence (max 15 words) stating the main outcome.
        Win example: "You finished drafting your project report before lunch."
        Resilience example: "You stayed patient and worked through a stressful meeting."
        Slowdown example: "You put off your assignment and spent the evening scrolling."

      FEEDBACK:
      - 1 or 2 warm, simple, supportive sentences directly mentioning what they shared. Like a grounded friend talking to them in plain English. No cheerleading clichés, no robotic jargon.

      SAFETY TIERS:
      - Standard: Normal day, vent, or share.
      - Crisis: Only if explicit, unambiguous danger to life or self-harm is stated. In crisis, provide a gentle message, set isCrisis=true, and set crisisResources to regional hotlines (like 988 and Crisis Text Line 741741).

      OUTPUT SCHEMA:
      Return JSON with:
      {
        "transcript": string,
        "category": "win" | "resilience" | "slowdown",
        "win": string,
        "feedback": string,
        "slowdownCause": string | null,
        "isWin": boolean,
        "resiliencePoint": boolean,
        "tone": string,
        "tags": string[],
        "isGrowthStory": boolean,
        "toneEvolution": string | null,
        "safetyTier": "standard" | "crisis",
        "isCrisis": boolean,
        "crisisResources": string | null,
        "parentAlertTriggered": boolean
      }
    `;

    if (pastEntries && Array.isArray(pastEntries) && pastEntries.length > 0) {
      contents.push({
        text: `PAST HISTORICAL ENTRIES FOR CONTEXT:\n${JSON.stringify(pastEntries)}`
      });
    }

    if (userAge) {
      contents.push({
        text: `USER DECLARED AGE: ${userAge} (Under 18 flag: ${userAge < 18}). Parent email registered: ${parentEmail || "none"}`
      });
    }

    if (audio) {
      contents.push({
        inlineData: {
          data: audio,
          mimeType: mimeType || "audio/webm",
        },
      });
      contents.push({
        text: systemPrompt + (
          isUrduMode
            ? "\nThe user is speaking in Urdu. Listen to the audio carefully, auto-convert what they said into natural, clear English for the transcript, and summarize everything in simple everyday English."
            : "\nAnalyze and accurately transcribe the user's voice check-in."
        )
      });
    } else {
      contents.push({
        text: systemPrompt + (
          isUrduMode
            ? `\nThe user provided this reflection in Urdu. Auto-translate it into fluent everyday English for the transcript and provide all insights in English:\n"${textBackup}"`
            : `\nAnalyze the following typed text reflection:\n"${textBackup}"`
        )
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
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
          required: ["transcript", "category", "win", "feedback", "isWin", "resiliencePoint", "tone", "tags", "safetyTier", "isCrisis"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI engine");
    }

    const parsedResult = JSON.parse(responseText);

    // If explicit crisis triggered and user is under 18 with a parent email, record notice
    if (parsedResult.isCrisis && (userAge < 18 || parsedResult.parentAlertTriggered) && parentEmail) {
      parentalNoticeLogs.push({
        type: "crisis_alert",
        parentEmail,
        timestamp: Date.now(),
        message: `Crisis alert dispatched for dependent. Resources surfaced: ${parsedResult.crisisResources || "988 Lifeline"}`
      });
      console.log(`[Lumina Crisis Parental Notification] Alert dispatched to: ${parentEmail}`);
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error("Error in /api/analyze-audio:", error);
    res.status(500).json({
      error: error.message || "An error occurred while processing the check-in"
    });
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
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
