export enum EASE {
  KNOWN = "KNOWN",
  UNKNOWN = "UNKNOWN",
}

export interface Word {
  id: string;
  word: string;
  correlation: string;
  date: string;
  reviewCount: number;
  lastReviewedDate: string | null;
  nextReviewDate: string | null;
  tags: string[];
  iteration: number;
  ease: EASE;
}

