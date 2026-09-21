import React, { useState, useRef, useEffect } from "react";
import { Mic, Edit3, Send, Sparkles, AlertCircle, RefreshCw, BookmarkCheck, X, Check, Clock, Heart, Flame, ShieldAlert, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSession, WinEntry } from "../types";
import { calculateStreak } from "../utils/sovereignMetrics";

interface CommandCenterProps {
  user: UserSession;
  entries: WinEntry[];
  onEntrySaved: (entry: WinEntry) => void;
}

export default function CommandCenter({ user, entries, onEntrySaved }: CommandCenterProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [topicStatus, setTopicStatus] = useState<"ongoing" | "resolved">("ongoing");
  const [selectedCategory, setSelectedCategory] = useState<"win" | "resilience" | "slowdown">("win");
  const [slowdownCause, setSlowdownCause] = useState<string>("");
  const [speakLanguage, setSpeakLanguage] = useState<"english" | "urdu">("english");
  const [isEditing, setIsEditing] = useState(false);

  // States for the generated AI result preview
  const [aiResult, setAiResult] = useState<{
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
    parentAlertDispatched?: boolean;
  } | null>(null);

  // References for Web Audio API
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentStreak = calculateStreak(entries);

  // Time-based serene greeting
  const getGreeting = () => {
    const hours = new Date().getHours();
    const name = user.displayName?.split(" ")[0] || "Friend";
    if (hours < 12) return `Good morning, ${name}.`;
    if (hours < 18) return `Good afternoon, ${name}.`;
    if (hours < 22) return `Good evening, ${name}.`;
    return `Good night, ${name}.`;
  };

  // Format recording duration into MM:SS with no cutoff
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start Voice Recording (no time limit)
  const startRecording = async () => {
    setErrorMessage(null);
    setAiResult(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio API for visualizer
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        drawVisualizer();
      }

      // Configure MediaRecorder
      const options = { mimeType: "audio/webm" };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudioPayload();
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      // Start duration timer - unbounded count up, NO cutoff
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Microphone access error:", err);
      let errorText = "Could not access microphone. Please allow microphone permissions in your browser or use the text option below.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorText = "Microphone access was denied. You can enable it in your browser settings or type your reflection below.";
      }
      setErrorMessage(errorText);
      setShowTextInput(true);
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }

    setIsRecording(false);
    
    setShowCheckmark(true);
    setTimeout(() => {
      setShowCheckmark(false);
    }, 1000);
  };

  // Draw Wave Visualizer
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Warm sand background
      ctx.fillStyle = "#f4efe6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 0.45;
        ctx.fillStyle = `rgba(98, 117, 96, ${Math.max(0.3, barHeight / 110)})`;
        const yPos = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, yPos, barWidth - 1.5, barHeight);
        x += barWidth;
      }
    };

    draw();
  };

  // Process and send recorded audio to backend API
  const processAudioPayload = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" });
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(",")[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });

      // Contextual past entries for multi-day pattern detection and tone tracking
      const pastEntriesForAnalysis = entries.slice(0, 8).map(e => ({
        win: e.win,
        transcript: e.transcript,
        date: e.date,
        tone: e.tone,
        status: e.status
      }));

      const response = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: mediaRecorderRef.current?.mimeType || "audio/webm",
          pastEntries: pastEntriesForAnalysis,
          userAge: user.age,
          parentEmail: user.parentEmail,
          languageMode: speakLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis request failed");
      }

      const data = await response.json();
      const initialCat: "win" | "resilience" | "slowdown" = data.category || (data.resiliencePoint ? "resilience" : "win");
      setSelectedCategory(initialCat);
      setSlowdownCause(data.slowdownCause || "");
      setAiResult(data);
      setTopicStatus(data.isGrowthStory ? "resolved" : "ongoing");

    } catch (err: any) {
      console.error("Audio processing error:", err);
      setErrorMessage(err.message || "Could not analyze your reflection. Please try again or type instead.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Process text-based reflection
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setAiResult(null);

    try {
      const pastEntriesForAnalysis = entries.slice(0, 8).map(e => ({
        win: e.win,
        transcript: e.transcript,
        date: e.date,
        tone: e.tone,
        status: e.status
      }));

      const response = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textBackup: typedText,
          pastEntries: pastEntriesForAnalysis,
          userAge: user.age,
          parentEmail: user.parentEmail,
          languageMode: speakLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis request failed");
      }

      const data = await response.json();
      const initialCat: "win" | "resilience" | "slowdown" = data.category || (data.resiliencePoint ? "resilience" : "win");
      setSelectedCategory(initialCat);
      setSlowdownCause(data.slowdownCause || "");
      setAiResult(data);
      setTopicStatus(data.isGrowthStory ? "resolved" : "ongoing");
      setTypedText("");
    } catch (err: any) {
      console.error("Text processing error:", err);
      setErrorMessage(err.message || "Failed to process text entry.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the check-in to your history
  const handleVaultEntry = () => {
    if (!aiResult) return;

    const isWinOutcome = selectedCategory === "win";
    const isResilienceOutcome = selectedCategory === "resilience";
    const isSlowdownOutcome = selectedCategory === "slowdown";

    const newEntry: WinEntry = {
      id: Math.random().toString(36).substr(2, 9), 
      userId: user.uid,
      date: new Date().toISOString().split("T")[0],
      timestamp: Date.now(),
      category: selectedCategory,
      isWin: isWinOutcome,
      resiliencePoint: isResilienceOutcome,
      win: aiResult.win,
      transcript: aiResult.transcript,
      feedback: aiResult.feedback,
      slowdownCause: isSlowdownOutcome ? (slowdownCause.trim() || aiResult.slowdownCause || "Distraction or procrastination") : null,
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
      badHabitInsight: aiResult.badHabitInsight || null
    };

    onEntrySaved(newEntry);
    setAiResult(null);
    setIsEditing(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="space-y-8 max-w-2xl mx-auto px-4 py-4" id="command-center-root">
      
      {/* Visual Header / Greeting */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl md:text-4xl font-serif text-earth-900 tracking-tight leading-none">
          {getGreeting()}
        </h2>
        <p className="text-earth-600 text-sm max-w-md mx-auto leading-relaxed">
          Talk for as long as you want — no timer, no cutoff. Lumina will isolate your agency, reply specifically to what you said, and quietly catalog your resilience.
        </p>

        {/* Quiet Streak Indicator */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-earth-100 border border-earth-200 text-xs font-mono text-earth-700">
            <span className="w-2 h-2 rounded-full bg-sage" />
            <span>Streak: {currentStreak} {currentStreak === 1 ? "day" : "days"}</span>
          </div>
        </div>
      </div>

      {/* Error Announcement */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs text-left">
          <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Recording Area UI */}
      <AnimatePresence mode="wait">
        {!aiResult ? (
          <motion.div 
            key="recording-panel"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex flex-col items-center justify-center space-y-5 py-4"
          >
            {/* Speech Language Option: English (Default) vs Speak in Urdu */}
            {!isRecording && !isProcessing && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="inline-flex items-center p-1 bg-earth-100/90 border border-earth-200 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSpeakLanguage("english")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      speakLanguage === "english"
                        ? "bg-white text-earth-900 font-semibold shadow-xs"
                        : "text-earth-600 hover:text-earth-900"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeakLanguage("urdu")}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                      speakLanguage === "urdu"
                        ? "bg-earth-900 text-white font-semibold shadow-xs"
                        : "text-earth-600 hover:text-earth-900"
                    }`}
                  >
                    <span>Speak in Urdu</span>
                    <span className={`text-[10px] ${speakLanguage === "urdu" ? "text-sage-200" : "text-earth-500"}`}>
                      (Auto-converts to English)
                    </span>
                  </button>
                </div>
                {speakLanguage === "urdu" && (
                  <motion.p
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-mono text-sage font-medium text-center"
                  >
                    Speak in Urdu — auto-translated & saved in English
                  </motion.p>
                )}
              </div>
            )}

            {/* The circular tactile hub */}
            <div className="relative flex items-center justify-center">
              
              {/* Outer Pulse Breathing Halo during recording */}
              <AnimatePresence>
                {isRecording && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={`pulse-${i}`}
                        className="absolute rounded-full border border-terracotta/20 bg-terracotta/[0.015] blur-[3px] pointer-events-none"
                        style={{ width: "160px", height: "160px" }}
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{
                          scale: [1, 1.4, 1.8],
                          opacity: [0.6, 0.25, 0],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          delay: i * 0.7,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>

              {/* Main Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing || showCheckmark}
                className={`relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                  showCheckmark
                    ? "bg-white border border-sage text-sage shadow-md"
                    : isRecording 
                      ? "bg-white border-2 border-terracotta text-terracotta shadow-lg" 
                      : "bg-white border border-earth-200 hover:border-sage/40 text-sage shadow-sm hover:shadow-md"
                } disabled:opacity-50 active:scale-95`}
              >
                <AnimatePresence mode="wait">
                  {showCheckmark ? (
                    <motion.div
                      key="checkmark"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex flex-col items-center justify-center text-sage"
                    >
                      <Check className="w-8 h-8 text-sage" />
                      <span className="text-[9px] font-mono tracking-widest uppercase mt-1.5 font-bold text-sage">
                        CAPTURED
                      </span>
                    </motion.div>
                  ) : isRecording ? (
                    <motion.div
                      key="recording"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex flex-col items-center justify-center space-y-1 text-center"
                    >
                      <X className="w-6 h-6 text-terracotta animate-pulse" />
                      
                      {/* Live unbounded timer */}
                      <span className="font-mono text-base font-bold text-earth-900 tracking-wider">
                        {formatDuration(recordingDuration)}
                      </span>
                      
                      <span className="text-[8px] font-mono tracking-widest uppercase text-earth-500 font-bold">
                        TAP TO COMPLETE
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex flex-col items-center justify-center text-center"
                    >
                      <Mic className="w-8 h-8 text-sage" />
                      <span className="text-[9px] font-mono tracking-widest uppercase mt-2 font-bold text-sage">
                        {speakLanguage === "urdu" ? "TALK IN URDU" : "TAP TO TALK"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Timer and Wave Visualizer */}
            {isRecording ? (
              <div className="w-full space-y-3 text-center max-w-sm">
                <p className="text-[11px] text-sage font-mono uppercase tracking-widest animate-pulse font-semibold">
                  {speakLanguage === "urdu"
                    ? "Recording in Urdu • Auto-converting to English"
                    : "Recording actively • No time limit • Tap when finished"}
                </p>
                <div className="w-full h-11 bg-earth-100 rounded-xl border border-earth-200 overflow-hidden shadow-inner">
                  <canvas ref={canvasRef} width="350" height="44" className="w-full h-full" />
                </div>
              </div>
            ) : (
              <p className="text-[10px] font-mono text-earth-500 uppercase tracking-widest font-semibold">
                {speakLanguage === "urdu"
                  ? "Urdu voice active • All reflections auto-converted to English"
                  : "Private voice ledger • Take as much time as you need"}
              </p>
            )}

            {/* Processing State Loader */}
            {isProcessing && (
              <div className="flex flex-col items-center space-y-3 pt-2">
                <RefreshCw className="w-5 h-5 text-terracotta animate-spin" />
                <p className="text-[10px] font-mono text-terracotta tracking-widest uppercase animate-pulse font-semibold">
                  {speakLanguage === "urdu"
                    ? "Translating Urdu audio & converting into English..."
                    : "Isolating agency & crystallizing your reflection..."}
                </p>
              </div>
            )}

            {/* Text backup toggle */}
            {!isRecording && !isProcessing && (
              <div className="pt-2 w-full text-center max-w-md">
                <button
                  type="button"
                  onClick={() => setShowTextInput(!showTextInput)}
                  className="inline-flex items-center gap-1.5 text-xs text-earth-500 hover:text-terracotta transition-colors uppercase font-mono tracking-wider cursor-pointer font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {showTextInput ? "Hide Quiet Text Input" : "Prefer typing? Use Text Option"}
                </button>

                <AnimatePresence>
                  {showTextInput && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleTextSubmit}
                      className="mt-4 space-y-3 text-left"
                    >
                      <textarea
                        required
                        value={typedText}
                        onChange={(e) => setTypedText(e.target.value)}
                        placeholder={
                          speakLanguage === "urdu"
                            ? "Type in Urdu (اردو or Roman Urdu) — will auto-convert to English..."
                            : "Speak your mind freely or write what happened today..."
                        }
                        rows={3}
                        className="w-full bg-white border border-earth-200 rounded-xl p-3.5 text-sm text-earth-900 placeholder-earth-400 focus:outline-none focus:border-terracotta/40 focus:ring-1 focus:ring-terracotta/10 transition-all shadow-sm"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-earth-900 hover:bg-earth-800 text-white text-xs font-mono uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          Synthesize
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          /* Simple, High-Clarity Result Screen */
          <motion.div
            key="result-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="p-6 sm:p-7 bg-white rounded-3xl border border-earth-200 shadow-md text-left space-y-5 relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-earth-200 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-terracotta" />
                <span className="text-xs font-mono uppercase tracking-wider text-earth-800 font-bold">
                  Check-in Complete
                </span>
                {speakLanguage === "urdu" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sage/15 text-sage-900 border border-sage/30">
                    Urdu → English
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {aiResult.tone && (
                  <span className="text-[10px] font-mono capitalize px-2 py-0.5 rounded bg-earth-100 text-earth-700 border border-earth-200">
                    Tone: {aiResult.tone}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                    isEditing
                      ? "bg-sage text-white border-sage font-bold shadow-xs"
                      : "bg-earth-50 hover:bg-earth-100 text-earth-800 border-earth-200"
                  }`}
                  title="Edit check-in text, words or spellings"
                >
                  {isEditing ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Done Editing</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5 text-sage" />
                      <span>Edit Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Edit mode notification banner */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-sage/10 border border-sage/30 rounded-2xl text-xs flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2 text-earth-900">
                  <Edit3 className="w-4 h-4 text-sage shrink-0" />
                  <span>
                    <strong>Edit mode active:</strong> You can edit the main takeaway or speech text below to fix typos or misspelled words before saving.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 bg-sage text-white text-[11px] font-mono rounded-lg font-bold hover:bg-sage/90 transition-all shrink-0 cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            )}

            {/* Clear Category Selection: Win vs Hard Moment vs Slowed Down */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-earth-500 uppercase tracking-wider font-semibold">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("win")}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedCategory === "win"
                      ? "bg-sage/15 text-sage-900 border-sage font-bold shadow-sm"
                      : "bg-earth-50 text-earth-600 border-earth-200 hover:bg-earth-100"
                  }`}
                >
                  <span>🏆</span>
                  <span>Win</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("resilience")}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedCategory === "resilience"
                      ? "bg-blue-50 text-blue-900 border-blue-400 font-bold shadow-sm"
                      : "bg-earth-50 text-earth-600 border-earth-200 hover:bg-earth-100"
                  }`}
                >
                  <span>💪</span>
                  <span>Hard Moment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("slowdown")}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedCategory === "slowdown"
                      ? "bg-amber-50 text-amber-900 border-amber-400 font-bold shadow-sm"
                      : "bg-earth-50 text-earth-600 border-earth-200 hover:bg-earth-100"
                  }`}
                >
                  <span>⏳</span>
                  <span>Slowed Down</span>
                </button>
              </div>
            </div>

            {/* What caused you to fall back (only shown or highlighted if Slowed Down) */}
            {selectedCategory === "slowdown" && (
              <div className="p-4 bg-amber-50/80 border border-amber-300/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-amber-950 font-semibold text-xs">
                  <span>⏳</span>
                  <span>What caused you to fall back or procrastinate:</span>
                </div>
                <input
                  type="text"
                  value={slowdownCause}
                  onChange={(e) => setSlowdownCause(e.target.value)}
                  placeholder="e.g., Feeling overwhelmed, tired after work, or distracted by phone"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs text-earth-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>
            )}

            {/* Main Takeaway */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-mono text-earth-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <span>Main Takeaway</span>
                  {isEditing && <span className="text-sage font-bold">(Editable)</span>}
                </h4>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-[11px] font-mono text-sage hover:text-earth-900 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={aiResult.win}
                  onChange={(e) => setAiResult({ ...aiResult, win: e.target.value })}
                  rows={2}
                  className="w-full bg-earth-50/80 border border-sage/50 rounded-xl p-3 text-base sm:text-lg font-serif text-earth-900 focus:outline-none focus:border-sage focus:bg-white focus:ring-2 focus:ring-sage/20 transition-all shadow-inner leading-snug"
                  placeholder="Edit takeaway text or correct spelling..."
                />
              ) : (
                <p className="text-base sm:text-lg font-serif text-earth-900 tracking-tight leading-snug">
                  "{aiResult.win}"
                </p>
              )}
            </div>

            {/* Explicit Crisis Banner if triggered */}
            {aiResult.safetyTier === "crisis" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-left">
                <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Regional Crisis Resources</span>
                </div>
                <div className="p-3 bg-white border border-red-200 rounded-xl text-xs font-mono text-red-800 whitespace-pre-line">
                  {aiResult.crisisResources || "• 988 Suicide & Crisis Lifeline: Call or text 988 (24/7)\n• Crisis Text Line: Text HOME to 741741"}
                </div>
              </div>
            )}

            {/* Friendly Feedback */}
            <div className="space-y-1">
              <h4 className="text-[10px] font-mono text-earth-400 uppercase tracking-widest font-semibold">
                Note
              </h4>
              <p className="text-xs sm:text-sm text-earth-700 leading-relaxed pl-3 border-l-2 border-terracotta/40">
                {aiResult.feedback}
              </p>
            </div>

            {/* What user said */}
            {aiResult.transcript && (
              <div className={`space-y-1.5 p-3 rounded-xl border transition-all ${
                isEditing ? "bg-earth-50 border-sage/40" : "bg-earth-50 border-earth-200"
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-mono text-earth-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <span>What You Said</span>
                    {isEditing && <span className="text-sage font-bold">(Editable)</span>}
                  </h4>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[10px] font-mono text-sage hover:text-earth-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <textarea
                    value={aiResult.transcript}
                    onChange={(e) => setAiResult({ ...aiResult, transcript: e.target.value })}
                    rows={3}
                    className="w-full bg-white border border-earth-200 rounded-lg p-2.5 text-xs text-earth-900 focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20 font-sans transition-all leading-relaxed"
                    placeholder="Edit speech transcript to correct any words or spelling..."
                  />
                ) : (
                  <p className="text-xs text-earth-600 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {aiResult.transcript}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons: Single tap save with no fatigue */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-earth-200">
              {aiResult.safetyTier === "crisis" ? (
                <button
                  type="button"
                  onClick={() => {
                    setAiResult(null);
                    setIsEditing(false);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Close & Take Care of Yourself
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleVaultEntry}
                    className="flex-1 py-3 bg-earth-900 hover:bg-earth-800 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    Save Check-in
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={`py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-mono uppercase tracking-wider border ${
                      isEditing
                        ? "bg-sage text-white border-sage hover:bg-sage/90 font-bold"
                        : "bg-earth-100 hover:bg-earth-200 text-earth-800 border-earth-200"
                    }`}
                    title="Edit check-in text, words or spellings"
                  >
                    {isEditing ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Done Editing</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5 text-sage" />
                        <span>Edit Text</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAiResult(null);
                      setIsEditing(false);
                    }}
                    className="py-3 px-4 bg-earth-100 hover:bg-earth-200 text-earth-700 text-xs font-mono uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Start Over
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
