import React from "react";
import { ArrowLeft, Shield, EyeOff, Globe, User } from "lucide-react";
import GammaWavesBackground from "./GammaWavesBackground";
import LuminaLogo from "./LuminaLogo";

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <div className="min-h-screen relative text-[#1D241F] py-10 px-4 sm:px-6 lg:px-8">
      <GammaWavesBackground />

      <div className="relative z-10 max-w-3xl mx-auto space-y-7 text-left">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="min-h-[38px] inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#546257] hover:text-[#1D241F] px-3.5 py-1.5 rounded-xl glass-panel cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lumina</span>
          </button>
          <LuminaLogo size={26} />
        </div>

        <header className="glass-panel rounded-3xl p-6 sm:p-8 space-y-2.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-[#1D241F] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-[#546257]">
            Last updated: 26 September 2026
          </p>
          <p className="text-sm text-[#546257] leading-relaxed pt-1">
            This policy explains in plain, honest English what happens to your voice, your text, and your data when you use Lumina.
          </p>
        </header>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-7 text-sm text-[#546257] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-display font-semibold text-[#1D241F] flex items-center gap-2">
              <User className="w-4 h-4 text-[#4B6B53]" />
              <span>1. Who runs Lumina</span>
            </h2>
            <p>
              Lumina is built solo by a 16-year-old student in Pakistan: Muhammad Yahya Amar. There is no corporate ad network behind it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-display font-semibold text-[#1D241F]">
              2. Age requirement (18+)
            </h2>
            <p>
              Lumina is intended for adults aged 18 and older. We do not knowingly collect information from anyone under 18.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-display font-semibold text-[#1D241F]">
              3. What we collect
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-[#1D241F]">Account details:</strong> Your email address and name when you sign in via email or Google. In Guest mode, records stay only in your browser&apos;s local storage.
              </li>
              <li>
                <strong className="text-[#1D241F]">Voice input:</strong> Recorded audio is transmitted securely to our backend for real-time multilingual transcription and analysis.
              </li>
              <li>
                <strong className="text-[#1D241F]">Generated records:</strong> Text transcripts, detected language labels, concise takeaways, slowdown notes, and timestamps.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-display font-semibold text-[#1D241F] flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-[#C86F52]" />
              <span>4. What we do not collect</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>No advertising trackers, pixels, or behavioral profiling scripts.</li>
              <li>No third-party analytics trackers.</li>
              <li>No background microphone monitoring—audio is captured only when you explicitly press record.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-display font-semibold text-[#1D241F]">
              5. Ephemeral audio processing &amp; storage
            </h2>
            <p>
              Audio is processed strictly in-memory over TLS/HTTPS by the Google Gemini API to produce your transcript and summary. Raw audio clips are never saved to persistent cloud storage; only text records are stored in Firebase Cloud Firestore under user-scoped security rules.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-display font-semibold text-[#1D241F]">
              6. Retention &amp; deletion
            </h2>
            <p>
              You can export your records anytime in TXT, Markdown, or JSON format and permanently delete any entry directly inside the History view—removing it immediately from Cloud Firestore. Complete account deletion requests are processed within 7 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-display font-semibold text-[#1D241F] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#4B6B53]" />
              <span>7. International processing &amp; contact</span>
            </h2>
            <p>
              Lumina is developed from Islamabad, Pakistan, while cloud database and transcription infrastructure runs on Google Cloud / Firebase globally. Contact:{" "}
              <span className="font-mono text-[#4B6B53]">yahya@lumina-record.app</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
