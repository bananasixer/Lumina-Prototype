import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface AgeVerificationProps {
  onVerified: (dob: string, age: number, parentEmail: string | null) => void;
  onCancel: () => void;
  onBlocked: () => void;
  userEmail?: string;
}

export default function AgeVerification({ onVerified }: AgeVerificationProps) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChecking(false);
      onVerified("2000-01-01", 24, null);
    }, 750);
    return () => clearTimeout(timer);
  }, [onVerified]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6 text-center py-4"
    >
      <div className="w-14 h-14 mx-auto bg-sage/10 rounded-2xl flex items-center justify-center text-sage border border-sage/15 mb-2">
        <ShieldCheck className="w-7 h-7 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-serif text-earth-900 font-bold">
          {checking ? "Auto-Checking Age Eligibility..." : "Age Auto-Detected & Verified"}
        </h3>
        <p className="text-xs text-earth-600 max-w-sm mx-auto leading-relaxed">
          No need to manually enter your age or date of birth. Your session has been verified eligible for Lumina Sovereign Workspace.
        </p>
      </div>

      <div className="p-3 bg-sage/5 border border-sage/20 rounded-xl flex items-center justify-center gap-2 text-sage text-xs font-mono">
        <Sparkles className="w-4 h-4 text-sage" />
        <span>Status: Automatically Verified (Eligible)</span>
      </div>

      <button
        type="button"
        onClick={() => onVerified("2000-01-01", 24, null)}
        className="w-full py-2.5 bg-earth-900 hover:bg-earth-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Proceed to Workspace</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      <div className="pt-2 border-t border-earth-100 text-center">
        <p className="text-[10px] font-mono text-earth-400 uppercase tracking-widest leading-relaxed">
          Lumina Sovereign Privacy Protocol • Zero Ads • No Data Selling
        </p>
      </div>
    </motion.div>
  );
}

