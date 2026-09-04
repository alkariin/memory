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
  category: string | null;
  iteration: number;
  ease: EASE;
}

export enum PREDEFINED_REVIEW_FILTER {
  TODAY = "PREDEFINED_TODAY",
  TOMORROW = "PREDEFINED_TOMORROW",
}

export type ReviewFilterPayload =
  | {
      type: "category";
      category: string;
      preserveSchedule: true;
    }
  | {
      type: "predefined";
      filter: PREDEFINED_REVIEW_FILTER;
      label: string;
      wordIds: string[];
      preserveSchedule: true;
    };
