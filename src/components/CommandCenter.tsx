import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Send,
  AlertCircle,
  RefreshCw,
  BookmarkCheck,
  Check,
  Edit3,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSession, WinEntry } from "../types";
import { calculateWinStreak } from "../utils/sovereignMetrics";
import { extractCategorySegments } from "../utils/extractCategories";
import { safeApiPost } from "../utils/safeApi";

const SPOKEN_LANGUAGES = [
  { code: "en-US", gtx: "en", label: "English" },
  { code: "ar-SA", gtx: "ar", label: "Arabic" },
  { code: "fr-FR", gtx: "fr", label: "French" },
  { code: "hi-IN", gtx: "hi", label: "Hindi" },
  { code: "pt-BR", gtx: "pt", label: "Portuguese" },
  { code: "es-ES", gtx: "es", label: "Spanish" },
  { code: "tr-TR", gtx: "tr", label: "Turkish" },
  { code: "ur-PK", gtx: "ur", label: "Urdu" },
] as const;

interface CommandCenterProps {
  user: UserSession;
  entries: WinEntry[];
  onEntrySaved: (entry: WinEntry) => void;
  autoStart?: boolean;
  onRecordingChange?: (recording: boolean) => void;
}

interface AnalysisResult {
  detectedLanguage?: string;
  confidenceScore?: number;
  confidenceLabel?: string;
  transcript: string;
  winsExtracted?: string[];
  hardMomentsExtracted?: string[];
  slowdownsExtracted?: string[];
  category?: "win" | "resilience" | "slowdown";
  isWin?: boolean;
  slowdownCause?: string | null;
  win: string;
  feedback: string;
  resiliencePoint: boolean;
  tags?: string[];
  safetyTier?: "standard" | "venting" | "ambiguous" | "crisis";
  pauseOffer?: string | null;
  tone?: string | null;
  isGrowthStory?: boolean;
  toneEvolution?: string | null;
  patternObservation?: string | null;
  badHabits?: string[];
  badHabitInsight?: string | null;
  isCrisis?: boolean;
  crisisResources?: string | null;
}

