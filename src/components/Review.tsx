import { useState, useEffect } from "react";
import {
  Check,
  X,
  Eye,
  EyeOff,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PartyPopper,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router";
import { EASE, ReviewFilterPayload, Word } from "@/shared/types";

// Local type for Review component with UI state
type ReviewWord = Word & { reviewed: boolean };

const INTERVAL = [0, 1, 3, 7, 14, 30, 60, 120, 240]


export default function Review() {
  const navigate = useNavigate();
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [isFilteredSession, setIsFilteredSession] = useState(false);
  const [preserveSchedule, setPreserveSchedule] = useState(false);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = () => {
    const storedWords = JSON.parse(
      localStorage.getItem("words") || "[]",
    );

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];
    
    // Check if there's an active filter
    const filterData = localStorage.getItem("reviewFilter");
    if (filterData) {
      const filter = JSON.parse(filterData) as ReviewFilterPayload | { tag?: string };

      if ("type" in filter && filter.type === "predefined") {
        setFilterLabel(filter.label);
        setIsFilteredSession(true);
        setPreserveSchedule(filter.preserveSchedule);
        const filteredWords = storedWords.filter((w: Word) => filter.wordIds.includes(w.id));
        const orderedWords = filter.wordIds
          .map((id) => filteredWords.find((w: Word) => w.id === id))
          .filter((w): w is Word => Boolean(w));
        const updatedWords: ReviewWord[] = orderedWords.map((w: Word) => ({ ...w, reviewed: false }));
        setWords(updatedWords);
      } else if ("type" in filter && filter.type === "tag") {
        setFilterLabel(filter.tag);
        setIsFilteredSession(true);
        setPreserveSchedule(false);
        const filteredWords = storedWords.filter((w: Word) => w.tags?.includes(filter.tag));
        const updatedWords: ReviewWord[] = filteredWords.map((w: Word) => ({ ...w, reviewed: false }));
        setWords(updatedWords);
      } else {
        // Backward compatibility for older payloads: { tag: string }
        const legacyTag = filter.tag || null;
        setFilterLabel(legacyTag);
        setIsFilteredSession(Boolean(legacyTag));
        setPreserveSchedule(false);
        const filteredWords = legacyTag
          ? storedWords.filter((w: Word) => w.tags?.includes(legacyTag))
          : [];
        const updatedWords: ReviewWord[] = filteredWords.map((w: Word) => ({ ...w, reviewed: false }));
        setWords(updatedWords);
      }

      localStorage.removeItem("reviewFilter"); // Clear filter after use
    } else {
      setFilterLabel(null);
      setIsFilteredSession(false);
      setPreserveSchedule(false);
      // Filter words that are due for review:
      // 1. Never reviewed (nextReviewDate is null), OR
      // 2. nextReviewDate is today or in the past
      const wordsToReview = storedWords.filter((w: Word) => {
        return !w.nextReviewDate || w.nextReviewDate <= today;
      });

      // Add local reviewed property for UI state
      const updatedWords: ReviewWord[] = wordsToReview.map((w: Word) => ({
        ...w,
        reviewed: false
      }));

      setWords(updatedWords);
    }
  };

  const handleFlip = () => {
    setShowWord(!showWord);
  };

  const handleNext = () => {
    setShowWord(false);
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  const handlePrevious = () => {
    setShowWord(false);
    setCurrentIndex(
      (prev) => (prev - 1 + words.length) % words.length,
    );
  };

  const markAsReviewed = (known: boolean) => {
    const currentWord = words[currentIndex];
    const result = known ? EASE.KNOWN : EASE.UNKNOWN;

    // Known → advance iteration (spaced further apart)
    // Unknown → reset iteration to 0 (review again soon)
    const currentIteration = currentWord.iteration || 0;
    const nextIteration = preserveSchedule
      ? currentIteration
      : known && isFilteredSession
        ? currentIteration
        : known
          ? currentIteration + 1
          : 0;

    // Calculate next review interval
    const interval = INTERVAL[Math.min(nextIteration, INTERVAL.length - 1)];
    const nextInterval = Math.max(interval, 1);

    // Calculate next review date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);
    const nextReviewDate = preserveSchedule
      ? currentWord.nextReviewDate
      : nextDate.toISOString().split("T")[0];

    const allWords = JSON.parse(
      localStorage.getItem("words") || "[]",
    );
    const updatedAllWords = allWords.map((w: Word) => {
      if (w.id === currentWord.id) {
        return {
          ...w,
          reviewCount: (w.reviewCount || 0) + 1,
          lastReviewedDate: new Date()
            .toISOString()
            .split("T")[0],
          nextReviewDate,
          iteration: nextIteration,
          ease: result,
        };
      }
      return w;
    });

    localStorage.setItem(
      "words",
      JSON.stringify(updatedAllWords),
    );

    // Update local state
    const updatedWords = [...words];
    updatedWords[currentIndex].reviewed = true;
    updatedWords[currentIndex].reviewCount =
      (updatedWords[currentIndex].reviewCount || 0) + 1;
    updatedWords[currentIndex].lastReviewedDate = new Date()
      .toISOString()
      .split("T")[0];
    updatedWords[currentIndex].nextReviewDate = nextReviewDate;
    updatedWords[currentIndex].iteration = nextIteration;
    updatedWords[currentIndex].ease = result;
    setWords(updatedWords);

    // Check if it was the last word
    if (updatedWords.every((w) => w.reviewed)) {
      setShowCompletionDialog(true);
    } else {
      handleNext();
    }
  };

  const close = () => {
    setWords([]);
    setShowCompletionDialog(false);
    setCurrentIndex(0);
    setShowWord(false);
  };

  if (words.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-50 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-orange-300" />
          </div>
          <h2 className="text-gray-900 mb-1">
            Ready to review?
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            {filterLabel
              ? `No words with the tag "${filterLabel}"`
              : "No words to review"}
          </p>
          <p className="text-sm text-gray-400">
            Add words to get started
          </p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const hasCorrelation =
    currentWord.correlation &&
    currentWord.correlation.trim().length > 0;

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-gray-900">Review</h2>
          <span className="text-sm text-gray-400 font-medium">
            {currentIndex + 1} / {words.length}
          </span>
        </div>
        {filterLabel && (
          <div className="flex items-center gap-2 mt-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs border border-orange-200">
              <Tag className="w-3 h-3" />
              {filterLabel}
            </span>
            {preserveSchedule && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
                No-impact mode
              </span>
            )}
          </div>
        )}
        {preserveSchedule && (
          <p className="text-xs text-gray-400 mt-3">
            This session does not affect iteration or the next review date.
          </p>
        )}
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center mb-6">
        <div
          className="relative w-full bg-white rounded-lg border border-gray-200 overflow-hidden transition-all"
          style={{ minHeight: "320px" }}
        >
          {/* Reviewed Badge */}
          {currentWord.reviewed && (
            <div className="absolute top-4 right-4 bg-orange-500 text-white p-2 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          <div className="p-8 flex flex-col items-center justify-center h-full min-h-[320px]">
            {!hasCorrelation || showWord ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase tracking-wide text-gray-400 mb-4">Word</span>
                <div className="text-2xl text-gray-900 mb-8 font-bold">
                  {currentWord.word}
                </div>
                {hasCorrelation && (
                  <button
                    onClick={handleFlip}
                    className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm px-4 py-2 rounded-lg hover:bg-orange-50 transition-all"
                  >
                    <EyeOff className="w-4 h-4" />
                    Hide the word
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase tracking-wide text-gray-400 mb-4">Definition</span>
                <div className="text-gray-500 leading-relaxed mb-8 max-w-sm text-lg italic">
                  {currentWord.correlation}
                </div>
                <button
                  onClick={handleFlip}
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm px-4 py-2 rounded-lg hover:bg-orange-50 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Show the word
                </button>
              </div>
            )}

            {/* Tags */}
            {currentWord.tags && currentWord.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                {currentWord.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Arrows */}
          <div className="absolute bottom-6 left-6 right-6 flex justify-between">
            <button
              onClick={handlePrevious}
              className="w-10 h-10 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-all flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-all flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex gap-1.5">
          {words.map((word, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                word.reviewed
                  ? "bg-orange-600"
                  : index === currentIndex
                    ? "bg-orange-500"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div className="text-center text-sm text-gray-400 mb-3">
          Did you remember this word?
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => markAsReviewed(false)}
            disabled={currentWord.reviewed}
            className={`flex-1 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 font-medium ${
              currentWord.reviewed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-900 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            <X className="w-5 h-5" />
            <span className="text-sm">Again</span>
          </button>
          <button
            onClick={() => markAsReviewed(true)}
            disabled={currentWord.reviewed}
            className={`flex-1 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 font-medium ${
              currentWord.reviewed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          >
            <Check className="w-5 h-5" />
            <span className="text-sm">Got it</span>
          </button>
        </div>
      </div>


      {/* Completion Dialog */}
      {showCompletionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-orange-50 rounded-lg mx-auto mb-6 flex items-center justify-center">
              <PartyPopper className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-gray-900 mb-3 text-2xl font-bold">
              {preserveSchedule ? "No-impact session completed" : "Congratulations!"}
            </h3>
            <p className="text-gray-500 mb-6">
              {preserveSchedule
                ? "Great job. The filtered words were reviewed without changing your schedule."
                : "You have reviewed all your words. Excellent work!"}
            </p>
            <button
              onClick={() => {
                close();
                if (preserveSchedule) {
                  navigate("/list");
                }
              }}
              className="w-full bg-orange-600 text-white py-3.5 rounded-lg hover:bg-orange-700 transition-all font-medium"
            >
              {preserveSchedule ? "Back to List" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}