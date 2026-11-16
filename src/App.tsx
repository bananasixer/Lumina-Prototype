import React, { useState, useEffect } from "react";
import {
  auth,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "./lib/firebase";
import { UserSession, WinEntry } from "./types";
import SecureGateway from "./components/SecureGateway";
import Header from "./components/Header";
import SlideOutDrawer, { AppViewTab } from "./components/SlideOutDrawer";
import CommandCenter from "./components/CommandCenter";
import WinVault from "./components/WinVault";
import LuminaStory from "./components/LuminaStory";
import LuminaInsights from "./components/LuminaInsights";
import DidIWinCard from "./components/DidIWinCard";
import SupportedLanguagesView from "./components/SupportedLanguagesView";
import GammaWavesBackground from "./components/GammaWavesBackground";
import PrivacyPolicy from "./components/PrivacyPolicy";
import LuminaLogo from "./components/LuminaLogo";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppViewTab>("command");
  const [entries, setEntries] = useState<WinEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [sessionResetKey, setSessionResetKey] = useState(0);
  const [autoRecord, setAutoRecord] = useState<boolean>(() => {
    try {
      return localStorage.getItem("lumina_auto_record") === "true";
    } catch {
      return false;
    }
  });
  const [showPrivacy, setShowPrivacy] = useState<boolean>(
    typeof window !== "undefined" && window.location.pathname === "/privacy"
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setShowPrivacy(window.location.pathname === "/privacy");
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const session: UserSession = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || "Builder",
          photoURL: firebaseUser.photoURL,
          dob: "2000-01-01",
          age: 25,
          ageVerified: true,
          ageAutoDetected: true,
        };
        setUser(session);
        try {
          localStorage.setItem("lumina_active_session", JSON.stringify(session));
        } catch {}
        fetchFirestoreEntries(firebaseUser.uid);
      } else {
        setUser((prev) => {
          if (prev?.isDemo) return prev;
          try {
            const activeSession = localStorage.getItem("lumina_active_session");
            if (activeSession) {
              const parsed = JSON.parse(activeSession);
              if (parsed && parsed.uid) {
                try {
                  const cachedVault = localStorage.getItem(`lumina_vault_${parsed.uid}`);
                  if (cachedVault) {
                    const parsedVault = JSON.parse(cachedVault);
                    if (Array.isArray(parsedVault)) setEntries(parsedVault);
                  }
                } catch {}
                return parsed;
              }
            }
          } catch {}
          return null;
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchFirestoreEntries = async (uid: string) => {
    try {
      const cached = localStorage.getItem(`lumina_vault_${uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setEntries(parsed);
      }
    } catch {}

    try {
      const q = query(collection(db, "users", uid, "entries"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const loaded: WinEntry[] = [];
      querySnapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as WinEntry);
      });
      setEntries(loaded);
      try {
        localStorage.setItem(`lumina_vault_${uid}`, JSON.stringify(loaded));
      } catch {}
    } catch (error) {
      console.error("Error fetching Firestore entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (session: UserSession) => {
    setUser(session);
    try {
      localStorage.setItem("lumina_active_session", JSON.stringify(session));
    } catch {}

    try {
      const cached = localStorage.getItem(`lumina_vault_${session.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setEntries(Array.isArray(parsed) ? parsed : []);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    }

    if (!session.isDemo) {
      setLoading(true);
      fetchFirestoreEntries(session.uid);
    } else {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (!user?.isDemo) await signOut(auth);
      try {
        localStorage.removeItem("lumina_active_session");
      } catch {}
      setUser(null);
      setEntries([]);
      setActiveTab("command");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleEntrySaved = async (entry: WinEntry) => {
    if (user?.isDemo) {
      const savedEntry = {
        ...entry,
        id: entry.id || "entry_" + Math.random().toString(36).substring(2, 9),
      };
      setEntries((prev) => {
        const updated = [savedEntry, ...prev];
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setActiveTab("vault");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "users", user!.uid, "entries"), {
        userId: entry.userId,
        date: entry.date,
        timestamp: entry.timestamp,
        win: entry.win,
        category: entry.category || (entry.resiliencePoint ? "resilience" : "win"),
        slowdownCause: entry.slowdownCause || null,
        isWin: entry.isWin !== undefined ? entry.isWin : !entry.resiliencePoint,
        transcript: entry.transcript,
        detectedLanguage: entry.detectedLanguage || "Auto-detected",
        sourceType: entry.sourceType || "voice",
        summary: entry.summary || null,
        formattedNotes: entry.formattedNotes || null,
        feedback: entry.feedback,
        resiliencePoint: entry.resiliencePoint,
        tags: entry.tags || [],
        status: entry.status || "resolved",
        patternObservation: entry.patternObservation || null,
        isCrisis: entry.isCrisis || false,
        crisisResources: entry.crisisResources || null,
        badHabits: entry.badHabits || [],
        badHabitInsight: entry.badHabitInsight || null,
        tone: entry.tone || null,
        isGrowthStory: entry.isGrowthStory || false,
        growthContext: entry.growthContext || null,
      });

      const savedEntry = { ...entry, id: docRef.id };
      setEntries((prev) => {
        const updated = [savedEntry, ...prev];
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setActiveTab("vault");
    } catch (err) {
      console.error("Error saving entry to Firestore:", err);
      setEntries((prev) => {
        const updated = [entry, ...prev];
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setActiveTab("vault");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (user?.isDemo) {
      setEntries((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user!.uid, "entries", id));
    } catch (err) {
      console.error("Error deleting entry from Firestore:", err);
    }

    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleAutoRecord = (val: boolean) => {
    setAutoRecord(val);
    try {
      localStorage.setItem("lumina_auto_record", String(val));
    } catch {}
  };

  const openPrivacy = () => {
    setShowPrivacy(true);
    window.history.pushState({}, "", "/privacy");
  };

  return (
    <div className="min-h-screen text-[#1D241F] font-sans flex flex-col selection:bg-[#4B6B53]/20">
      {showPrivacy ? (
        <PrivacyPolicy
          onBack={() => {
            setShowPrivacy(false);
            window.history.pushState({}, "", "/");
          }}
        />
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 min-h-[70vh] relative">
          <GammaWavesBackground />
          <RefreshCw className="w-6 h-6 text-[#4B6B53] animate-spin relative z-10" />
          <p className="text-xs font-mono text-[#546257] uppercase tracking-widest relative z-10">
            Opening Workspace...
          </p>
        </div>
      ) : !user ? (
        <SecureGateway onAuthSuccess={handleAuthSuccess} onOpenPrivacy={openPrivacy} />
      ) : (
        <div className="flex-1 flex flex-col relative overflow-x-hidden">
          <GammaWavesBackground isActive={isRecordingActive} />

          <div className="relative z-10 flex-1 flex flex-col">
            <Header
              mode="workspace"
              onLogoClick={() => setActiveTab("command")}
              onPrimaryAction={() => {
                setActiveTab("command");
                setSessionResetKey((k) => k + 1);
              }}
              onOpenMenu={() => setDrawerOpen(true)}
            />

            <SlideOutDrawer
              isOpen={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              mode="workspace"
              user={user}
              activeTab={activeTab}
              onSelectTab={(tab) => setActiveTab(tab)}
              onOpenPrivacy={openPrivacy}
              onLogout={handleLogout}
              autoRecord={autoRecord}
              onToggleAutoRecord={handleToggleAutoRecord}
            />

            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-7 md:py-10">
              <AnimatePresence mode="wait">
                {activeTab === "command" && (
                  <motion.div
                    key={`command-${sessionResetKey}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <CommandCenter
                      user={user}
                      entries={entries}
                      onEntrySaved={handleEntrySaved}
                      autoStart={autoRecord}
                      onRecordingChange={setIsRecordingActive}
                    />
                  </motion.div>
                )}

                {activeTab === "vault" && (
                  <motion.div
                    key="vault"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <WinVault entries={entries} onDeleteEntry={handleDeleteEntry} />
                  </motion.div>
                )}

                {activeTab === "insights" && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <LuminaInsights entries={entries} user={user} />
                  </motion.div>
                )}

                {activeTab === "card" && (
                  <motion.div
                    key="card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <DidIWinCard
                      entries={entries}
                      userName={user.displayName || "Builder"}
                      onNavigateRecord={() => setActiveTab("command")}
                    />
                  </motion.div>
                )}

                {activeTab === "languages" && (
                  <motion.div
                    key="languages"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <SupportedLanguagesView onStartCapture={() => setActiveTab("command")} />
                  </motion.div>
                )}

                {activeTab === "story" && (
                  <motion.div
                    key="story"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <LuminaStory />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            <footer className="border-t border-[#233428]/10 bg-white/55 py-4 px-4 sm:px-6 mt-auto print:hidden">
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#546257]">
                <div className="flex items-center gap-2">
                  <LuminaLogo size={20} />
                  <span>·</span>
                  <span>Private Record</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("card")}
                    className="hover:text-[#1D241F] cursor-pointer"
                  >
                    Progress Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("languages")}
                    className="hover:text-[#1D241F] cursor-pointer"
                  >
                    95+ Languages
                  </button>
                  <button
                    type="button"
                    onClick={openPrivacy}
                    className="text-[#4B6B53] hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
