export interface WinEntry {
  id: string;
  userId: string;
  date: string; // ISO date string (e.g. "2026-07-06")
  timestamp: number; // millisecond timestamp
  durationSeconds?: number;
  category?: "win" | "resilience" | "slowdown";
  isWin?: boolean;
  win: string; // Concise 1-sentence main takeaway
  transcript: string; // Captured transcript verbatim
  winsExtracted?: string[];
  hardMomentsExtracted?: string[];
  slowdownsExtracted?: string[];
  detectedLanguage?: string; // Auto-detected spoken/written language(s)
  sourceType?: "voice" | "upload" | "text";
  audioFileName?: string | null;
  summary?: string | null;
  formattedNotes?: string | null;
  translations?: Record<string, string>;
  feedback: string; // Direct grounded reply
  slowdownCause?: string | null;
  tone?: string | null;
  isGrowthStory?: boolean;
  toneEvolution?: string | null;
  growthContext?: string | null;
  resiliencePoint: boolean;
  tags?: string[];
  status?: "ongoing" | "resolved";
  safetyTier?: "standard" | "venting" | "ambiguous" | "crisis";
  pauseOffer?: string | null;
  patternObservation?: string | null;
  isCrisis?: boolean;
  crisisResources?: string | null;
  parentAlertTriggered?: boolean;
  badHabits?: string[];
  badHabitInsight?: string | null;
  verification?: {
    verifierName: string;
    verifierContact: string;
    verifierEmail?: string;
    verifierPhone?: string;
    verifiedAt: number;
  };
}

export interface AccountabilityPartner {
  id: string;
  name: string;
  email: string;
  inviteCode: string;
  addedAt: number;
}

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo?: boolean;
  createdAt?: number;
  dob?: string;
  age?: number;
  ageVerified?: boolean;
  ageAutoDetected?: boolean;
  parentEmail?: string | null;
  accountabilityCircle?: {
    enabled: boolean;
    partners: AccountabilityPartner[];
  };
}

export interface DidIWinData {
  milestone: "3-day" | "7-day" | "14-day" | "30-day";
  daysRecorded: number;
  daysMissed: number;
  totalDaysInPeriod: number;
  wins: string[];
  resilienceCount: number;
  slowdowns: string[];
  slowdownCauses: string[];
  whatRepeated: string[];
  userOwnWordsQuote: string;
  periodLabel: string;
  growthStoryCount: number;
  streakCount: number;
}
