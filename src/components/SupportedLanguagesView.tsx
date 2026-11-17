import React from "react";
import { Globe, ArrowRight, CheckCircle2, Clock } from "lucide-react";

interface SupportedLanguagesViewProps {
  onStartCapture?: () => void;
}

export default function SupportedLanguagesView({ onStartCapture }: SupportedLanguagesViewProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left" id="supported-languages-view">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#0F8B8D]/15 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F8B8D]">
            <Globe className="w-4 h-4 text-[#0F8B8D]" />
            <span>Language Support</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.025em] text-[#1D1D1F]">
            Natural multilingual capture.
          </h2>
          <p className="text-sm text-[#515154] max-w-xl">
            Speak or write comfortably across our active supported languages, with additional languages rolling out in future releases.
          </p>
        </div>

        {onStartCapture && (
          <button
            type="button"
            onClick={onStartCapture}
            className="btn-teal min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Open Record</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="apple-card rounded-[24px] p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-semibold text-[#1D1D1F]">English</h3>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0055FF]">
              <CheckCircle2 className="w-4 h-4" /> Supported
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#515154] leading-relaxed">
            Full voice and quick-note capture for shipping logs, study sessions, hard moments, and daily takeaways.
          </p>
        </div>

        <div className="apple-card rounded-[24px] p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-semibold text-[#1D1D1F]">Urdu</h3>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F8B8D]">
              <CheckCircle2 className="w-4 h-4" /> Supported
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#515154] leading-relaxed">
            Full script, romanized phrasing, and conversational switching handled naturally during capture and translation.
          </p>
        </div>
      </div>

      <div className="apple-card rounded-[20px] p-5 bg-[#EDF7F6] flex items-start gap-3">
        <Clock className="w-4 h-4 text-[#C86D44] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-display font-semibold text-[#1D1D1F]">Expanding over time</h4>
          <p className="text-xs text-[#515154] leading-relaxed">
            Additional regional and global languages are planned for upcoming updates so every builder can speak in their natural cadence.
          </p>
        </div>
      </div>
    </div>
  );
}
