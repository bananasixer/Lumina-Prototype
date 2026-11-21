import React, { useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
} from "../lib/firebase";
import {
  Mail,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Mic,
  ShieldCheck,
  Globe,
  TrendingUp,
  User,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSession } from "../types";
import GammaWavesBackground from "./GammaWavesBackground";
import Header from "./Header";
import SlideOutDrawer from "./SlideOutDrawer";
import LuminaLogo from "./LuminaLogo";

interface SecureGatewayProps {
  onAuthSuccess: (user: UserSession) => void;
  onOpenPrivacy: () => void;
}

const PREVIEW_SAMPLES = [
  {
    id: "win",
    label: "Daily Win",
    category: "Win",
    spoken: "Wrapped up the backend API cleanup and finished all integration tests cleanly before evening.",
    takeaway: "Completed API cleanup and passed all integration tests.",
  },
  {
    id: "resilience",
    label: "Hard Moment",
    category: "Hard Moment",
    spoken: "Hit three dead ends debugging state sync today, stepped back for water, and finally isolated the race condition.",
    takeaway: "Persisted through three debugging blocks and resolved the state race condition.",
  },
  {
    id: "slowdown",
    label: "Slowdown",
    category: "Slowed Down",
    spoken: "Lost almost two hours switching between tabs instead of tackling the draft first.",
    takeaway: "Context switching delayed primary draft work.",
  },
];

