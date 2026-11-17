import React from "react";
import { Mic, Globe, Shield, Bookmark, TrendingUp } from "lucide-react";

export default function LuminaStory() {
  const steps = [
    {
      icon: <Mic className="w-5 h-5 text-[#0055FF]" />,
      title: "1. Capture Immediately",
      description:
        "Speak freely or write a brief note whenever work wraps up—zero setup friction.",
    },
    {
      icon: <Globe className="w-5 h-5 text-[#0F8B8D]" />,
      title: "2. Natural Speech & Cleanup",
      description:
        "Spoken thoughts and mixed phrasing are cleaned up into a concise daily takeaway.",
    },
    {
      icon: <Shield className="w-5 h-5 text-[#1E4449]" />,
      title: "3. Private Record",
      description:
        "Every entry stays strictly under your own authenticated workspace—no social feeds or public timelines.",
    },
    {
      icon: <Bookmark className="w-5 h-5 text-[#C86D44]" />,
      title: "4. Honest Progress & Growth",
      description:
        "Progress cards leave missed days visibly blank and plot your cumulative growth curve honestly.",
    },
  ];

  return (
    <div className="space-y-10 max-w-3xl mx-auto text-left" id="lumina-story-section">
      <div className="border-b border-[#0F8B8D]/15 pb-5 space-y-2">
        <span className="text-xs font-semibold text-[#0F8B8D]">Product Info</span>
        <h2 className="text-3xl font-display font-bold text-[#1D1D1F] tracking-[-0.025em]">
          Built for independent focus.
        </h2>
        <p className="text-sm sm:text-base text-[#515154] max-w-2xl leading-relaxed">
          When working independently without a crowded team around you, you do not need artificial cheerleading—you need an accurate record of what moved forward.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => (
          <div key={step.title} className="apple-card rounded-[20px] p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-[#EDF7F6] border border-[#0F8B8D]/20 flex items-center justify-center">
              {step.icon}
            </div>
            <h3 className="text-base font-display font-semibold text-[#1D1D1F]">{step.title}</h3>
            <p className="text-xs sm:text-sm text-[#515154] leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="apple-card rounded-[24px] p-6 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-7 space-y-2.5">
          <span className="text-xs font-semibold text-[#C86D44]">Core Principle</span>
          <h3 className="text-xl font-display font-bold text-[#1D1D1F]">Honest Daily Accounting</h3>
          <p className="text-sm text-[#515154] leading-relaxed">
            Lumina records wins, hard moments, and slowdowns side by side—keeping unlogged days transparently blank so long-term growth stays grounded in reality.
          </p>
        </div>
        <div className="md:col-span-5 rounded-[16px] apple-well p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F8B8D]">
            <TrendingUp className="w-4 h-4 text-[#0F8B8D]" />
            <span>Why It Matters</span>
          </div>
          <p className="text-xs text-[#1D1D1F] italic leading-relaxed">
            &ldquo;When building independently, memory fades quickly after long nights. An honest voice record preserves the real signal.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
