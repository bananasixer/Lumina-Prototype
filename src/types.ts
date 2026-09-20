export interface WinEntry {
  id: string;
  userId: string;
  date: string; // ISO date string (e.g. "2026-07-06")
  timestamp: number; // millisecond timestamp
  durationSeconds?: number; // check-in duration with no cutoff
  category?: "win" | "resilience" | "slowdown"; // Category: Win, Hard moment, or What slowed you down
  isWin?: boolean; // True if an accomplishment or positive win
  win: string; // The simple 1-sentence win or main takeaway
  transcript: string; // The full words you spoke or typed
  feedback: string; // Friendly, simple reply in plain English
  slowdownCause?: string | null; // What caused you to fall back or procrastinate
  tone?: string; // e.g. "calm", "steady", "tired", "hopeful"
  isGrowthStory?: boolean; // true if struggle resurfaced later with different/evolved tone
  toneEvolution?: string | null;
  growthContext?: string | null;
  resiliencePoint: boolean; // True if stress or challenge navigated
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
    verifierContact: string; // email or phone
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
