import React from "react";
import { Mic, Sparkles, Shield, Bookmark, Award, Layers, Users, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

export default function LuminaStory() {
  const steps = [
    {
      icon: <Mic className="w-5 h-5 text-sage" />,
      title: "1. Talk (Zero-Friction Vocal Capture)",
      description: "Speak freely for up to 60 seconds. No typing, editing, or formatting. Simply express your state of play, the fires defused, or the breakthroughs achieved."
    },
    {
      icon: <Sparkles className="w-5 h-5 text-gold-ochre" />,
      title: "2. Extract (Vocal Crystallization)",
      description: "Lumina's custom server-side intelligence isolates exactly one 'Small Win' or 'Resilience Point,' summarizing key facts and emotional resilience."
    },
    {
      icon: <Shield className="w-5 h-5 text-sage" />,
      title: "3. Vault (The Sovereign Archive)",
      description: "Saved entries are permanently committed to your secure, private Firestore database. This creates an unassailable record of capability and value."
    },
    {
      icon: <Bookmark className="w-5 h-5 text-earth-700" />,
      title: "4. Proof (The Value Ledger)",
      description: "Structured summaries are compiled chronologically. Leverage this high-trust personal repository to secure raises, justify reviews, or build resumes."
    }
  ];

  return (
    <div className="space-y-16 py-6 max-w-4xl mx-auto px-4" id="lumina-story-section">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4"
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-sage bg-sage/5 border border-sage/20 px-3 py-1 rounded-full">
          The Philosophy of Self-Sovereignty
        </span>
        <h1 className="text-3xl md:text-5xl font-serif tracking-tight text-earth-900 mt-2">
          Redefining Progress in the <br />
          <span className="italic text-sage">Meaning Economy</span>
        </h1>
        <p className="text-earth-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Traditional social and professional channels capitalize on noisy alerts and cosmetic feedback. 
          Lumina believes your actual progress is authored in moments of focused, private effort.
        </p>
      </motion.div>

      {/* The 4-Step Loop Section */}
      <div className="space-y-6">
        <div className="text-center md:text-left space-y-1">
          <h2 className="text-xl md:text-2xl font-serif text-earth-900 flex items-center justify-center md:justify-start gap-2.5">
            <Layers className="w-5 h-5 text-sage" />
            The 4-Step Sovereign Loop
          </h2>
          <p className="text-earth-500 text-xs">A frictionless digital conveyor belt that transforms vocal reflection into absolute professional capital.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className="p-6 bg-white rounded-2xl border border-earth-200 hover:border-sage/20 hover:earth-shadow transition-all duration-300 relative overflow-hidden group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-earth-50 rounded-xl border border-earth-200 group-hover:bg-earth-100 transition-colors">
                  {step.icon}
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="font-display font-semibold text-earth-900 text-base group-hover:text-sage transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-earth-600 text-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Meaning Economy Manifesto Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="p-8 bg-earth-100 rounded-2xl border border-earth-200 text-left relative overflow-hidden"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-sage">
          THE MANIFESTO
        </span>
        <div className="space-y-6 mt-4">
          <h3 className="text-xl md:text-2xl font-serif text-earth-900">
            The Professional Self-Sovereignty Strategy
          </h3>
          <div className="space-y-4 text-earth-600 text-sm leading-relaxed font-normal">
            <p>
              We are transitioning past the age of information abundance. The scarce asset of our time is depth—the <span className="text-earth-900 font-semibold">Meaning Economy</span>. In this new dynamic, true value lies in mental clarity, objective self-cataloging, and persistent personal resilience.
            </p>
            <p>
              Lumina acts as your private vault. By removing the administrative chore of writing, organizing, or formatting your achievements, you are free to capture high-resolution moments of triumph and agency exactly when they unfold.
            </p>
            <p>
              Whether you handled a difficult conflict, protected a colleague under pressure, or quietly fixed a critical pipeline issue, that is your genuine professional equity. Lumina extracts, structures, and archives it safely.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-earth-200">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-sage flex-shrink-0" />
              <div>
                <h4 className="text-xs font-mono text-earth-800 font-semibold uppercase">Total Security</h4>
                <p className="text-[10px] text-earth-500">Your voice and insights remain absolutely yours.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-sage flex-shrink-0" />
              <div>
                <h4 className="text-xs font-mono text-earth-800 font-semibold uppercase">Zero Vanity Slop</h4>
                <p className="text-[10px] text-earth-500">No feeds, public profiles, or arbitrary vanity scores.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-gold-ochre flex-shrink-0" />
              <div>
                <h4 className="text-xs font-mono text-earth-800 font-semibold uppercase">Value Preservation</h4>
                <p className="text-[10px] text-earth-500">Convert micro-moments into powerful career proof.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* About Us section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-t border-earth-200 pt-10 text-left">
        <div className="md:col-span-7 space-y-4">
          <span className="text-xs font-mono uppercase tracking-wider text-sage">OUR VISION</span>
          <h3 className="text-2xl font-serif text-earth-900">About Lumina Technologies</h3>
          <p className="text-earth-600 text-sm leading-relaxed">
            Lumina was built by a sovereign collective of high-performance product designers, engineers, and researchers. We believe software should respect human psychology rather than commodify attention through psychological hacks.
          </p>
          <p className="text-earth-500 text-xs">
            We operate out of strict privacy protocols, and our entire pipeline is designed around user self-sovereignty. We do not sell, rent, or leverage your reflections for general model training.
          </p>
        </div>
        <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-earth-200 space-y-4 earth-shadow">
          <h4 className="text-xs font-mono text-sage uppercase tracking-widest flex items-center gap-2 font-semibold">
            <TrendingUp className="w-4 h-4" /> Cognitive Resilience
          </h4>
          <blockquote className="text-earth-700 text-xs italic border-l-2 border-sage pl-4 py-1.5 leading-relaxed">
            "Your professional value isn't forged in annual review meetings. It is built in the quiet daily adjustments, the fires handled with poise, and the steady resilience of consistent craft."
          </blockquote>
          <p className="text-[10px] text-earth-400 font-mono">
            — Dr. Sarah Chen, Advisor on Cognitive Resilience
          </p>
        </div>
      </div>
    </div>
  );
}
