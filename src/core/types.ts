export const MOODS = ["very_sad", "sad", "neutral", "happy", "very_happy"] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_SCORES: Record<Mood, number> = {
  very_sad: 1,
  sad: 2,
  neutral: 3,
  happy: 4,
  very_happy: 5,
};

export interface EmotionCheckin {
  id: string;
  userId: string;
  mood: Mood;
  intensity?: number;
  note?: string;
  tags?: string[];
  createdAt: string;
}

export interface CheckinInput {
  userId: string;
  mood: Mood;
  intensity?: number;
  note?: string;
  tags?: string[];
}

export interface EmotionSummary {
  userId: string;
  periodDays: number;
  totalCheckins: number;
  averageScore: number | null;
  moodCounts: Record<Mood, number>;
  latest: EmotionCheckin | null;
}