export default function SecureGateway({ onAuthSuccess, onOpenPrivacy }: SecureGatewayProps) {
  const [heroEmail, setHeroEmail] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);

  useEffect(() => {
    try {
      localStorage.removeItem("lumina_blocked_underage");
      const lastEmail =
        localStorage.getItem("lumina_last_email") ||
        localStorage.getItem("lumina_last_google_email") ||
        "";
      const lastName = localStorage.getItem("lumina_last_name") || "";
      if (lastEmail) {
        setEmail(lastEmail);
        setHeroEmail(lastEmail);
      }
      if (lastName) setFullName(lastName);
    } catch {}
  }, []);

  const signInWithCleanEmail = async (rawEmail: string, rawName?: string) => {
    const cleanEmail = (rawEmail || "").trim().toLowerCase();
    const cleanName = (rawName || "").trim() || cleanEmail.split("@")[0] || "Builder";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    const deterministicSecret = `Lumina_Auth_${btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}_!9X`;
    let uid = "usr_" + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);

    try {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, deterministicSecret);
        uid = cred.user.uid;
        if (cleanName && (!cred.user.displayName || cred.user.displayName !== cleanName)) {
          await updateProfile(cred.user, { displayName: cleanName });
        }
      } catch (signInErr: any) {
        if (
          signInErr.code === "auth/user-not-found" ||
          signInErr.code === "auth/invalid-credential"
        ) {
          const createCred = await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            deterministicSecret
          );
          await updateProfile(createCred.user, { displayName: cleanName });
          uid = createCred.user.uid;
        }
      }
    } catch {
      try {
        if (!auth.currentUser) {
          const anonCred = await signInAnonymously(auth);
          await updateProfile(anonCred.user, { displayName: cleanName });
          uid = anonCred.user.uid;
        } else {
          uid = auth.currentUser.uid;
        }
      } catch {}
    }

    const resolveJoinTimestamp = (
      userUid: string,
      fbUser?: { metadata?: { creationTime?: string } } | null
    ) => {
      const metaMs = fbUser?.metadata?.creationTime ? Date.parse(fbUser.metadata.creationTime) : NaN;
      try {
        const key = `lumina_joined_at_${userUid}`;
        const existing = localStorage.getItem(key);
        if (existing && !Number.isNaN(Number(existing))) return Number(existing);
        const resolved = !Number.isNaN(metaMs) ? metaMs : Date.now();
        localStorage.setItem(key, String(resolved));
        return resolved;
      } catch {
        return !Number.isNaN(metaMs) ? metaMs : Date.now();
      }
    };

    try {
      localStorage.setItem("lumina_last_email", cleanEmail);
      localStorage.setItem("lumina_last_name", cleanName);
    } catch {}

    onAuthSuccess({
      uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: auth.currentUser?.photoURL || null,
      createdAt: resolveJoinTimestamp(uid, auth.currentUser),
      dob: "2000-01-01",
      age: 25,
      ageVerified: true,
      ageAutoDetected: true,
      isDemo: false,
    });
    setLoading(false);
  };

  const handleHeroQuickStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = heroEmail.trim();
    if (!target || !target.includes("@")) {
      scrollToSection("auth-panel-card");
      setTimeout(() => document.getElementById("gateway-email-input")?.focus(), 320);
      return;
    }
    await signInWithCleanEmail(target, fullName || target.split("@")[0]);
  };

  const handleDirectEntry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      document.getElementById("gateway-email-input")?.focus();
      return;
    }
    await signInWithCleanEmail(email, fullName);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const cleanEmail = (result.user.email || "").toLowerCase();
        const cleanName = result.user.displayName || cleanEmail.split("@")[0] || "Builder";
        try {
          localStorage.setItem("lumina_last_email", cleanEmail);
          localStorage.setItem("lumina_last_name", cleanName);
        } catch {}

        const metaMs = result.user.metadata?.creationTime
          ? Date.parse(result.user.metadata.creationTime)
          : NaN;
        let joinedAt = !Number.isNaN(metaMs) ? metaMs : Date.now();
        try {
          const key = `lumina_joined_at_${result.user.uid}`;
          const existing = localStorage.getItem(key);
          if (existing && !Number.isNaN(Number(existing))) joinedAt = Number(existing);
          else localStorage.setItem(key, String(joinedAt));
        } catch {}

        onAuthSuccess({
          uid: result.user.uid,
          email: result.user.email,
          displayName: cleanName,
          photoURL: result.user.photoURL,
          createdAt: joinedAt,
          dob: "2000-01-01",
          age: 25,
          ageVerified: true,
          ageAutoDetected: true,
          isDemo: false,
        });
        setLoading(false);
        return;
      }
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      }
      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/operation-not-supported-in-this-environment"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {}
      }
      if (err.code === "auth/unauthorized-domain" || err.message?.includes("unauthorized-domain")) {
        if (email.trim() && email.includes("@")) {
          await handleDirectEntry();
          return;
        }
        setError("Enter your email and name below to continue on this preview domain.");
        scrollToSection("auth-panel-card");
        document.getElementById("gateway-email-input")?.focus();
        setLoading(false);
        return;
      }
      setError("Unable to open Google sign-in here. Enter your email below to continue.");
      scrollToSection("auth-panel-card");
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    onAuthSuccess({
      uid: "guest-" + Math.random().toString(36).substring(2, 8),
      email: "guest@lumina.local",
      displayName: "Guest",
      photoURL: null,
      isDemo: true,
      createdAt: Date.now(),
      dob: "2000-01-01",
      age: 25,
      ageVerified: true,
      ageAutoDetected: true,
    });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeSample = PREVIEW_SAMPLES[sampleIdx];

  return (
    <div className="min-h-screen flex flex-col relative bg-[#FFFFFF] text-[#1D1D1F]" id="secure-gateway-root">
      <GammaWavesBackground isActive={false} />

      <div className="relative z-10 flex-1 flex flex-col">
        <Header
          mode="landing"
          onLogoClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          onPrimaryAction={() => scrollToSection("auth-panel-card")}
          onOpenMenu={() => setDrawerOpen(true)}
          navItems={[
            { label: "Capabilities", onClick: () => scrollToSection("landing-product") },
            { label: "How It Works", onClick: () => scrollToSection("landing-how-it-works") },
            { label: "Use Cases", onClick: () => scrollToSection("landing-use-cases") },
          ]}
        />

        <SlideOutDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode="landing"
          onOpenApp={() => scrollToSection("auth-panel-card")}
          onScrollSection={scrollToSection}
          onOpenPrivacy={onOpenPrivacy}
        />

        <main className="flex-1">
          {/* TOP-TIER EDITORIAL HERO directly over floating glass canvas */}
          <section className="relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6 space-y-6 text-left"
              >
                <div className="text-xs font-semibold tracking-wide text-[#0F8B8D]">
                  Private Voice &amp; Progress Record
                </div>

                <h1 className="text-[clamp(2.5rem,4.5vw,3.9rem)] font-display font-bold tracking-[-0.032em] leading-[1.06] text-[#1D1D1F] text-balance">
                  Speak freely. Keep an honest record.
                </h1>

                <p className="text-[16px] sm:text-[17px] text-[#515154] leading-[1.6] max-w-[44ch]">
                  Capture daily progress by voice or quick note, clarify what actually moved forward, and see your real consistency over time—without noise or public feeds.
                </p>

                {/* Unified Sleek Inline Launch Bar (replacing awkward twin pill buttons) */}
                <div className="space-y-3 pt-1 max-w-md">
                  <form
                    onSubmit={handleHeroQuickStart}
                    className="rounded-2xl bg-white/90 backdrop-blur-xl border border-[#0F8B8D]/20 p-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shadow-[0_12px_32px_-8px_rgba(15,139,141,0.12)]"
                  >
                    <input
                      type="email"
                      value={heroEmail}
                      onChange={(e) => setHeroEmail(e.target.value)}
                      placeholder="Enter email to open workspace..."
                      aria-label="Email address"
                      className="flex-1 min-h-[44px] bg-transparent px-3.5 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-[44px] px-5 rounded-xl bg-[#0055FF] hover:bg-[#0044CC] text-white text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 active:scale-[0.98]"
                    >
                      <span>{loading ? "Opening..." : "Begin"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs text-[#515154]">
                    <button
                      type="button"
                      onClick={handleDemoAccess}
                      className="inline-flex items-center gap-1.5 font-medium text-[#0F8B8D] hover:text-[#0B7072] hover:underline underline-offset-4 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Try Guest Workspace</span>
                    </button>
                    <span aria-hidden="true" className="text-[#86868B]">·</span>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="font-medium text-[#515154] hover:text-[#1D1D1F] hover:underline underline-offset-4 cursor-pointer"
                    >
                      Continue with Google
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Interactive Frosted Preview Module */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-6"
              >
                <div className="apple-card rounded-[24px] p-6 sm:p-7 space-y-5 text-left">
                  <div className="flex items-center justify-between border-b border-[#0F8B8D]/15 pb-3.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#1D1D1F]">
                      <Mic className="w-3.5 h-3.5 text-[#C86D44]" />
                      <span>Session Preview</span>
                    </div>
                    <span className="text-xs text-[#515154]">Voice · Quick Note</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[14px] bg-[#EDF7F6] border border-[#0F8B8D]/15">
                    {PREVIEW_SAMPLES.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSampleIdx(idx)}
                        className={`min-h-[36px] px-2.5 py-1 rounded-[10px] text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                          idx === sampleIdx
                            ? "bg-[#FFFFFF] text-[#0F8B8D] shadow-xs font-semibold"
                            : "text-[#515154] hover:text-[#1D1D1F]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Balanced Teal, Royal Blue, and Terracotta waveform bars */}
                  <div className="h-12 rounded-[16px] apple-well px-4 flex items-center justify-between gap-1.5">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <motion.span
                        key={i}
                        className={`w-1 rounded-full ${
                          i % 5 === 0
                            ? "bg-[#C86D44]"
                            : i % 2 === 0
                            ? "bg-[#0F8B8D]"
                            : "bg-[#0055FF]"
                        }`}
                        animate={{
                          height: ["22%", `${35 + ((i * 29) % 58)}%`, "22%"],
                        }}
                        transition={{
                          duration: 1.5 + (i % 4) * 0.25,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.04,
                        }}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSample.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-[#515154]">
                        <span>Transcript</span>
                        <span
                          className={
                            activeSample.category === "Slowed Down"
                              ? "text-[#C86D44] font-semibold"
                              : activeSample.category === "Hard Moment"
                              ? "text-[#0F8B8D] font-semibold"
                              : "text-[#0055FF] font-semibold"
                          }
                        >
                          {activeSample.category}
                        </span>
                      </div>
                      <p className="text-sm sm:text-[15px] text-[#1D1D1F] leading-relaxed">
                        &ldquo;{activeSample.spoken}&rdquo;
                      </p>
                      <div className="rounded-[16px] apple-well p-3.5 text-xs sm:text-[13px] text-[#1D1D1F] leading-relaxed">
                        <span className="text-[#0F8B8D] font-semibold block mb-0.5">Takeaway</span>
                        {activeSample.takeaway}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </section>

          {/* CORE CAPABILITIES BENTO GRID over translucent background */}
          <section className="py-16 sm:py-20 border-t border-[#0F8B8D]/10 relative" id="landing-product">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10 text-left">
              <div className="space-y-2 max-w-2xl">
                <span className="text-xs font-semibold tracking-wide text-[#0F8B8D]">Capabilities</span>
                <h2 className="text-3xl sm:text-[34px] font-display font-bold tracking-[-0.025em] leading-[1.15] text-[#1D1D1F] text-balance">
                  Built for clarity, honesty, and daily momentum.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div
                  id="landing-languages"
                  className="md:col-span-7 apple-card apple-card-hover rounded-[24px] p-6 sm:p-7 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-[14px] bg-[#EDF7F6] border border-[#0F8B8D]/25 flex items-center justify-center text-[#0F8B8D]">
                      <Mic className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-[#1D1D1F]">
                      Effortless Voice &amp; Quick Notes
                    </h3>
                    <p className="text-sm text-[#515154] leading-relaxed">
                      Speak naturally without pausing to organize every word, or jot a brief note when typing is easier. Lumina cleans up raw phrasing into clear takeaways.
                    </p>
                  </div>
                  <div className="text-xs text-[#0F8B8D] border-t border-[#0F8B8D]/15 pt-3.5 font-medium">
                    Live Transcription · Automatic Clean Takeaways
                  </div>
                </div>

                <div className="md:col-span-5 apple-card apple-card-hover rounded-[24px] p-6 sm:p-7 flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-[14px] bg-[#C86D44]/[0.08] border border-[#C86D44]/20 flex items-center justify-center text-[#C86D44]">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-display font-semibold text-[#1D1D1F]">
                      Unfiltered Progress Cards
                    </h3>
                    <p className="text-sm text-[#515154] leading-relaxed">
                      Missed days stay visibly blank alongside your growth trajectory curve—showing your real rhythm rather than inflated streaks.
                    </p>
                  </div>
                  <div className="text-xs text-[#C86D44] border-t border-[#0F8B8D]/15 pt-3.5 font-medium">
                    Blank Missed Days · Cumulative Growth Curve
                  </div>
                </div>

                <div className="md:col-span-5 apple-card apple-card-hover rounded-[24px] p-6 sm:p-7 space-y-2.5">
                  <div className="w-10 h-10 rounded-[14px] bg-[#0055FF]/[0.08] border border-[#0055FF]/20 flex items-center justify-center text-[#0055FF]">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-[#1D1D1F]">
                    Smart Sentence Correction
                  </h3>
                  <p className="text-sm text-[#515154] leading-relaxed">
                    As you speak, AI converts voice into clean text, catches misheard words or misspellings, and shapes natural sentences automatically.
                  </p>
                </div>

                <div className="md:col-span-7 apple-card apple-card-hover rounded-[24px] p-6 sm:p-7 space-y-2.5">
                  <div className="w-10 h-10 rounded-[14px] bg-[#EDF7F6] border border-[#0F8B8D]/25 flex items-center justify-center text-[#0F8B8D]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-[#1D1D1F]">
                    Private Reflection &amp; Pattern Watch
                  </h3>
                  <p className="text-sm text-[#515154] leading-relaxed">
                    Tough moments remain completely under your own private record, highlighting recurring slowdown habits only when a genuine multi-day pattern emerges.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS & USE CASES */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-20 border-t border-[#0F8B8D]/10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left" id="landing-how-it-works">
              <div className="lg:col-span-6 space-y-5">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold tracking-wide text-[#0F8B8D]">How It Works</span>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.02em] text-[#1D1D1F]">
                    Four quiet steps.
                  </h2>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      n: "01",
                      c: "text-[#0F8B8D]",
                      t: "Speak or type naturally",
                      d: "Start recording or type a quick note whenever work wraps up.",
                    },
                    {
                      n: "02",
                      c: "text-[#0055FF]",
                      t: "Correct speech in real time",
                      d: "AI turns rough speech into clean sentences and fixes misheard words as you talk.",
                    },
                    {
                      n: "03",
                      c: "text-[#C86D44]",
                      t: "Focus on each category",
                      d: "Switch between Wins, Hard Moments, or Slowdowns to see only what belongs in each.",
                    },
                    {
                      n: "04",
                      c: "text-[#0F8B8D]",
                      t: "Review honest momentum",
                      d: "Inspect your Progress Card, growth curve, and blank missed days clearly.",
                    },
                  ].map((step) => (
                    <div
                      key={step.n}
                      className="apple-card apple-card-hover rounded-[20px] p-4 sm:p-5 flex items-start gap-4"
                    >
                      <span className={`font-mono text-xs ${step.c} font-semibold pt-0.5 tabular-nums`}>
                        {step.n}
                      </span>
                      <div>
                        <h4 className="text-sm font-display font-semibold text-[#1D1D1F]">{step.t}</h4>
                        <p className="text-xs text-[#515154] mt-0.5 leading-relaxed">{step.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-5" id="landing-use-cases">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold tracking-wide text-[#C86D44]">Use Cases</span>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.02em] text-[#1D1D1F]">
                    Designed for focused work
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      t: "Independent Builders",
                      d: "Log daily shipping milestones when working solo without team check-ins.",
                    },
                    {
                      t: "Multilingual Thinkers",
                      d: "Think out loud comfortably without fighting strict formatting rules.",
                    },
                    {
                      t: "Students & Researchers",
                      d: "Track study blocks honestly and identify recurring distractions early.",
                    },
                    {
                      t: "Private Journaling",
                      d: "Zero social feeds, no notifications nagging you, and clean daily accounting.",
                    },
                  ].map((uc) => (
                    <div key={uc.t} className="apple-card apple-card-hover rounded-[20px] p-5 space-y-1.5">
                      <h4 className="text-sm font-display font-semibold text-[#1D1D1F]">{uc.t}</h4>
                      <p className="text-xs text-[#515154] leading-relaxed">{uc.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AUTH GATEWAY & PRODUCT PRINCIPLES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-left" id="auth-panel-card">
              <div className="lg:col-span-6 apple-card rounded-[24px] p-7 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <span className="text-xs font-semibold tracking-wide text-[#C86D44]">
                    Why A Private Record Matters
                  </span>
                  <h3 className="text-2xl sm:text-[26px] font-display font-bold text-[#1D1D1F] tracking-[-0.025em] leading-[1.2] text-balance">
                    You don&apos;t need noise or surveillance. You need clarity.
                  </h3>
                  <p className="text-sm text-[#515154] leading-relaxed">
                    Memory gets distorted on long weeks. Keeping a brief voice record lets you see what you actually built, spot where energy slipped, and measure consistency honestly over weeks and months.
                  </p>
                </div>

                <div className="border-t border-[#0F8B8D]/15 pt-5 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-[#0F8B8D] block">Blank Missed Days</span>
                    <span className="text-[#515154]">Unlogged days stay open, never hidden.</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#0055FF] block">Zero Noise</span>
                    <span className="text-[#515154]">No social timelines or tracking ads.</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 apple-card rounded-[24px] p-7 sm:p-8 space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xl font-display font-bold text-[#1D1D1F] tracking-[-0.02em]">
                    Enter Your Workspace
                  </h3>
                  <p className="text-xs text-[#86868B]">
                    Sign in with email or Google, or open a local guest session.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-[14px] bg-[#C86D44]/[0.07] border border-[#C86D44]/30 flex items-start gap-2.5 text-xs text-[#1D1D1F]">
                    <AlertCircle className="w-4 h-4 text-[#C86D44] shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleDirectEntry} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="gateway-email-input"
                      className="text-xs font-medium text-[#515154] block"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="gateway-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="you@domain.com"
                        className="apple-input w-full min-h-[44px] rounded-[12px] pl-10 pr-4 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="gateway-name-input"
                      className="text-xs font-medium text-[#515154] block"
                    >
                      Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="gateway-name-input"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Your name"
                        className="apple-input w-full min-h-[44px] rounded-[12px] pl-10 pr-4 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#86868B]">
                    <Lock className="w-3.5 h-3.5 text-[#0F8B8D] shrink-0" />
                    <span>Private entries · No ads · Full export control</span>
                  </div>

                  <button
                    id="gateway-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="btn-teal w-full min-h-[46px] py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? "Opening..." : "Continue with Email"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="relative flex items-center justify-center py-0.5">
                  <div className="w-full border-t border-[#0F8B8D]/15" />
                  <span className="px-3 text-xs text-[#86868B] shrink-0">or</span>
                  <div className="w-full border-t border-[#0F8B8D]/15" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="gateway-google-btn"
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="btn-secondary-apple min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.96 1 12 1 7.36 1 3.4 3.64 1.5 7.48l3.64 2.82C6.1 7.24 8.84 5.04 12 5.04z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.25c0-.82-.07-1.6-.2-2.35H12v4.45h6.45c-.28 1.48-1.12 2.73-2.38 3.58l3.68 2.85c2.16-2 3.75-4.95 3.75-8.53z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.14 14.3C4.9 13.57 4.76 12.8 4.76 12s.14-1.57.38-2.3L1.5 6.88C.54 8.8 0 10.94 0 13.12s.54 4.32 1.5 6.24l3.64-2.82c-.24-.73-.38-1.5-.38-2.3z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.24 0 5.96-1.08 7.95-2.92l-3.68-2.85c-1.1.74-2.5 1.18-4.27 1.18-3.16 0-5.9-2.2-6.86-5.26L1.5 15.96C3.4 19.8 7.36 22.4 12 23z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    id="gateway-demo-btn"
                    type="button"
                    onClick={handleDemoAccess}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#EDF7F6] hover:bg-[#E1F2F1] border border-[#0F8B8D]/20 text-xs font-medium text-[#1D1D1F] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.97]"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#0055FF]" />
                    <span>Guest Session</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-[#0F8B8D]/12 bg-white/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#515154]">
            <div className="flex items-center gap-2.5">
              <LuminaLogo size={20} />
              <span aria-hidden="true">·</span>
              <span>Private Voice Record</span>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => scrollToSection("landing-product")}
                className="hover:text-[#1D1D1F] cursor-pointer"
              >
                Capabilities
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("landing-how-it-works")}
                className="hover:text-[#1D1D1F] cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("landing-use-cases")}
                className="hover:text-[#1D1D1F] cursor-pointer"
              >
                Use Cases
              </button>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="text-[#0F8B8D] hover:underline font-semibold cursor-pointer"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
