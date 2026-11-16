import React, { useMemo, useState } from "react";
import { Search, Globe, Sparkles, ArrowRight } from "lucide-react";

const LANGUAGE_FAMILIES = [
  {
    region: "South Asia & Middle East",
    languages: [
      "Urdu", "Arabic", "Hindi", "Punjabi", "Bengali", "Persian (Farsi)", "Pashto", "Sindhi",
      "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Nepali", "Sinhala",
      "Turkish", "Kurdish", "Hebrew", "Azeri"
    ],
  },
  {
    region: "Europe & Americas",
    languages: [
      "English", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Polish",
      "Ukrainian", "Russian", "Romanian", "Czech", "Greek", "Swedish", "Norwegian", "Danish",
      "Finnish", "Hungarian", "Bulgarian", "Croatian", "Serbian", "Slovak", "Catalan", "Galician",
      "Basque", "Welsh", "Irish", "Icelandic", "Lithuanian", "Latvian", "Estonian", "Slovenian"
    ],
  },
  {
    region: "East & Southeast Asia",
    languages: [
      "Mandarin Chinese", "Cantonese", "Japanese", "Korean", "Indonesian", "Malay", "Vietnamese",
      "Thai", "Tagalog (Filipino)", "Burmese", "Khmer", "Lao", "Mongolian", "Javanese", "Sundanese"
    ],
  },
  {
    region: "Africa & Central Asia",
    languages: [
      "Swahili", "Amharic", "Yoruba", "Igbo", "Hausa", "Zulu", "Afrikaans", "Somali",
      "Kazakh", "Uzbek", "Kyrgyz", "Tajik", "Turkmen", "Georgian", "Armenian", "Albanian",
      "Macedonian", "Bosnian", "Belarusian", "Maltese", "Luxembourgish", "Māori", "Hawaiian",
      "Quechua", "Guarani", "Haitian Creole", "Yiddish", "Latin"
    ],
  },
];

interface SupportedLanguagesViewProps {
  onStartCapture?: () => void;
}

export default function SupportedLanguagesView({ onStartCapture }: SupportedLanguagesViewProps) {
  const [query, setQuery] = useState("");

  const totalCount = useMemo(
    () => LANGUAGE_FAMILIES.reduce((acc, g) => acc + g.languages.length, 0),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGE_FAMILIES;
    return LANGUAGE_FAMILIES.map((group) => ({
      ...group,
      languages: group.languages.filter(
        (lang) => lang.toLowerCase().includes(q) || group.region.toLowerCase().includes(q)
      ),
    })).filter((group) => group.languages.length > 0);
  }, [query]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left" id="supported-languages-view">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#233428]/10 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
            <Globe className="w-4 h-4" />
            <span>{totalCount}+ Languages · Auto-Detect</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-[#1D241F]">
            Speak naturally. Zero toggles.
          </h2>
          <p className="text-sm text-[#546257] max-w-xl">
            Start talking in any language—including mid-sentence code-switching like Urdu into English or Spanish into French.
          </p>
        </div>

        {onStartCapture && (
          <button
            type="button"
            onClick={onStartCapture}
            className="btn-sage px-4 py-2 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Open Record</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#4B6B53]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Code-Switching</span>
          </div>
          <p className="text-sm text-[#1D241F]">
            &ldquo;Aaj build deploy ho gaya, latency was under 2 seconds.&rdquo;
          </p>
        </div>
        <div className="text-xs font-mono text-[#C86F52] shrink-0">
          Auto-detected: Urdu · English
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-[#546257] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter languages or regions..."
          className="glass-input w-full rounded-xl pl-11 pr-4 py-2.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((group) => (
          <div key={group.region} className="glass-panel rounded-2xl p-5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#233428]/10 pb-2">
              <h3 className="text-sm font-display font-semibold text-[#1D241F]">
                {group.region}
              </h3>
              <span className="text-xs font-mono text-[#546257] tabular-nums">
                {group.languages.length}
              </span>
            </div>
            <p className="text-xs text-[#546257] leading-relaxed">
              {group.languages.join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
