export enum EASE {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

export interface Word {
  id: string;
  word: string;
  correlation: string;
  date: string;
  reviewed: boolean;
  reviewCount: number;
  lastReviewedDate: string | null;
  nextReviewDate: string | null;
  tags: string[];
  iteration: number;
  ease: EASE;
}

