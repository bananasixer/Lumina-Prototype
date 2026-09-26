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
  setDoc,
  getDoc
} from "./lib/firebase";
import { UserSession, WinEntry, AccountabilityPartner } from "./types";
import SecureGateway from "./components/SecureGateway";
import Header from "./components/Header";
import CommandCenter from "./components/CommandCenter";
import WinVault from "./components/WinVault";
import LuminaStory from "./components/LuminaStory";
import LuminaInsights from "./components/LuminaInsights";
import DidIWinCard from "./components/DidIWinCard";
import AccountabilityCircle from "./components/AccountabilityCircle";
import PublicVerification from "./components/PublicVerification";
import PublicAccountabilityView from "./components/PublicAccountabilityView";
import GammaWavesBackground from "./components/GammaWavesBackground";
import PrivacyPolicy from "./components/PrivacyPolicy";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"command" | "vault" | "insights" | "card" | "circle" | "story">("command");
  const [entries, setEntries] = useState<WinEntry[]>([]);
  const [sharedEntryId, setSharedEntryId] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(
    typeof window !== "undefined" && window.location.pathname === "/privacy"
  );
  const [publicAccountability, setPublicAccountability] = useState<{
    userName: string;
    streakCount: number;
    totalCheckins: number;
  } | null>(null);

  // Check URL query params on mount for external verification or accountability partner view
  useEffect(() => {
    const handleLocationChange = () => {
      setShowPrivacy(window.location.pathname === "/privacy");
    };
    window.addEventListener("popstate", handleLocationChange);

    const params = new URLSearchParams(window.location.search);
    const id = params.get("sharedEntryId");
    if (id) {
      setSharedEntryId(id);
    }
    const accUser = params.get("accountabilityUser");
    if (accUser) {
      const streak = parseInt(params.get("streak") || "0", 10);
      const total = parseInt(params.get("total") || "0", 10);
      setPublicAccountability({
        userName: accUser,
        streakCount: streak,
        totalCheckins: total,
      });
    }

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const handleCloseVerification = () => {
    setSharedEntryId(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleCloseAccountability = () => {
    setPublicAccountability(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let accountabilityCircle: { enabled: boolean; partners: AccountabilityPartner[] } | undefined = undefined;
        try {
          const userDocSnap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.accountabilityCircle) {
              accountabilityCircle = data.accountabilityCircle;
            }
          }
        } catch (e) {
          console.warn("Could not read user profile doc", e);
        }

        const session: UserSession = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || "User",
          photoURL: firebaseUser.photoURL,
          accountabilityCircle,
          dob: "2000-01-01",
          age: 25,
          ageVerified: true,
          ageAutoDetected: true
        };
        setUser(session);
        try {
          localStorage.setItem("lumina_active_session", JSON.stringify(session));
        } catch (e) {}
        fetchFirestoreEntries(firebaseUser.uid);
      } else {
        setUser(prev => {
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
                    if (Array.isArray(parsedVault)) {
                      setEntries(parsedVault);
                    }
                  }
                } catch (e) {}
                return parsed;
              }
            }
          } catch (e) {}
          return null;
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch entries from Firestore with instant local cache retrieval
  const fetchFirestoreEntries = async (uid: string) => {
    // 1. Instantly populate from local device cache for this specific user if available
    try {
      const cached = localStorage.getItem(`lumina_vault_${uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEntries(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not read local vault cache:", e);
    }

    // 2. Fetch fresh source of truth from Firestore
    try {
      const q = query(
        collection(db, "users", uid, "entries"),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      const loaded: WinEntry[] = [];
      querySnapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as WinEntry);
      });
      setEntries(loaded);
      // Sync back to local storage cache
      try {
        localStorage.setItem(`lumina_vault_${uid}`, JSON.stringify(loaded));
      } catch (e) {
        console.warn("Could not write to local vault cache:", e);
      }
    } catch (error) {
      console.error("Error fetching Firestore entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle successful login/auth session
  const handleAuthSuccess = (session: UserSession) => {
    setUser(session);
    try {
      localStorage.setItem("lumina_active_session", JSON.stringify(session));
    } catch (e) {}

    // Load any existing vault entries for this user
    try {
      const cached = localStorage.getItem(`lumina_vault_${session.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setEntries(parsed);
        } else {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
    } catch (e) {
      setEntries([]);
    }

    if (!session.isDemo) {
      setLoading(true);
      fetchFirestoreEntries(session.uid);
    } else {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      if (!user?.isDemo) {
        await signOut(auth);
      }
      try {
        localStorage.removeItem("lumina_active_session");
      } catch (e) {}
      setUser(null);
      setEntries([]);
      setActiveTab("command");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Save new extracted entry to DB/State
  const handleEntrySaved = async (entry: WinEntry) => {
    if (user?.isDemo) {
      const savedEntry = { ...entry, id: entry.id || "entry_" + Math.random().toString(36).substring(2, 9) };
      setEntries(prev => {
        const updated = [savedEntry, ...prev];
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.warn("Could not cache updated entries:", e);
        }
        return updated;
      });
      setActiveTab("vault");
      return;
    }

    try {
      const docRef = await addDoc(
        collection(db, "users", user!.uid, "entries"),
        {
          userId: entry.userId,
          date: entry.date,
          timestamp: entry.timestamp,
          win: entry.win,
          category: entry.category || (entry.resiliencePoint ? "resilience" : "win"),
          slowdownCause: entry.slowdownCause || null,
          isWin: entry.isWin !== undefined ? entry.isWin : !entry.resiliencePoint,
          transcript: entry.transcript,
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
          verification: entry.verification || null
        }
      );
      
      const savedEntry = { ...entry, id: docRef.id };
      setEntries(prev => {
        const updated = [savedEntry, ...prev];
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.warn("Could not cache updated entries:", e);
        }
        return updated;
      });
      setActiveTab("vault");
    } catch (err) {
      console.error("Error saving entry to Firestore:", err);
      setEntries(prev => {
        const updated = [entry, ...prev];
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.warn("Could not cache updated entries:", e);
        }
        return updated;
      });
      setActiveTab("vault");
    }
  };

  // Delete entry from DB/State
  const handleDeleteEntry = async (id: string) => {
    if (user?.isDemo) {
      setEntries(prev => {
        const updated = prev.filter(e => e.id !== id);
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      return;
    }

    try {
      await deleteDoc(doc(db, "users", user!.uid, "entries", id));
      setEntries(prev => {
        const updated = prev.filter(e => e.id !== id);
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.warn("Could not update cached entries after delete:", e);
        }
        return updated;
      });
    } catch (err) {
      console.error("Error deleting entry from Firestore:", err);
      setEntries(prev => {
        const updated = prev.filter(e => e.id !== id);
        try {
          localStorage.setItem(`lumina_vault_${user!.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.warn("Could not update cached entries after delete:", e);
        }
        return updated;
      });
    }
  };

  // Update Accountability Circle in user session & firestore
  const handleUpdateCircle = async (circleData: { enabled: boolean; partners: AccountabilityPartner[] }) => {
    setUser(prev => prev ? { ...prev, accountabilityCircle: circleData } : null);
    if (user && !user.isDemo) {
      try {
        await setDoc(doc(db, "users", user.uid), { accountabilityCircle: circleData }, { merge: true });
      } catch (err) {
        console.error("Error updating circle in Firestore:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 text-earth-900 font-sans flex flex-col selection:bg-terracotta/10 selection:text-earth-900">
      {/* 0. Privacy Policy View */}
      {showPrivacy ? (
        <PrivacyPolicy
          onBack={() => {
            setShowPrivacy(false);
            window.history.pushState({}, "", "/");
          }}
        />
      ) : sharedEntryId ? (
        /* 1. Public Verification View (accessed via shared link) */
        <PublicVerification 
          sharedEntryId={sharedEntryId} 
          onClose={handleCloseVerification} 
        />
      ) : publicAccountability ? (
        /* 2. Public Accountability View (partner streak inspection) */
        <PublicAccountabilityView
          userName={publicAccountability.userName}
          streakCount={publicAccountability.streakCount}
          totalCheckins={publicAccountability.totalCheckins}
          onClose={handleCloseAccountability}
        />
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-[70vh]">
          <RefreshCw className="w-8 h-8 text-terracotta animate-spin" />
          <p className="text-xs font-mono text-terracotta uppercase tracking-widest animate-pulse font-bold">
            Opening Private Record...
          </p>
        </div>
      ) : !user ? (
        <SecureGateway
          onAuthSuccess={handleAuthSuccess}
          onOpenPrivacy={() => {
            setShowPrivacy(true);
            window.history.pushState({}, "", "/privacy");
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* Calming background waves */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <GammaWavesBackground />
            <motion.div
              animate={{
                y: [0, -20, 0],
                x: [0, 15, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 14,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-10 -left-20 w-80 h-80 rounded-full bg-terracotta/[0.04] blur-3xl"
            />
            <motion.div
              animate={{
                y: [0, 30, 0],
                x: [0, -15, 0],
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-sage/[0.04] blur-3xl"
            />
          </div>

          <div className="relative z-10 flex-1 flex flex-col">
            {/* Header with quiet non-punishing streak & navigation tabs */}
            <Header 
              user={user} 
              entries={entries}
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              onLogout={handleLogout} 
            />

            <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12">
              <AnimatePresence mode="wait">
                {activeTab === "command" && (
                  <motion.div
                    key="command"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <CommandCenter user={user} entries={entries} onEntrySaved={handleEntrySaved} />
                  </motion.div>
                )}

                {activeTab === "insights" && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <LuminaInsights entries={entries} user={user} />
                  </motion.div>
                )}

                {activeTab === "card" && (
                  <motion.div
                    key="card"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <DidIWinCard entries={entries} userName={user.displayName || "User"} />
                  </motion.div>
                )}

                {activeTab === "circle" && (
                  <motion.div
                    key="circle"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <AccountabilityCircle 
                      user={user} 
                      entries={entries} 
                      onUpdateCircle={handleUpdateCircle} 
                    />
                  </motion.div>
                )}

                {activeTab === "vault" && (
                  <motion.div
                    key="vault"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <WinVault entries={entries} onDeleteEntry={handleDeleteEntry} />
                  </motion.div>
                )}

                {activeTab === "story" && (
                  <motion.div
                    key="story"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <LuminaStory />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="border-t border-earth-200 bg-white/80 py-4 px-4 text-center mt-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[11px] font-mono text-earth-500">
                <span className="font-semibold uppercase tracking-wider">Lumina Private Record</span>
                <span className="hidden sm:inline w-1 h-1 bg-earth-300 rounded-full" />
                <span>Adults 18+</span>
                <span className="hidden sm:inline w-1 h-1 bg-earth-300 rounded-full" />
                <button
                  onClick={() => {
                    setShowPrivacy(true);
                    window.history.pushState({}, "", "/privacy");
                  }}
                  className="text-terracotta hover:underline font-medium cursor-pointer"
                >
                  Privacy Policy
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
