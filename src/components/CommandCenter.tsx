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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSession, WinEntry } from "../types";
import { calculateStreak } from "../utils/sovereignMetrics";
import { extractCategorySegments } from "../utils/extractCategories";
import { safeApiPost } from "../utils/safeApi";

interface CommandCenterProps {
  user: UserSession;
  entries: WinEntry[];
  onEntrySaved: (entry: WinEntry) => void;
  autoStart?: boolean;
  onRecordingChange?: (recording: boolean) => void;
}

interface AnalysisResult {
  detectedLanguage?: string;
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
  const [isRefiningLive, setIsRefiningLive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [topicStatus, setTopicStatus] = useState<"ongoing" | "resolved">("ongoing");
  const [selectedCategory, setSelectedCategory] = useState<"win" | "resilience" | "slowdown">("win");
  const [slowdownCause, setSlowdownCause] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const [liveTranscript, setLiveTranscript] = useState("");
  const rawLiveTextRef = useRef("");
  const refinedLiveTextRef = useRef("");
  const lastRefinedInputRef = useRef("");
  const refineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioLiveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refineSeqRef = useRef(0);
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

  const currentStreak = calculateStreak(entries);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    onRecordingChange?.(isRecording);
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

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecordingRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 36;
      const step = Math.max(1, Math.floor(bufferLength / barCount));
      const gap = 3;
      const barWidth = Math.max(2, (canvas.width - gap * barCount) / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] || 0;
        const normalized = Math.max(0.14, value / 255);
        const barHeight = Math.max(3, normalized * (canvas.height - 4));
        const x = i * (barWidth + gap);
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle =
          i % 5 === 4 || normalized > 0.72
            ? "#C86D44"
            : i % 2 === 0
            ? "#0F8B8D"
            : "#0055FF";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
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

  // Live AI pass while the user is speaking: fixes misspellings, replaces misheard wrong words,
  // and forms complete, sensible sentences in real time.
  const runLiveAiCorrection = async (rawText: string, includeAudioSnapshot = false) => {
    if (!isRecordingRef.current) return;
    const cleanInput = rawText.trim();
    if (!cleanInput && !includeAudioSnapshot) return;
    if (cleanInput && cleanInput === lastRefinedInputRef.current && !includeAudioSnapshot) return;

    const seq = ++refineSeqRef.current;
    lastRefinedInputRef.current = cleanInput;
    setIsRefiningLive(true);

    try {
      let audioPayload: string | undefined;
      let mimePayload: string | undefined;
      if (includeAudioSnapshot && audioChunksRef.current.length > 0 && !cleanInput) {
        const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
        const snapshotBlob = new Blob(audioChunksRef.current, { type: mime });
        if (snapshotBlob.size > 0 && snapshotBlob.size < 12 * 1024 * 1024) {
          audioPayload = await blobToBase64(snapshotBlob);
          mimePayload = mime;
        }
      }

      if (!cleanInput && !audioPayload) {
        return;
      }

      const data = await safeApiPost<{ refinedText: string }>("/api/refine-speech", {
        text: cleanInput || undefined,
        audio: audioPayload,
        mimeType: mimePayload,
      });

      // Only apply if this is still the latest live speech request and user hasn't raced ahead drastically
      if (isRecordingRef.current && seq === refineSeqRef.current && data.refinedText) {
        refinedLiveTextRef.current = data.refinedText;
        // If user continued speaking while waiting, keep refined prefix + only trailing unspoken raw words
        const currentRaw = rawLiveTextRef.current.trim();
        if (!cleanInput || currentRaw.length <= cleanInput.length + 3) {
          setLiveTranscript(data.refinedText);
        } else {
          const tail = currentRaw.slice(cleanInput.length).trim();
          setLiveTranscript(tail ? `${data.refinedText} ${tail}` : data.refinedText);
        }
      }
    } catch {
      // Fail silently during live capture so recording is never interrupted
    } finally {
      if (seq === refineSeqRef.current) {
        setIsRefiningLive(false);
      }
    }
  };

  const scheduleLiveCorrection = (rawText: string) => {
    if (refineTimerRef.current) {
      clearTimeout(refineTimerRef.current);
    }
    refineTimerRef.current = setTimeout(() => {
      runLiveAiCorrection(rawText, false);
    }, 750);
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setAiResult(null);
    setShowFullTranscript(false);
    setLiveTranscript("");
    rawLiveTextRef.current = "";
    refinedLiveTextRef.current = "";
    lastRefinedInputRef.current = "";
    refineSeqRef.current = 0;
    audioChunksRef.current = [];
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
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
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
        await processRecordedAudio();
      };

      mediaRecorder.start(250);
      isRecordingRef.current = true;
      setIsRecording(true);
      setTimeout(drawVisualizer, 50);

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          recognition.lang = navigator.language?.startsWith("ur") ? "ur-PK" : "en-US";

          recognition.onresult = (event: any) => {
            let combined = "";
            for (let i = 0; i < event.results.length; ++i) {
              combined += event.results[i][0].transcript + " ";
            }
            const cleanRaw = combined.replace(/\s+/g, " ").trim();
            if (cleanRaw) {
              rawLiveTextRef.current = cleanRaw;
              // Show refined sentence prefix + live trailing words immediately, then trigger AI correction
              if (refinedLiveTextRef.current && cleanRaw.length > lastRefinedInputRef.current.length) {
                const tail = cleanRaw.slice(lastRefinedInputRef.current.length).trim();
                setLiveTranscript(
                  tail ? `${refinedLiveTextRef.current} ${tail}` : refinedLiveTextRef.current
                );
              } else {
                setLiveTranscript(cleanRaw);
              }
              scheduleLiveCorrection(cleanRaw);
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }

      // Live audio AI transcription fallback every 3s for browsers without SpeechRecognition text
      audioLiveTimerRef.current = setInterval(() => {
        if (isRecordingRef.current && !rawLiveTextRef.current.trim()) {
          runLiveAiCorrection("", true);
        }
      }, 3000);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
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
    if (refineTimerRef.current) {
      clearTimeout(refineTimerRef.current);
      refineTimerRef.current = null;
    }
    if (audioLiveTimerRef.current) {
      clearInterval(audioLiveTimerRef.current);
      audioLiveTimerRef.current = null;
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
    setIsRefiningLive(false);
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 750);

    // Brief 180ms flush before stopping MediaRecorder so trailing spoken words aren't clipped
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }, 180);
  };

  const processRecordedAudio = async () => {
    const bestLiveText = (
      refinedLiveTextRef.current ||
      liveTranscript ||
      rawLiveTextRef.current ||
      ""
    ).trim();
    const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
    let base64Audio: string | null = null;

    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      if (audioBlob.size > 24 * 1024 * 1024) {
        setErrorMessage("Recording exceeded 24 MB. Please keep clips concise.");
        return;
      }
      base64Audio = await blobToBase64(audioBlob);
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const pastEntriesForAnalysis = entries.slice(0, 4).map((e) => ({
        win: e.win,
        transcript: e.transcript,
        date: e.date,
        tone: e.tone,
        status: e.status,
      }));

      const data = await safeApiPost<AnalysisResult>("/api/analyze-audio", {
        audio: base64Audio || undefined,
        mimeType: mime,
        liveTranscript: bestLiveText || undefined,
        pastEntries: pastEntriesForAnalysis,
        userAge: user.age,
        parentEmail: user.parentEmail,
      });

      const extracted = extractCategorySegments(data.transcript || bestLiveText);
      const enriched: AnalysisResult = {
        ...data,
        winsExtracted:
          data.winsExtracted && data.winsExtracted.length > 0
            ? data.winsExtracted
            : extracted.winsExtracted,
        hardMomentsExtracted:
          data.hardMomentsExtracted && data.hardMomentsExtracted.length > 0
            ? data.hardMomentsExtracted
            : extracted.hardMomentsExtracted,
        slowdownsExtracted:
          data.slowdownsExtracted && data.slowdownsExtracted.length > 0
            ? data.slowdownsExtracted
            : extracted.slowdownsExtracted,
      };

      const initialCat: "win" | "resilience" | "slowdown" =
        enriched.category || (enriched.resiliencePoint ? "resilience" : "win");
      setSelectedCategory(initialCat);
      setSlowdownCause(enriched.slowdownCause || "");
      setShowFullTranscript(false);
      setAiResult(enriched);
      setTopicStatus(enriched.isGrowthStory ? "resolved" : "ongoing");
    } catch (err: any) {
      setErrorMessage(err.message || "Could not process recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;

    setIsProcessing(true);
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
        pastEntries: pastEntriesForAnalysis,
        userAge: user.age,
        parentEmail: user.parentEmail,
      });

      const extracted = extractCategorySegments(data.transcript || typedText.trim());
      const enriched: AnalysisResult = {
        ...data,
        winsExtracted:
          data.winsExtracted && data.winsExtracted.length > 0
            ? data.winsExtracted
            : extracted.winsExtracted,
        hardMomentsExtracted:
          data.hardMomentsExtracted && data.hardMomentsExtracted.length > 0
            ? data.hardMomentsExtracted
            : extracted.hardMomentsExtracted,
        slowdownsExtracted:
          data.slowdownsExtracted && data.slowdownsExtracted.length > 0
            ? data.slowdownsExtracted
            : extracted.slowdownsExtracted,
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

    const primaryTakeaway = activeItems[0] || aiResult.win;

    const newEntry: WinEntry = {
      id: Math.random().toString(36).substring(2, 11),
      userId: user.uid,
      date: new Date().toISOString().split("T")[0],
      timestamp: Date.now(),
      category: selectedCategory,
      isWin: isWinOutcome,
      resiliencePoint: isResilienceOutcome,
      win: primaryTakeaway,
      transcript: aiResult.transcript,
      winsExtracted: aiResult.winsExtracted || [],
      hardMomentsExtracted: aiResult.hardMomentsExtracted || [],
      slowdownsExtracted: aiResult.slowdownsExtracted || [],
      detectedLanguage: aiResult.detectedLanguage || "English",
      sourceType: "voice",
      feedback: aiResult.feedback,
      slowdownCause: isSlowdownOutcome
        ? slowdownCause.trim() || aiResult.slowdownCause || "Distraction or stall"
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
      if (refineTimerRef.current) clearTimeout(refineTimerRef.current);
      if (audioLiveTimerRef.current) clearInterval(audioLiveTimerRef.current);
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
            {/* Compact Voice Capture Card */}
            <div className="apple-card rounded-[24px] p-6 flex flex-col items-center space-y-5 relative overflow-hidden">
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

              {/* Acoustic Wave Well */}
              <div className="w-full max-w-sm h-11 rounded-[16px] apple-well px-3.5 flex items-center justify-center overflow-hidden">
                {isRecording ? (
                  <canvas ref={canvasRef} width={320} height={36} className="w-full h-9" />
                ) : isProcessing ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-[#0F8B8D]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning speech &amp; sorting...</span>
                  </div>
                ) : (
                  <svg className="w-full h-6" viewBox="0 0 320 28" preserveAspectRatio="none">
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
                <div className="w-full rounded-[16px] apple-well p-3.5 text-xs text-[#1D1D1F] min-h-[52px] max-h-28 overflow-y-auto text-left leading-relaxed space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-[#0F8B8D]">
                    <span>Live Speech Cleanup</span>
                    {isRefiningLive && <span className="text-[#86868B]">Refining...</span>}
                  </div>
                  {liveTranscript ? (
                    <p>
                      {liveTranscript}
                      <span className="inline-block w-1.5 h-3 bg-[#0F8B8D] ml-1 animate-pulse align-middle" />
                    </p>
                  ) : (
                    <span className="text-[#86868B]">Listening and correcting sentences...</span>
                  )}
                </div>
              )}
            </div>

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
                className="btn-teal min-h-[44px] px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
              >
                <span>Log</span>
                <Send className="w-3.5 h-3.5" />
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0F8B8D]/15 pb-3.5">
              <div className="text-xs font-semibold text-[#0F8B8D]">
                {aiResult.detectedLanguage || "English"}
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
                { id: "win", label: "Win", activeColor: "text-[#0055FF]" },
                { id: "resilience", label: "Hard Moment", activeColor: "text-[#0F8B8D]" },
                { id: "slowdown", label: "Slowed Down", activeColor: "text-[#C86D44]" },
              ].map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as "win" | "resilience" | "slowdown")}
                    className={`min-h-[40px] px-2.5 py-1.5 rounded-[12px] text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? `bg-[#FFFFFF] ${cat.activeColor} shadow-xs font-semibold`
                        : "text-[#515154] hover:text-[#1D1D1F]"
                    }`}
                  >
                    {cat.label}
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
                  ? "Wins from this entry"
                  : selectedCategory === "resilience"
                  ? "Hard moments from this entry"
                  : "Slowdowns from this entry";
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
                        No specific {selectedCategory === "win" ? "wins" : selectedCategory === "resilience" ? "hard moments" : "slowdowns"} found in this entry.
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
