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
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSession, WinEntry } from "../types";
import { calculateStreak } from "../utils/sovereignMetrics";
import { safeApiPost } from "../utils/safeApi";
import EntryActionBar from "./EntryActionBar";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [topicStatus, setTopicStatus] = useState<"ongoing" | "resolved">("ongoing");
  const [selectedCategory, setSelectedCategory] = useState<"win" | "resilience" | "slowdown">("win");
  const [slowdownCause, setSlowdownCause] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [extraTransform, setExtraTransform] = useState<{ label: string; content: string } | null>(null);

  const [liveTranscript, setLiveTranscript] = useState("");
  const liveTranscriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const processingStartTimeRef = useRef<number>(0);

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

        ctx.fillStyle = normalized > 0.55 ? "#C86F52" : "#4B6B53";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setAiResult(null);
    setExtraTransform(null);
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    audioChunksRef.current = [];
    setRecordingDuration(0);
    setProcessingTimeMs(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
          recognition.lang = navigator.language || "en-US";

          recognition.onresult = (event: any) => {
            let interim = "";
            let final = "";
            for (let i = 0; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript + " ";
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            const combined = (final + interim).trim();
            if (combined) {
              setLiveTranscript(combined);
              liveTranscriptRef.current = combined;
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }

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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setIsRecording(false);
    setShowCheckmark(true);
    setTimeout(() => setShowCheckmark(false), 750);
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

  const processRecordedAudio = async () => {
    const extractedLiveText = (liveTranscriptRef.current || "").trim();
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
    processingStartTimeRef.current = Date.now();

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
        liveTranscript: extractedLiveText || undefined,
        pastEntries: pastEntriesForAnalysis,
        userAge: user.age,
        parentEmail: user.parentEmail,
      });

      setProcessingTimeMs(Date.now() - processingStartTimeRef.current);
      const initialCat: "win" | "resilience" | "slowdown" =
        data.category || (data.resiliencePoint ? "resilience" : "win");
      setSelectedCategory(initialCat);
      setSlowdownCause(data.slowdownCause || "");
      setAiResult(data);
      setTopicStatus(data.isGrowthStory ? "resolved" : "ongoing");
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
    setExtraTransform(null);
    processingStartTimeRef.current = Date.now();

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

      setProcessingTimeMs(Date.now() - processingStartTimeRef.current);
      const initialCat: "win" | "resilience" | "slowdown" =
        data.category || (data.resiliencePoint ? "resilience" : "win");
      setSelectedCategory(initialCat);
      setSlowdownCause(data.slowdownCause || "");
      setAiResult(data);
      setTopicStatus(data.isGrowthStory ? "resolved" : "ongoing");
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

    const newEntry: WinEntry = {
      id: Math.random().toString(36).substring(2, 11),
      userId: user.uid,
      date: new Date().toISOString().split("T")[0],
      timestamp: Date.now(),
      category: selectedCategory,
      isWin: isWinOutcome,
      resiliencePoint: isResilienceOutcome,
      win: aiResult.win,
      transcript: aiResult.transcript,
      detectedLanguage: aiResult.detectedLanguage || "Auto-detected",
      sourceType: "voice",
      summary: extraTransform?.label === "Executive Summary" ? extraTransform.content : null,
      formattedNotes:
        extraTransform &&
        extraTransform.label !== "Executive Summary" &&
        !extraTransform.label.startsWith("Translated")
          ? extraTransform.content
          : null,
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
      {/* Compact Header */}
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#1D241F] tracking-tight">
          {getGreeting()}
        </h2>
        <p className="text-xs font-mono text-[#546257] flex items-center justify-center flex-wrap gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 text-[#4B6B53] font-medium">
            <Globe className="w-3.5 h-3.5" />
            <span>95+ Languages · Auto-detect</span>
          </span>
          <span className="text-[#546257]/40">·</span>
          <span className="tabular-nums">
            Streak: {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </span>
        </p>
      </div>

      {errorMessage && (
        <div className="glass-panel rounded-xl p-3.5 border-[#C86F52]/40 bg-[#C86F52]/10 flex items-start gap-2.5 text-left">
          <AlertCircle className="w-4 h-4 text-[#C86F52] shrink-0 mt-0.5" />
          <p className="text-xs text-[#1D241F]">{errorMessage}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!aiResult ? (
          <motion.div
            key="compact-capture"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Compact Voice Hub directly framed by gentle waves */}
            <div className="glass-panel rounded-3xl px-6 py-7 flex flex-col items-center space-y-5 relative overflow-hidden">
              <div className="relative flex items-center justify-center">
                {isRecording && (
                  <>
                    {[0, 1].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-[#C86F52]/40 pointer-events-none"
                        style={{ width: 88, height: 88 }}
                        initial={{ scale: 1, opacity: 0.7 }}
                        animate={{ scale: [1, 1.5, 1.85], opacity: [0.65, 0.25, 0] }}
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
                  className={`relative z-10 w-22 h-22 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-60 active:scale-95 ${
                    showCheckmark
                      ? "bg-[#EFF3EC] border border-[#4B6B53] text-[#4B6B53]"
                      : isRecording
                      ? "bg-[#C86F52]/12 border-2 border-[#C86F52] text-[#C86F52] shadow-md"
                      : "btn-sage"
                  }`}
                >
                  {showCheckmark ? (
                    <Check className="w-6 h-6 text-[#4B6B53]" />
                  ) : isRecording ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <Square className="w-4 h-4 fill-[#C86F52] text-[#C86F52]" />
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-[#1D241F]">
                        {formatDuration(recordingDuration)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Mic className="w-6 h-6" />
                      <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                        Record
                      </span>
                    </div>
                  )}
                </button>
              </div>

              {/* Compact Acoustic Wave Bar */}
              <div className="w-full max-w-sm h-10 rounded-xl bg-[#F4F6F0] border border-[#233428]/10 px-3 flex items-center justify-center overflow-hidden">
                {isRecording ? (
                  <canvas ref={canvasRef} width={320} height={36} className="w-full h-9" />
                ) : isProcessing ? (
                  <div className="flex items-center gap-2 text-xs font-mono text-[#4B6B53]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transcribing &amp; structuring...</span>
                  </div>
                ) : (
                  <svg className="w-full h-6 text-[#4B6B53]/35" viewBox="0 0 320 28" preserveAspectRatio="none">
                    <motion.path
                      d="M 0 14 Q 40 4 80 14 T 160 14 T 240 14 T 320 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
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
                <div className="w-full rounded-xl bg-[#F4F6F0] border border-[#233428]/10 p-3 text-xs text-[#1D241F] min-h-[44px] max-h-24 overflow-y-auto text-left leading-relaxed">
                  {liveTranscript ? (
                    <span>
                      {liveTranscript}
                      <span className="inline-block w-1.5 h-3 bg-[#4B6B53] ml-1 animate-pulse align-middle" />
                    </span>
                  ) : (
                    <span className="text-[#546257]">Listening... speak naturally in any language.</span>
                  )}
                </div>
              )}
            </div>

            {/* Compact Slim Quick Text Note Bar */}
            <form
              onSubmit={handleTextSubmit}
              className="glass-panel rounded-2xl p-2 flex items-center gap-2"
            >
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Quick note in any language..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-[#1D241F] placeholder-[#546257]/70 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing || !typedText.trim()}
                aria-label="Send quick note"
                className="btn-sage min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
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
            className="glass-panel rounded-3xl p-6 space-y-5 text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#233428]/10 pb-3.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#546257]">
                <span className="text-[#1D241F] font-semibold uppercase tracking-wider">Captured</span>
                <span>·</span>
                <span className="text-[#4B6B53] font-medium">
                  {aiResult.detectedLanguage || "Auto-detected"}
                </span>
                {processingTimeMs !== null && (
                  <>
                    <span>·</span>
                    <span className="tabular-nums">{(processingTimeMs / 1000).toFixed(2)}s</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#EFF2EA] hover:bg-[#E2E8DA] border border-[#233428]/10 text-xs font-mono text-[#1D241F] inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isEditing ? <Check className="w-3.5 h-3.5 text-[#4B6B53]" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{isEditing ? "Done" : "Edit"}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "win", label: "Win" },
                { id: "resilience", label: "Hard Moment" },
                { id: "slowdown", label: "Slowed Down" },
              ].map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as "win" | "resilience" | "slowdown")}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
                      active
                        ? "bg-[#4B6B53] border-[#4B6B53] text-white font-medium"
                        : "bg-[#F4F6F0] border-[#233428]/10 text-[#546257] hover:text-[#1D241F]"
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
                className="glass-input w-full rounded-xl px-3.5 py-2 text-xs"
              />
            )}

            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#546257]">
                Takeaway
              </span>
              {isEditing ? (
                <textarea
                  value={aiResult.win}
                  onChange={(e) => setAiResult({ ...aiResult, win: e.target.value })}
                  rows={2}
                  className="glass-input w-full rounded-xl p-2.5 text-sm font-display"
                />
              ) : (
                <p className="text-base sm:text-lg font-display font-semibold text-[#1D241F] leading-snug">
                  {aiResult.win}
                </p>
              )}
            </div>

            {aiResult.safetyTier === "crisis" && (
              <div className="rounded-xl bg-[#C86F52]/12 border border-[#C86F52]/40 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#C86F52] font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Support Resources</span>
                </div>
                <p className="text-xs font-mono text-[#1D241F] whitespace-pre-line">
                  {aiResult.crisisResources ||
                    "988 Suicide & Crisis Lifeline · Text HOME to 741741 · findahelpline.com"}
                </p>
              </div>
            )}

            <p className="text-xs sm:text-sm text-[#546257] border-l-2 border-[#4B6B53]/50 pl-3 leading-relaxed">
              {aiResult.feedback}
            </p>

            {aiResult.transcript && (
              <div className="rounded-2xl bg-[#F4F6F0] border border-[#233428]/10 p-3.5 space-y-3">
                {isEditing ? (
                  <textarea
                    value={aiResult.transcript}
                    onChange={(e) => setAiResult({ ...aiResult, transcript: e.target.value })}
                    rows={3}
                    className="glass-input w-full rounded-xl p-2.5 text-xs"
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-[#1D241F] leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {aiResult.transcript}
                  </p>
                )}

                <EntryActionBar
                  text={aiResult.transcript}
                  title={aiResult.win}
                  detectedLanguage={aiResult.detectedLanguage}
                  category={selectedCategory}
                  onOutputGenerated={(out) => setExtraTransform(out)}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-[#233428]/10">
              {aiResult.safetyTier === "crisis" ? (
                <button
                  type="button"
                  onClick={() => {
                    setAiResult(null);
                    setIsEditing(false);
                  }}
                  className="flex-1 min-h-[42px] py-2 bg-[#C86F52] text-white text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Close Session
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEntry}
                    className="btn-sage flex-1 min-h-[42px] py-2 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
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
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#EFF2EA] hover:bg-[#E2E8DA] border border-[#233428]/10 text-xs font-mono uppercase text-[#546257] cursor-pointer"
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
