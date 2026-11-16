import React from "react";
import { Mic, Globe, Shield, Bookmark, TrendingUp } from "lucide-react";

export default function LuminaStory() {
  const steps = [
    {
      icon: <Mic className="w-5 h-5 text-[#4B6B53]" />,
      title: "1. Capture Immediately",
      description:
        "Speak freely or type a quick note. Zero timers, prompts, or manual language toggles.",
    },
    {
      icon: <Globe className="w-5 h-5 text-[#C86F52]" />,
      title: "2. 95+ Language Auto-Detection",
      description:
        "Automatically detects spoken languages and mid-sentence code-switching, extracting a clean takeaway in seconds.",
    },
    {
      icon: <Shield className="w-5 h-5 text-[#4B6B53]" />,
      title: "3. Private Record",
      description:
        "Every entry stays under your own authenticated record—no social feeds or public profiles.",
    },
    {
      icon: <Bookmark className="w-5 h-5 text-[#C86F52]" />,
      title: "4. Honest Progress & Growth",
      description:
        "Progress cards leave missed days blank and plot your cumulative growth curve honestly.",
    },
  ];

  return (
    <div className="space-y-10 max-w-3xl mx-auto text-left" id="lumina-story-section">
      <div className="border-b border-[#233428]/10 pb-5 space-y-2">
        <span className="text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
          Product Info
        </span>
        <h2 className="text-3xl font-display font-bold text-[#1D241F] tracking-tight">
          Built for young people building alone.
        </h2>
        <p className="text-sm sm:text-base text-[#546257] max-w-2xl leading-relaxed">
          When you are working independently without a team or co-founder, you do not need artificial cheerleading—you need an accurate record of what you actually shipped.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => (
          <div key={step.title} className="glass-panel rounded-2xl p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFF3EC] border border-[#4B6B53]/20 flex items-center justify-center">
              {step.icon}
            </div>
            <h3 className="text-base font-display font-semibold text-[#1D241F]">{step.title}</h3>
            <p className="text-xs sm:text-sm text-[#546257] leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-7 space-y-2.5">
          <span className="text-xs font-mono uppercase tracking-widest text-[#C86F52]">
            About the Builder
          </span>
          <h3 className="text-xl font-display font-bold text-[#1D241F]">Muhammad Yahya Amar</h3>
          <p className="text-sm text-[#546257] leading-relaxed">
            Lumina is built solo by 16-year-old student Muhammad Yahya Amar in Pakistan for young people building something on their own with nobody to talk to.
          </p>
        </div>
        <div className="md:col-span-5 rounded-2xl bg-[#F4F6F0] border border-[#233428]/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#4B6B53]">
            <TrendingUp className="w-4 h-4" />
            <span>Why It Matters</span>
          </div>
          <p className="text-xs text-[#1D241F] italic leading-relaxed">
            &ldquo;When you build alone, memory gets distorted by tired nights. An honest voice record keeps the truth intact.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