export default function CommandCenter({
  user,
  entries,
  onEntrySaved,
  autoStart,
  onRecordingChange,
}: CommandCenterProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("Translating & correcting English...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [topicStatus, setTopicStatus] = useState<"ongoing" | "resolved">("ongoing");
  const [selectedCategory, setSelectedCategory] = useState<"win" | "resilience" | "slowdown">("win");
  const [slowdownCause, setSlowdownCause] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const [pendingAudio, setPendingAudio] = useState<{
    base64Audio: string | null;
    audioUrl: string | null;
    mimeType: string;
    capturedText: string;
    duration: number;
  } | null>(null);

  const [spokenLang, setSpokenLang] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("lumina_spoken_lang");
      if (saved && SPOKEN_LANGUAGES.some((l) => l.code === saved)) return saved;
    } catch {}
    return typeof navigator !== "undefined" && navigator.language?.startsWith("ur")
      ? "ur-PK"
      : "en-US";
  });

  const [liveNativePreview, setLiveNativePreview] = useState("");
  const rawLiveTextRef = useRef("");
  const spokenLangRef = useRef(spokenLang);
  const durationRef = useRef(0);
  const recognitionRef = useRef<any>(null);

  const [aiResult, setAiResult] = useState<AnalysisResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isRecordingRef = useRef(false);

  const currentStreak = calculateWinStreak(entries).currentStreak;
  const activeLangObj =
    SPOKEN_LANGUAGES.find((l) => l.code === spokenLang) || SPOKEN_LANGUAGES[0];

  useEffect(() => {
    spokenLangRef.current = spokenLang;
    try {
      localStorage.setItem("lumina_spoken_lang", spokenLang);
    } catch {}
  }, [spokenLang]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    onRecordingChange?.(isRecording);
    if (isRecording) {
      const rafId = requestAnimationFrame(() => drawVisualizer());
      return () => cancelAnimationFrame(rafId);
    }
  }, [isRecording, onRecordingChange]);

  const getGreeting = () => {
    const hours = new Date().getHours();
    const name = user.displayName?.split(" ")[0] || "Builder";
    if (hours < 12) return `Good morning, ${name}.`;
    if (hours < 18) return `Good afternoon, ${name}.`;
    return `Good evening, ${name}.`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const logicalWidth = canvas.clientWidth || 320;
    const logicalHeight = canvas.clientHeight || 48;
    if (canvas.width !== Math.round(logicalWidth * dpr) || canvas.height !== Math.round(logicalHeight * dpr)) {
      canvas.width = Math.round(logicalWidth * dpr);
      canvas.height = Math.round(logicalHeight * dpr);
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const freqArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(analyser.fftSize);
    let phase = 0;

    const draw = () => {
      if (!isRecordingRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(freqArray);
      analyser.getByteTimeDomainData(timeArray);
      phase += 0.09;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const centerY = logicalHeight / 2;

      // 1. Center-mirrored vocal spectrum bars (weighted to active voice range)
      const barCount = 42;
      const gap = 3;
      const barWidth = Math.max(2, (logicalWidth - gap * (barCount - 1)) / barCount);
      const voiceMaxBin = Math.max(barCount, Math.floor(bufferLength * 0.65));
      const halfCount = Math.floor(barCount / 2);

      for (let i = 0; i < barCount; i++) {
        const distFromCenter = Math.abs(i - halfCount);
        const binIndex = Math.min(
          voiceMaxBin - 1,
          Math.floor((distFromCenter / Math.max(1, halfCount)) * (voiceMaxBin * 0.85))
        );
        const rawEnergy = (freqArray[binIndex] || 0) / 255;
        const idlePulse = 0.1 + 0.06 * Math.sin(phase * 1.4 - distFromCenter * 0.38);
        const normalized = Math.min(1, Math.max(idlePulse, rawEnergy * 1.15));
        const barHeight = Math.max(4, normalized * (logicalHeight - 8));
        const x = i * (barWidth + gap);
        const y = centerY - barHeight / 2;

        ctx.fillStyle =
          normalized > 0.72
            ? "rgba(200, 109, 68, 0.82)"
            : i % 2 === 0
            ? "rgba(15, 139, 141, 0.78)"
            : "rgba(0, 85, 255, 0.72)";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }

      // 2. Real-time time-domain acoustic wave ribbon
      const waveGrad = ctx.createLinearGradient(0, 0, logicalWidth, 0);
      waveGrad.addColorStop(0, "#0F8B8D");
      waveGrad.addColorStop(0.5, "#0055FF");
      waveGrad.addColorStop(1, "#C86D44");

      ctx.beginPath();
      ctx.lineWidth = 1.75;
      ctx.strokeStyle = waveGrad;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const sliceWidth = logicalWidth / Math.max(1, timeArray.length - 1);
      for (let i = 0; i < timeArray.length; i++) {
        const sample = (timeArray[i] - 128) / 128; // -1..1
        const microRipple = Math.sin(phase + i * 0.14) * 1.5;
        const y = centerY + sample * (logicalHeight * 0.75) + microRipple;
        const x = i * sliceWidth;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    draw();
  };

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const str = (reader.result as string)?.split(",")?.[1] || "";
        resolve(str);
      };
      reader.onerror = () => resolve("");
    });

  const startRecording = async () => {
    setErrorMessage(null);
    setAiResult(null);
    if (pendingAudio?.audioUrl) {
      URL.revokeObjectURL(pendingAudio.audioUrl);
    }
    setPendingAudio(null);
    setShowFullTranscript(false);
    setLiveNativePreview("");
    rawLiveTextRef.current = "";
    audioChunksRef.current = [];
    durationRef.current = 0;
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        if (audioContext.state === "suspended") {
          await audioContext.resume().catch(() => {});
        }
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        await stageRecordedAudioForOkay();
      };

      mediaRecorder.start(250);
      isRecordingRef.current = true;
      setIsRecording(true);
      requestAnimationFrame(() => drawVisualizer());

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          recognition.lang = spokenLangRef.current || "en-US";

          recognition.onresult = (event: any) => {
            let combined = "";
            for (let i = 0; i < event.results.length; ++i) {
              combined += event.results[i][0].transcript + " ";
            }
            const cleanRaw = combined.replace(/\s+/g, " ").trim();
            if (cleanRaw) {
              rawLiveTextRef.current = cleanRaw;
              setLiveNativePreview(cleanRaw);
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);
    } catch (err: any) {
      let errorText = "Microphone access is unavailable. You can type a quick note below.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorText = "Microphone permission was denied. Enable it in browser settings or type below.";
      }
      setErrorMessage(errorText);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setIsRecording(false);
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 600);

    // Brief flush before stopping MediaRecorder so trailing spoken words aren't clipped
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }, 200);
  };

  const stageRecordedAudioForOkay = async () => {
    const capturedText = rawLiveTextRef.current.trim();
    const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
    let base64Audio: string | null = null;
    let audioUrl: string | null = null;

    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      if (audioBlob.size > 24 * 1024 * 1024) {
        setErrorMessage("Recording exceeded 24 MB. Please keep clips concise.");
        return;
      }
      if (audioBlob.size > 0) {
        audioUrl = URL.createObjectURL(audioBlob);
        base64Audio = await blobToBase64(audioBlob);
      }
    }

    if (!base64Audio && !capturedText) {
      setErrorMessage("No audio was recorded. Please speak clearly or type a quick note below.");
      return;
    }

    setPendingAudio({
      base64Audio,
      audioUrl,
      mimeType: mime,
      capturedText,
      duration: durationRef.current,
    });
  };

  const handleConfirmProcessAudio = async () => {
    if (!pendingAudio) return;

    const langMeta =
      SPOKEN_LANGUAGES.find((l) => l.code === spokenLangRef.current) || SPOKEN_LANGUAGES[0];
    const currentPending = pendingAudio;

    setIsProcessing(true);
    setProcessingStep("Reading your voice recording...");
    setErrorMessage(null);

    const stepTimer1 = setTimeout(() => {
      setProcessingStep("Translating & correcting English grammar...");
    }, 700);
    const stepTimer2 = setTimeout(() => {
      setProcessingStep("Organizing your wins & hard moments...");
    }, 1800);

    try {
      const pastEntriesForAnalysis = entries.slice(0, 4).map((e) => ({
        win: e.win,
        transcript: e.transcript,
        date: e.date,
        tone: e.tone,
        status: e.status,
      }));

      const data = await safeApiPost<AnalysisResult>("/api/analyze-audio", {
        audio: currentPending.base64Audio || undefined,
        mimeType: currentPending.mimeType,
        rawSpokenTranscript: currentPending.capturedText.trim() || undefined,
        sourceLang: langMeta.gtx,
        pastEntries: pastEntriesForAnalysis,
        userAge: user.age,
        parentEmail: user.parentEmail,
      });

      const mergeUnique = (primary: string[] = [], secondary: string[] = []) => {
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

      const extracted = extractCategorySegments(data.transcript || currentPending.capturedText);
      const enriched: AnalysisResult = {
        ...data,
        winsExtracted: mergeUnique(data.winsExtracted, extracted.winsExtracted),
        hardMomentsExtracted: mergeUnique(data.hardMomentsExtracted, extracted.hardMomentsExtracted),
        slowdownsExtracted: mergeUnique(data.slowdownsExtracted, extracted.slowdownsExtracted),
      };

      const initialCat: "win" | "resilience" | "slowdown" =
        enriched.category || (enriched.resiliencePoint ? "resilience" : "win");
      setSelectedCategory(initialCat);
      setSlowdownCause(enriched.slowdownCause || "");
      setShowFullTranscript(false);
      if (currentPending.audioUrl) {
        URL.revokeObjectURL(currentPending.audioUrl);
      }
      setPendingAudio(null);
      setAiResult(enriched);
      setTopicStatus(enriched.isGrowthStory ? "resolved" : "ongoing");
    } catch (err: any) {
      setErrorMessage(err.message || "Could not process recording. Please try again.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsProcessing(false);
    }
  };

  const handleRetakeRecording = () => {
    if (pendingAudio?.audioUrl) {
      URL.revokeObjectURL(pendingAudio.audioUrl);
    }
    setPendingAudio(null);
    setErrorMessage(null);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;

    const langMeta =
      SPOKEN_LANGUAGES.find((l) => l.code === spokenLangRef.current) || SPOKEN_LANGUAGES[0];

    setIsProcessing(true);
    setProcessingStep("Translating & correcting English grammar...");
    setErrorMessage(null);
    setAiResult(null);
    setShowFullTranscript(false);

    try {
      const pastEntriesForAnalysis = entries.slice(0, 4).map((e) => ({
        win: e.win,
        transcript: e.transcript,
        date: e.date,
        tone: e.tone,
        status: e.status,
      }));

      const data = await safeApiPost<AnalysisResult>("/api/analyze-audio", {
        textBackup: typedText.trim(),
        sourceLang: langMeta.gtx,
        pastEntries: pastEntriesForAnalysis,
        userAge: user.age,
        parentEmail: user.parentEmail,
      });

      const mergeUnique = (primary: string[] = [], secondary: string[] = []) => {
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

      const extracted = extractCategorySegments(data.transcript || typedText.trim());
      const enriched: AnalysisResult = {
        ...data,
        winsExtracted: mergeUnique(data.winsExtracted, extracted.winsExtracted),
        hardMomentsExtracted: mergeUnique(data.hardMomentsExtracted, extracted.hardMomentsExtracted),
        slowdownsExtracted: mergeUnique(data.slowdownsExtracted, extracted.slowdownsExtracted),
      };

      const initialCat: "win" | "resilience" | "slowdown" =
        enriched.category || (enriched.resiliencePoint ? "resilience" : "win");
      setSelectedCategory(initialCat);
      setSlowdownCause(enriched.slowdownCause || "");
      setShowFullTranscript(false);
      setAiResult(enriched);
      setTopicStatus(enriched.isGrowthStory ? "resolved" : "ongoing");
      setTypedText("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process note.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEntry = () => {
    if (!aiResult) return;

    const isWinOutcome = selectedCategory === "win";
    const isResilienceOutcome = selectedCategory === "resilience";
    const isSlowdownOutcome = selectedCategory === "slowdown";

    const activeItems =
      selectedCategory === "win"
        ? aiResult.winsExtracted || []
        : selectedCategory === "resilience"
        ? aiResult.hardMomentsExtracted || []
        : aiResult.slowdownsExtracted || [];

    const primaryTakeaway =
      activeItems.length > 1
        ? activeItems.slice(0, 3).join(" · ")
        : activeItems[0] || aiResult.win;

    const hasWins = (aiResult.winsExtracted?.length || 0) > 0;
    const hasHard = (aiResult.hardMomentsExtracted?.length || 0) > 0;
    const hasSlowdowns = (aiResult.slowdownsExtracted?.length || 0) > 0;

    const newEntry: WinEntry = {
      id: Math.random().toString(36).substring(2, 11),
      userId: user.uid,
      date: new Date().toISOString().split("T")[0],
      timestamp: Date.now(),
      category: selectedCategory,
      isWin: isWinOutcome || hasWins,
      resiliencePoint: isResilienceOutcome || hasHard,
      win: primaryTakeaway,
      transcript: aiResult.transcript,
      winsExtracted: aiResult.winsExtracted || [],
      hardMomentsExtracted: aiResult.hardMomentsExtracted || [],
      slowdownsExtracted: aiResult.slowdownsExtracted || [],
      detectedLanguage: "English",
      sourceType: "voice",
      feedback: aiResult.feedback,
      slowdownCause:
        isSlowdownOutcome || hasSlowdowns
          ? slowdownCause.trim() ||
            aiResult.slowdownCause ||
            aiResult.slowdownsExtracted?.[0] ||
            "Distraction or stall"
          : null,
      tags: aiResult.tags || [],
      status: topicStatus,
      durationSeconds: recordingDuration,
      tone: aiResult.tone || null,
      isGrowthStory: aiResult.isGrowthStory || false,
      toneEvolution: aiResult.toneEvolution || null,
      safetyTier: aiResult.safetyTier || "standard",
      pauseOffer: aiResult.pauseOffer || null,
      patternObservation: aiResult.patternObservation || null,
      isCrisis: aiResult.isCrisis || false,
      crisisResources: aiResult.crisisResources || null,
      badHabits: aiResult.badHabits || [],
      badHabitInsight: aiResult.badHabitInsight || null,
    };

    onEntrySaved(newEntry);
    setAiResult(null);
    setIsEditing(false);
    setShowFullTranscript(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInputFocused) return;

      if (e.code === "Space" && !aiResult && !isProcessing) {
        e.preventDefault();
        if (isRecordingRef.current) stopRecording();
        else startRecording();
      } else if (e.key === "Escape") {
        if (isRecordingRef.current) stopRecording();
        else if (aiResult) {
          setAiResult(null);
          setIsEditing(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiResult, isProcessing]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        if (!isRecordingRef.current && !isProcessing && !aiResult) {
          startRecording();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  return (
    <div className="max-w-xl mx-auto space-y-6 py-2" id="command-center-root">
      {/* Clean, clutter-free greeting */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#1D1D1F] tracking-[-0.025em] text-balance">
          {getGreeting()}
        </h2>
        <p className="text-xs text-[#86868B] tabular-nums">
          Streak · {currentStreak} {currentStreak === 1 ? "day" : "days"}
        </p>
      </div>

      {errorMessage && (
        <div className="apple-card rounded-2xl p-4 border-[#C86D44]/30 bg-[#C86D44]/[0.05] flex items-start gap-3 text-left">
          <AlertCircle className="w-4 h-4 text-[#C86D44] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-[#1D1D1F] leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!aiResult ? (
          <motion.div
            key="compact-capture"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {/* Compact Voice Capture Card or Recorded Confirmation ('Okay') Step */}
            {pendingAudio ? (
              <div className="apple-card rounded-[24px] p-6 space-y-4 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0F8B8D]/15 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-[#0F8B8D]">Recording Ready</span>
                    <p className="text-[11px] text-[#86868B] mt-0.5 tabular-nums">
                      {formatDuration(pendingAudio.duration)} recorded · Click Okay to translate &amp; auto-correct
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full apple-well border border-[#0F8B8D]/15 text-xs text-[#515154]">
                    <span className="font-medium text-[#1E4449]">Spoken in</span>
                    <select
                      aria-label="Spoken language"
                      value={spokenLang}
                      disabled={isProcessing}
                      onChange={(e) => setSpokenLang(e.target.value)}
                      className="bg-transparent font-semibold text-[#0F8B8D] focus:outline-none cursor-pointer"
                    >
                      {SPOKEN_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {pendingAudio.audioUrl && (
                  <audio
                    controls
                    src={pendingAudio.audioUrl}
                    className="w-full h-9 rounded-full"
                  />
                )}

                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-[#515154] block">
                    Captured speech ({activeLangObj.label})
                  </span>
                  <textarea
                    value={pendingAudio.capturedText}
                    disabled={isProcessing}
                    onChange={(e) =>
                      setPendingAudio({ ...pendingAudio, capturedText: e.target.value })
                    }
                    rows={3}
                    placeholder={
                      pendingAudio.base64Audio
                        ? "Audio captured cleanly. Click Okay below to transcribe, translate, and auto-correct in English."
                        : "Type or edit what you said..."
                    }
                    className="apple-input w-full rounded-[14px] p-3 text-sm leading-relaxed"
                  />
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <motion.button
                      type="button"
                      onClick={handleConfirmProcessAudio}
                      disabled={isProcessing}
                      animate={isProcessing ? { scale: [1, 0.99, 1] } : { scale: 1 }}
                      transition={
                        isProcessing
                          ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                          : { duration: 0.15 }
                      }
                      className={`relative overflow-hidden flex-1 min-h-[46px] py-2.5 px-5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 transition-all ${
                        isProcessing
                          ? "bg-[#EDF7F6] border border-[#0F8B8D]/35 text-[#0F8B8D] cursor-wait"
                          : "btn-royal cursor-pointer"
                      }`}
                    >
                      {isProcessing && (
                        <motion.span
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0F8B8D]/15 to-transparent pointer-events-none"
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin shrink-0 relative z-10" />
                          <span className="relative z-10 truncate">{processingStep}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Okay</span>
                        </>
                      )}
                    </motion.button>

                    <button
                      type="button"
                      onClick={handleRetakeRecording}
                      disabled={isProcessing}
                      className="btn-secondary-apple min-h-[46px] px-5 py-2.5 rounded-full text-xs font-medium text-[#515154] cursor-pointer disabled:opacity-45"
                    >
                      Record Again
                    </button>
                  </div>

                  {isProcessing && (
                    <div className="w-full h-1 rounded-full bg-[#EDF7F6] overflow-hidden">
                      <motion.div
                        className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#0F8B8D] via-[#0055FF] to-[#0F8B8D]"
                        initial={{ x: "-100%" }}
                        animate={{ x: "220%" }}
                        transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="apple-card rounded-[24px] p-6 flex flex-col items-center space-y-5 relative overflow-hidden">
                {/* Balanced Spoken Language Selector */}
                <div className="w-full flex items-center justify-center">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full apple-well border border-[#0F8B8D]/15 text-xs text-[#515154]">
                    <span className="font-medium text-[#1E4449]">Speaking in</span>
                    <select
                      aria-label="Spoken language"
                      value={spokenLang}
                      disabled={isRecording || isProcessing}
                      onChange={(e) => setSpokenLang(e.target.value)}
                      className="bg-transparent font-semibold text-[#0F8B8D] focus:outline-none cursor-pointer disabled:opacity-60"
                    >
                      {SPOKEN_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="relative flex items-center justify-center">
                  {isRecording && (
                    <>
                      {[0, 1].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full border border-[#0F8B8D]/40 pointer-events-none"
                          style={{ width: 88, height: 88 }}
                          initial={{ scale: 1, opacity: 0.75 }}
                          animate={{ scale: [1, 1.48, 1.82], opacity: [0.65, 0.22, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.9,
                            ease: "easeOut",
                          }}
                        />
                      ))}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || showCheckmark}
                    className={`relative z-10 w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-60 active:scale-[0.97] ${
                      showCheckmark
                        ? "bg-[#EDF7F6] border border-[#0F8B8D]/30 text-[#0F8B8D]"
                        : isRecording
                        ? "bg-[#FFFFFF] border-2 border-[#0F8B8D] text-[#0F8B8D] shadow-md"
                        : "btn-royal"
                    }`}
                  >
                    {showCheckmark ? (
                      <Check className="w-6 h-6 text-[#0F8B8D]" />
                    ) : isRecording ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#C86D44] animate-pulse" />
                          <Square className="w-3.5 h-3.5 fill-[#0055FF] text-[#0055FF]" />
                        </div>
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#1D1D1F]">
                          {formatDuration(recordingDuration)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Mic className="w-6 h-6" />
                        <span className="text-[11px] font-medium tracking-tight">Record</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Real-Time Acoustic Waveform Well */}
                <div className="w-full max-w-sm space-y-1.5">
                  <div className="w-full h-14 rounded-[16px] apple-well px-3.5 flex items-center justify-center overflow-hidden relative">
                    {isRecording ? (
                      <canvas
                        ref={canvasRef}
                        aria-label="Live audio waveform"
                        className="w-full h-12 block"
                      />
                    ) : isProcessing ? (
                      <div className="flex items-center gap-2 text-xs font-medium text-[#0F8B8D]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{processingStep}</span>
                      </div>
                    ) : (
                      <svg className="w-full h-7" viewBox="0 0 320 28" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="idleWaveTriad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0F8B8D" stopOpacity="0.85" />
                            <stop offset="50%" stopColor="#0055FF" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#C86D44" stopOpacity="0.8" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M 0 14 Q 40 4 80 14 T 160 14 T 240 14 T 320 14"
                          fill="none"
                          stroke="url(#idleWaveTriad)"
                          strokeWidth="1.8"
                          animate={{
                            d: [
                              "M 0 14 Q 40 4 80 14 T 160 14 T 240 14 T 320 14",
                              "M 0 14 Q 40 24 80 14 T 160 14 T 240 14 T 320 14",
                              "M 0 14 Q 40 4 80 14 T 160 14 T 240 14 T 320 14",
                            ],
                          }}
                          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </svg>
                    )}
                  </div>
                  {isRecording && (
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#0F8B8D]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C86D44] animate-pulse" />
                      <span>
                        Recording in {activeLangObj.label} · Tap stop when done, then Okay
                      </span>
                    </div>
                  )}
                </div>

                {isRecording && (
                  <div className="w-full rounded-[16px] apple-well p-3.5 text-xs text-[#1D1D1F] min-h-[52px] max-h-32 overflow-y-auto text-left leading-relaxed space-y-1">
                    <span className="text-[11px] font-medium text-[#0F8B8D] block">
                      Recording ({activeLangObj.label})
                    </span>
                    {liveNativePreview ? (
                      <p className="text-[#1D1D1F]">
                        {liveNativePreview}
                        <span className="inline-block w-1.5 h-3 bg-[#0F8B8D] ml-1 animate-pulse align-middle" />
                      </p>
                    ) : (
                      <span className="text-[#86868B]">
                        Speak normally in {activeLangObj.label}. Translation and English correction will run when you tap Okay.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Compact Quick Note Bar */}
            <form
              onSubmit={handleTextSubmit}
              className="apple-card rounded-[24px] p-2 flex items-center gap-2"
            >
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Write a quick note..."
                className="flex-1 min-h-[44px] bg-transparent px-3.5 py-2 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing || !typedText.trim()}
                aria-label="Send quick note"
                className="btn-teal min-h-[44px] px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 transition-all"
              >
                {isProcessing && !pendingAudio ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Log</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="result-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="apple-card rounded-[24px] p-6 space-y-5 text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0F8B8D]/15 pb-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-[#0F8B8D]">
                  {aiResult.detectedLanguage || "English"}
                </span>

                <div
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EDF7F6] border border-[#0F8B8D]/18"
                  aria-label="Transcription and English clarity confidence score"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0F8B8D] shrink-0" />
                  <span className="text-[11px] font-semibold text-[#1D1D1F] tabular-nums">
                    {aiResult.confidenceScore ?? 95}% confidence
                  </span>
                  <div className="w-12 h-1.5 rounded-full bg-white overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${aiResult.confidenceScore ?? 95}%` }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[#0F8B8D] to-[#0055FF]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="min-h-[36px] px-3 py-1 rounded-full bg-[#EDF7F6] hover:bg-[#E1F2F1] border border-[#0F8B8D]/20 text-xs font-medium text-[#1D1D1F] inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isEditing ? <Check className="w-3.5 h-3.5 text-[#0F8B8D]" /> : <Edit3 className="w-3.5 h-3.5 text-[#0F8B8D]" />}
                <span>{isEditing ? "Done" : "Edit"}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-1 rounded-[16px] bg-[#EDF7F6] border border-[#0F8B8D]/15">
              {[
                {
                  id: "win",
                  label: "Win",
                  count: aiResult.winsExtracted?.length || 0,
                  activeColor: "text-[#0055FF]",
                },
                {
                  id: "resilience",
                  label: "Hard Moment",
                  count: aiResult.hardMomentsExtracted?.length || 0,
                  activeColor: "text-[#0F8B8D]",
                },
                {
                  id: "slowdown",
                  label: "Slowed Down",
                  count: aiResult.slowdownsExtracted?.length || 0,
                  activeColor: "text-[#C86D44]",
                },
              ].map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as "win" | "resilience" | "slowdown")}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-[12px] text-xs font-medium transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                      active
                        ? `bg-[#FFFFFF] ${cat.activeColor} shadow-xs font-semibold`
                        : "text-[#515154] hover:text-[#1D1D1F]"
                    }`}
                  >
                    <span>{cat.label}</span>
                    {cat.count > 0 && (
                      <span className="text-[10px] opacity-75 tabular-nums">({cat.count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedCategory === "slowdown" && (
              <input
                type="text"
                value={slowdownCause}
                onChange={(e) => setSlowdownCause(e.target.value)}
                placeholder="What caused the slowdown..."
                className="apple-input w-full min-h-[44px] rounded-[14px] px-3.5 py-2 text-xs"
              />
            )}

            {/* Extracted Category-Specific Display: Shows ONLY Wins, Hard Moments, or Slowdowns from the text */}
            {(() => {
              const extractedMap = {
                win: aiResult.winsExtracted || [],
                resilience: aiResult.hardMomentsExtracted || [],
                slowdown: aiResult.slowdownsExtracted || [],
              };
              const categoryHeading =
                selectedCategory === "win"
                  ? "Your wins"
                  : selectedCategory === "resilience"
                  ? "Hard moments"
                  : "Slowdowns";
              const categoryAccent =
                selectedCategory === "win"
                  ? "text-[#0055FF]"
                  : selectedCategory === "resilience"
                  ? "text-[#0F8B8D]"
                  : "text-[#C86D44]";
              const activeItems = extractedMap[selectedCategory];
              const updateActiveItems = (nextText: string) => {
                const lines = nextText
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean);
                if (selectedCategory === "win") {
                  setAiResult({ ...aiResult, winsExtracted: lines, win: lines[0] || aiResult.win });
                } else if (selectedCategory === "resilience") {
                  setAiResult({ ...aiResult, hardMomentsExtracted: lines });
                } else {
                  setAiResult({ ...aiResult, slowdownsExtracted: lines });
                }
              };

              return (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className={`text-xs font-semibold block ${categoryAccent}`}>
                      {categoryHeading}
                    </span>

                    {isEditing ? (
                      <textarea
                        value={activeItems.join("\n")}
                        onChange={(e) => updateActiveItems(e.target.value)}
                        rows={3}
                        placeholder="One item per line..."
                        className="apple-input w-full rounded-[14px] p-3 text-sm"
                      />
                    ) : activeItems.length > 0 ? (
                      <ul className="space-y-2">
                        {activeItems.map((item, idx) => (
                          <li
                            key={idx}
                            className="rounded-[14px] apple-well px-4 py-3 text-sm font-medium text-[#1D1D1F] leading-relaxed"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-[14px] apple-well px-4 py-3 text-xs text-[#86868B]">
                        No {selectedCategory === "win" ? "wins" : selectedCategory === "resilience" ? "hard moments" : "slowdowns"} in this entry.
                      </p>
                    )}
                  </div>

                  {aiResult.safetyTier === "crisis" && (
                    <div className="rounded-[16px] bg-[#C86D44]/[0.07] border border-[#C86D44]/30 p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C86D44]">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Support Resources</span>
                      </div>
                      <p className="text-xs text-[#1D1D1F] whitespace-pre-line">
                        {aiResult.crisisResources ||
                          "988 Suicide & Crisis Lifeline · Text HOME to 741741 · findahelpline.com"}
                      </p>
                    </div>
                  )}

                  {aiResult.transcript && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowFullTranscript(!showFullTranscript)}
                        className="text-xs font-medium text-[#515154] hover:text-[#0F8B8D] cursor-pointer"
                      >
                        {showFullTranscript ? "Hide full spoken text" : "Show full spoken text"}
                      </button>

                      {showFullTranscript && (
                        <div className="mt-2 rounded-[14px] apple-well p-3.5 space-y-2">
                          {isEditing ? (
                            <textarea
                              value={aiResult.transcript}
                              onChange={(e) => setAiResult({ ...aiResult, transcript: e.target.value })}
                              rows={3}
                              className="apple-input w-full rounded-[12px] p-2.5 text-xs"
                            />
                          ) : (
                            <p className="text-xs text-[#515154] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                              {aiResult.transcript}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-[#0F8B8D]/15">
              {aiResult.safetyTier === "crisis" ? (
                <button
                  type="button"
                  onClick={() => {
                    setAiResult(null);
                    setIsEditing(false);
                  }}
                  className="btn-royal flex-1 min-h-[44px] py-2 text-sm font-medium rounded-full cursor-pointer"
                >
                  Close Session
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEntry}
                    className="btn-royal flex-1 min-h-[44px] py-2 text-sm font-medium rounded-full inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Save to Record</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiResult(null);
                      setIsEditing(false);
                    }}
                    className="btn-secondary-apple min-h-[44px] px-5 py-2 rounded-full text-xs font-medium text-[#515154] cursor-pointer"
                  >
                    Discard
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
