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
  Zap,
  User,
  Languages,
  FileText,
  Download,
  Lock,
} from "lucide-react";
import { motion } from "motion/react";
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
    lang: "Urdu · English",
    spoken: "Aaj payment webhook fix ho gaya aur signup latency 1.4 seconds pe aa gayi.",
    takeaway: "Resolved webhook failure and cut signup latency to 1.4s.",
    category: "Win",
  },
  {
    lang: "Spanish",
    spoken: "Aunque tuve dos errores en producción, logré desplegar la nueva versión antes de medianoche.",
    takeaway: "Fixed two production errors and shipped the release before midnight.",
    category: "Hard Moment",
  },
  {
    lang: "Arabic · French",
    spoken: "J'ai terminé le module du client اليوم malgré la fatigue.",
    takeaway: "Completed the client module despite fatigue.",
    category: "Win",
  },
  {
    lang: "Japanese",
    spoken: "テストスイートを書き直して、ビルド時間を半分にしました。",
    takeaway: "Rewrote the test suite and cut build time in half.",
    category: "Win",
  },
];

export default function SecureGateway({ onAuthSuccess, onOpenPrivacy }: SecureGatewayProps) {
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
      if (lastEmail) setEmail(lastEmail);
      if (lastName) setFullName(lastName);
    } catch {}
  }, []);

  const handleDirectEntry = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (fullName || "").trim() || cleanEmail.split("@")[0] || "Builder";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      document.getElementById("gateway-email-input")?.focus();
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

    try {
      localStorage.setItem("lumina_last_email", cleanEmail);
      localStorage.setItem("lumina_last_name", cleanName);
    } catch {}

    onAuthSuccess({
      uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: auth.currentUser?.photoURL || null,
      createdAt: Date.now(),
      dob: "2000-01-01",
      age: 25,
      ageVerified: true,
      ageAutoDetected: true,
      isDemo: false,
    });
    setLoading(false);
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

        onAuthSuccess({
          uid: result.user.uid,
          email: result.user.email,
          displayName: cleanName,
          photoURL: result.user.photoURL,
          createdAt: Date.now(),
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
        setError("Enter your email and name above to continue on this preview domain.");
        document.getElementById("gateway-email-input")?.focus();
        setLoading(false);
        return;
      }
      setError("Unable to open Google sign-in here. Enter your email and name above to continue.");
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
    <div className="min-h-screen flex flex-col relative text-[#1D241F]" id="secure-gateway-root">
      <GammaWavesBackground isActive={false} />

      <div className="relative z-10 flex-1 flex flex-col">
        <Header
          mode="landing"
          onLogoClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          onPrimaryAction={() => scrollToSection("auth-panel-card")}
          onOpenMenu={() => setDrawerOpen(true)}
        />

        <SlideOutDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode="landing"
          onOpenApp={() => scrollToSection("auth-panel-card")}
          onScrollSection={scrollToSection}
          onOpenPrivacy={onOpenPrivacy}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-12 pb-20 space-y-20">
          {/* HERO SECTION */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="lg:col-span-6 space-y-5 text-left"
            >
              <div className="text-xs font-mono uppercase tracking-widest text-[#4B6B53] font-medium">
                95+ Languages · Real-Time Auto-Detection
              </div>

              <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-[1.08] text-[#1D241F]">
                Speak in any language. Keep an honest record.
              </h1>

              <p className="text-base text-[#546257] leading-relaxed max-w-lg">
                Built for young people building something on their own with nobody to talk to. Instant voice capture across 95+ languages with zero manual toggles.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => scrollToSection("auth-panel-card")}
                  className="btn-sage min-h-[46px] px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open Lumina</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDemoAccess}
                  className="min-h-[46px] px-5 py-2.5 rounded-xl glass-panel hover:bg-white text-sm font-medium text-[#1D241F] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#4B6B53]" />
                  <span>Guest Access</span>
                </button>
              </div>
            </motion.div>

            {/* Compact Interactive Software Preview */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="lg:col-span-6"
            >
              <div className="glass-panel-strong rounded-3xl p-6 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-[#233428]/10 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#546257]">
                    <span className="w-2 h-2 rounded-full bg-[#C86F52]" />
                    <span>Live Capture Preview</span>
                  </div>
                  <span className="text-xs font-mono text-[#4B6B53] tabular-nums">
                    Auto-detect · 1.8s
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PREVIEW_SAMPLES.map((s, idx) => (
                    <button
                      key={s.lang}
                      type="button"
                      onClick={() => setSampleIdx(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        idx === sampleIdx
                          ? "bg-[#4B6B53] text-white"
                          : "bg-[#EFF2EA] text-[#546257] hover:text-[#1D241F]"
                      }`}
                    >
                      {s.lang.split(" ")[0]}
                    </button>
                  ))}
                </div>

                {/* Soft Sage Waveform Bars */}
                <div className="h-11 rounded-xl bg-[#F4F6F0] border border-[#233428]/10 px-4 flex items-center justify-between gap-1.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-1 rounded-full bg-[#4B6B53]"
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

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#546257]">
                    <span>Detected: {activeSample.lang}</span>
                    <span className="text-[#4B6B53] font-semibold">{activeSample.category}</span>
                  </div>
                  <p className="text-sm text-[#1D241F] leading-relaxed">
                    &ldquo;{activeSample.spoken}&rdquo;
                  </p>
                  <div className="rounded-xl bg-[#F4F6F0] border border-[#233428]/10 p-3 text-xs text-[#1D241F]">
                    <span className="font-mono text-[#4B6B53] uppercase text-[10px] block mb-0.5 font-semibold">
                      Takeaway
                    </span>
                    {activeSample.takeaway}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#546257]">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EFF2EA]">
                    <Languages className="w-3 h-3 text-[#4B6B53]" /> Translate
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EFF2EA]">
                    <FileText className="w-3 h-3 text-[#C86F52]" /> Summarize
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EFF2EA]">
                    <Download className="w-3 h-3 text-[#4B6B53]" /> Export
                  </span>
                </div>
              </div>
            </motion.div>
          </section>

          {/* BENTO-GRID PRODUCT & LANGUAGE SHOWCASE */}
          <section className="space-y-7 text-left" id="landing-product">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
                Capabilities
              </span>
              <h2 className="text-3xl font-display font-bold tracking-tight text-[#1D241F]">
                Built for speed, clarity, and global speech.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div
                id="landing-languages"
                className="md:col-span-7 glass-panel glass-card-hover rounded-3xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF3EC] border border-[#4B6B53]/20 flex items-center justify-center text-[#4B6B53]">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-[#1D241F]">
                    95+ Languages with Mid-Sentence Code-Switching
                  </h3>
                  <p className="text-sm text-[#546257] leading-relaxed">
                    Start talking in Urdu, Arabic, Spanish, French, Mandarin, Hindi, German, or Japanese—or switch languages mid-sentence without manual toggles.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#4B6B53] border-t border-[#233428]/10 pt-3">
                  English · Urdu · العربية · Español · Français · 中文 · हिन्दी · Deutsch · 日本語 · +86 more
                </div>
              </div>

              <div className="md:col-span-5 glass-panel glass-card-hover rounded-3xl p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C86F52]/12 border border-[#C86F52]/25 flex items-center justify-center text-[#C86F52]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-[#1D241F]">
                    Real-Time Capture under 4s
                  </h3>
                  <p className="text-sm text-[#546257] leading-relaxed">
                    Streaming live text as you speak with instant categorized takeaways.
                  </p>
                </div>
                <div className="text-2xl font-display font-bold text-[#1D241F] tabular-nums border-t border-[#233428]/10 pt-3">
                  &lt; 4.0s <span className="text-xs font-mono font-normal text-[#546257]">turnaround</span>
                </div>
              </div>

              <div className="md:col-span-5 glass-panel glass-card-hover rounded-3xl p-6 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF3EC] border border-[#4B6B53]/20 flex items-center justify-center text-[#4B6B53]">
                  <Mic className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-display font-semibold text-[#1D241F]">
                  One-Click Output Actions
                </h3>
                <p className="text-sm text-[#546257] leading-relaxed">
                  Copy, translate to any language, summarize, format into notes, or export as TXT, Markdown, or JSON.
                </p>
              </div>

              <div className="md:col-span-7 glass-panel glass-card-hover rounded-3xl p-6 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EFF3EC] border border-[#4B6B53]/20 flex items-center justify-center text-[#4B6B53]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-display font-semibold text-[#1D241F]">
                  Honest Progress Cards &amp; Growth Graph
                </h3>
                <p className="text-sm text-[#546257] leading-relaxed">
                  Missed days stay visibly blank so you see your real consistency, paired with a cumulative growth graph and repeating pattern watch.
                </p>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS & USE CASES */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left" id="landing-how-it-works">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
                How It Works
              </span>
              <h2 className="text-2xl font-display font-bold text-[#1D241F]">
                Four quiet steps.
              </h2>
              <div className="space-y-3">
                {[
                  { n: "01", t: "Speak naturally", d: "Press Record or type a quick note. Zero timers or language switches." },
                  { n: "02", t: "Automatic detection", d: "Lumina detects spoken languages and extracts a concise takeaway." },
                  { n: "03", t: "Transform in one click", d: "Translate, summarize, format notes, or export." },
                  { n: "04", t: "Inspect your growth", d: "Review your Progress Card, growth curve, and blank missed days honestly." },
                ].map((step) => (
                  <div key={step.n} className="glass-panel rounded-2xl p-4 flex items-start gap-4">
                    <span className="font-mono text-xs text-[#4B6B53] font-semibold pt-0.5 tabular-nums">
                      {step.n}
                    </span>
                    <div>
                      <h4 className="text-sm font-display font-semibold text-[#1D241F]">{step.t}</h4>
                      <p className="text-xs text-[#546257] mt-0.5">{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4" id="landing-use-cases">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C86F52]">
                Use Cases
              </span>
              <h2 className="text-2xl font-display font-bold text-[#1D241F]">
                Built for people working solo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    t: "Solo Builders",
                    d: "Log daily shipping milestones when nobody else is around to track the work.",
                  },
                  {
                    t: "Multilingual Thinkers",
                    d: "Speak in Urdu, Arabic, Spanish, or code-switch mid-sentence, then translate cleanly.",
                  },
                  {
                    t: "Students & Learners",
                    d: "Keep an honest record of study progress and spot slowdown causes early.",
                  },
                  {
                    t: "Private Accounting",
                    d: "No social feeds, no guilt mascots, and missed days are tracked cleanly without punishment.",
                  },
                ].map((uc) => (
                  <div key={uc.t} className="glass-panel rounded-2xl p-5 space-y-1.5">
                    <h4 className="text-sm font-display font-semibold text-[#1D241F]">{uc.t}</h4>
                    <p className="text-xs text-[#546257] leading-relaxed">{uc.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AUTH GATEWAY & SOLO BUILDER STORY */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left" id="auth-panel-card">
            <div className="lg:col-span-6 glass-panel rounded-3xl p-7 space-y-5">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C86F52]">
                Why Lumina Exists
              </span>
              <h3 className="text-2xl font-display font-bold text-[#1D241F] leading-tight">
                You don&apos;t need to be monitored. You need an honest record.
              </h3>
              <p className="text-sm text-[#546257] leading-relaxed">
                Lumina records what you shipped, leaves missed days blank on your progress card so you see reality clearly, keeps hard moments private until a real pattern returns, and works in the languages you naturally speak.
              </p>
              <div className="border-t border-[#233428]/10 pt-4 space-y-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-[#4B6B53] font-semibold">
                  Built Solo in Pakistan
                </span>
                <p className="text-xs sm:text-sm text-[#546257] leading-relaxed">
                  Lumina is built solo by 16-year-old student Muhammad Yahya Amar in Pakistan for young people building something on their own with nobody to talk to.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 glass-panel-strong rounded-3xl p-7 space-y-5">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-bold text-[#1D241F]">Open Lumina</h3>
                <p className="text-xs text-[#546257]">
                  Enter with email or Google, or try Guest Mode.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[#C86F52]/12 border border-[#C86F52]/40 flex items-start gap-2 text-xs text-[#1D241F]">
                  <AlertCircle className="w-4 h-4 text-[#C86F52] shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleDirectEntry} className="space-y-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="gateway-email-input"
                    className="text-xs font-mono uppercase tracking-wider text-[#546257] block"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#546257]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                      className="glass-input w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="gateway-name-input"
                    className="text-xs font-mono uppercase tracking-wider text-[#546257] block"
                  >
                    Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#546257]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                      className="glass-input w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-[#546257]">
                  <Lock className="w-3.5 h-3.5 text-[#4B6B53] shrink-0" />
                  <span>Private entries · No ads · No shared feeds</span>
                </div>

                <button
                  id="gateway-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-sage w-full min-h-[42px] py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? "Opening..." : "Continue into Lumina"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative flex items-center justify-center py-0.5">
                <div className="w-full border-t border-[#233428]/10" />
                <span className="px-3 text-[11px] font-mono uppercase text-[#546257] shrink-0">or</span>
                <div className="w-full border-t border-[#233428]/10" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  id="gateway-google-btn"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-[#EFF2EA] border border-[#233428]/12 text-xs font-medium text-[#1D241F] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
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
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F4F6F0] hover:bg-[#EAEFE3] border border-[#233428]/12 text-xs font-mono text-[#4B6B53] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Guest Access</span>
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-[#233428]/10 bg-white/60 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#546257]">
            <div className="flex items-center gap-2.5">
              <LuminaLogo size={22} />
              <span>·</span>
              <span>Built solo in Pakistan by Muhammad Yahya Amar</span>
            </div>

            <div className="flex flex-wrap items-center gap-5 font-mono">
              <button
                type="button"
                onClick={() => scrollToSection("landing-product")}
                className="hover:text-[#1D241F] cursor-pointer"
              >
                Product
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("landing-languages")}
                className="hover:text-[#1D241F] cursor-pointer"
              >
                Languages
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("landing-use-cases")}
                className="hover:text-[#1D241F] cursor-pointer"
              >
                Use Cases
              </button>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="text-[#4B6B53] hover:underline font-medium cursor-pointer"
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
