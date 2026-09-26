import React from "react";
import { ArrowLeft, Shield, Lock, EyeOff, Globe, Sparkles, User, FileText } from "lucide-react";

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
    <div className="min-h-screen bg-earth-50 text-earth-900 font-sans selection:bg-terracotta/10 selection:text-earth-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Navigation back */}
        <div>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-earth-600 hover:text-earth-900 transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-earth-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lumina
          </button>
        </div>

        {/* Header */}
        <header className="space-y-3 border-b border-earth-200 pb-8">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-terracotta bg-terracotta/5 border border-terracotta/20 px-3 py-1 rounded-full">
            <Shield className="w-3.5 h-3.5" /> Privacy Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-earth-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-earth-500">
            Last updated: 26 September 2026
          </p>
          <p className="text-sm text-earth-700 leading-relaxed pt-2">
            This policy explains in plain, honest English what happens to your voice, your text, and your data when you use Lumina. There is no legal jargon, and no hidden fine print.
          </p>
        </header>

        {/* Content sections */}
        <div className="space-y-8 text-sm text-earth-800 leading-relaxed">
          
          {/* Who runs it */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900 flex items-center gap-2">
              <User className="w-4 h-4 text-terracotta" />
              1. Who runs Lumina
            </h2>
            <p>
              Lumina is built and operated by one person: Muhammad Yahya Amar, a student and solo developer in Pakistan. There is no company, no corporate team, and no venture investors behind it.
            </p>
          </section>

          {/* Age Limit */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              2. Age requirement (18+)
            </h2>
            <p>
              Lumina is strictly intended for adults aged 18 and older. We do not knowingly collect information from anyone under the age of 18. If you are under 18, please do not use Lumina or submit any audio or personal information.
            </p>
          </section>

          {/* What we collect */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              3. What we collect
            </h2>
            <p>When you use Lumina, we collect only what is strictly necessary to run your private record:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-earth-700">
              <li>
                <strong>Account details:</strong> Your email address and your name when you sign in via email or Google. If you continue as a guest, your session details stay on your device in your browser's local storage and are not stored in our database.
              </li>
              <li>
                <strong>Voice recordings and text reflections:</strong> When you record an audio check-in or type a reflection, the audio data or typed text is sent to our server to be transcribed and analyzed.
              </li>
              <li>
                <strong>Generated records:</strong> The resulting text transcripts, summaries of wins, identified slowdown causes, feedback notes, tags, and timestamps.
              </li>
            </ul>
          </section>

          {/* What we don't collect */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-sage" />
              4. What we do not collect
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-earth-700">
              <li>No passwords (we use passwordless direct sign-in or Google authentication).</li>
              <li>No tracking cookies or advertising pixels.</li>
              <li>No third-party analytics trackers (no Google Analytics, no Mixpanel, no PostHog).</li>
              <li>No background audio monitoring (your microphone is only active while you explicitly press record).</li>
            </ul>
          </section>

          {/* How voice is processed */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              5. How your voice is processed
            </h2>
            <p>
              Audio recordings do not stay solely on your device. When you submit a voice reflection, your audio recording leaves your device over an encrypted connection (HTTPS) and is processed by Google's Gemini API to transcribe your speech into text and generate your reflection summary.
            </p>
            <div className="p-4 bg-earth-100 rounded-xl text-xs space-y-2 text-earth-700 border border-earth-200">
              <p>
                <strong>Audio storage policy:</strong>
              </p>
              <p className="font-mono text-terracotta">
                [[NEEDS INPUT: Confirm whether audio recordings should ever be permanently stored in cloud storage, or remain strictly ephemeral in-transit memory only? Currently, the database stores only text transcripts and summaries, not audio files.]]
              </p>
            </div>
          </section>

          {/* Where entries are stored and served from */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              6. Where entries are stored and served from
            </h2>
            <p>
              Your saved text entries, transcripts, and profile details are stored in <strong>Firebase (Cloud Firestore)</strong>, provided by Google Cloud infrastructure. The web application is served from our web hosting infrastructure (and Vercel for production hosting).
            </p>
          </section>

          {/* Model training */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              7. Model training and AI privacy
            </h2>
            <p>
              How your data interacts with AI model training depends on the Google Gemini API billing tier:
            </p>
            <div className="p-4 bg-amber-50/70 rounded-xl text-xs space-y-2 text-amber-900 border border-amber-200">
              <p className="font-semibold">Honest disclosure on AI training:</p>
              <p>
                Under Google's API terms, if an API key is on Google's <em>Free Tier</em>, Google may retain and review submitted content and use it to train and improve Google products. If the API key is on a <em>Paid / Pay-As-You-Go Tier</em>, Google does not use customer content to train its models.
              </p>
              <p className="font-mono font-medium text-terracotta">
                [[NEEDS INPUT: Is the production Gemini API key on Google's Free Tier or Paid Tier? We will update this statement to reflect the exact verified tier.]]
              </p>
            </div>
          </section>

          {/* Who can see your entries */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              8. Who can see your entries
            </h2>
            <blockquote className="border-l-4 border-terracotta pl-4 italic text-earth-800 bg-terracotta/[0.03] py-2 pr-2 rounded-r-lg">
              "Only the founder holds technical access to the database. No other user can read your entries, and no one reviews them — not for moderation, not for ads, and not to train any model. We simply have no reason and no process to look."
            </blockquote>
          </section>

          {/* How long we keep them */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              9. How long data is kept and account deletion
            </h2>
            <p>
              You can manually delete individual entries directly inside the application at any time. When you delete an entry, it is permanently removed from the database.
            </p>
            <div className="p-4 bg-earth-100 rounded-xl text-xs space-y-2 text-earth-700 border border-earth-200">
              <p>
                <strong>Retention schedule and account deletion:</strong>
              </p>
              <p className="font-mono text-terracotta">
                [[NEEDS INPUT: Specify the exact retention period for account records, and the exact steps/timeline for complete data destruction when someone requests account deletion.]]
              </p>
            </div>
          </section>

          {/* Security */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              10. Security
            </h2>
            <p>
              We protect your data in transit using industry-standard TLS/HTTPS encryption, and Firestore applies access rules to restrict document reads to your authenticated account ID. We do not make misleading claims of "end-to-end encryption", because audio and text must be processed by Google's Gemini servers to generate transcripts and responses.
            </p>
          </section>

          {/* Your rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              11. Your rights
            </h2>
            <p>You have full control over your personal information:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-earth-700">
              <li><strong>Access:</strong> You can view all your stored entries and reflection history directly in the app.</li>
              <li><strong>Export:</strong> You can download or export your records.</li>
              <li><strong>Correction:</strong> You can update your profile display name at any time.</li>
              <li><strong>Deletion:</strong> You can delete any individual entry at any time.</li>
              <li><strong>Withdraw consent:</strong> You can stop using the service and request deletion of all associated data.</li>
            </ul>
          </section>

          {/* International processing */}
          <section className="space-y-3">
            <h2 className="text-lg font-serif font-bold text-earth-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-earth-600" />
              12. Data processed outside Pakistan
            </h2>
            <p>
              Lumina is developed and managed from Pakistan. However, your data is processed and stored on cloud servers hosted by Google (Google Cloud, Firebase, and Gemini API) located outside Pakistan, including in the United States and other regions where Google operates infrastructure.
            </p>
          </section>

          {/* Contact & Jurisdiction */}
          <section className="space-y-3 border-t border-earth-200 pt-6">
            <h2 className="text-lg font-serif font-bold text-earth-900">
              13. Contact and legal jurisdiction
            </h2>
            <p>
              If you have any questions about your data, want to request an export, or wish to request complete deletion of your account and records:
            </p>
            <div className="p-4 bg-earth-100 rounded-xl text-xs space-y-2 text-earth-700 border border-earth-200">
              <p className="font-mono text-terracotta">
                [[NEEDS INPUT: Official contact email address and legal jurisdiction (e.g. city/province in Pakistan) to publish.]]
              </p>
            </div>
          </section>

        </div>

        {/* Footer inside privacy page */}
        <div className="border-t border-earth-200 pt-6 flex items-center justify-between text-xs text-earth-500 font-mono">
          <span>Lumina • Private Record</span>
          <button
            onClick={handleBack}
            className="text-terracotta hover:underline cursor-pointer"
          >
            Return to Lumina
          </button>
        </div>

      </div>
    </div>
  );
}
