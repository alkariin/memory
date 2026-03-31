import { useState, useEffect } from "react";
import {
  Check,
  Eye,
  EyeOff,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PartyPopper,
  Tag,
} from "lucide-react";
import { EASE, Word } from "@/shared/types";

// Local type for Review component with UI state
type ReviewWord = Word & { reviewed: boolean };

const INTERVAL = [0, 1, 3, 7, 14, 30, 60, 120, 240]

const factorInterval = {
  [EASE.EASY]: 1.5,
  [EASE.MEDIUM]: 1,
  [EASE.HARD]: 0.5,
}

export default function Review() {
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);

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
      const filter = JSON.parse(filterData);
      setFilterTag(filter.tag);
      // Filter by tag only (ignore review dates when tag filter is active)
      const filteredWords = storedWords.filter((w: Word) => w.tags?.includes(filter.tag));
      // Add local reviewed property for UI state
      const updatedWords: ReviewWord[] = filteredWords.map((w: Word) => ({ ...w, reviewed: false }));
      setWords(updatedWords);
      localStorage.removeItem("reviewFilter"); // Clear filter after use
    } else {
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

  const markAsReviewed = (difficulty: EASE) => {
    const currentWord = words[currentIndex];
    const isTagFilterActive = filterTag !== null;
    
    // Only update iteration if NOT in tag filter mode
    const currentIteration = currentWord.iteration || 0;
    const nextIteration = difficulty === EASE.HARD || isTagFilterActive ? currentIteration : currentIteration + 1;
    
    // Calculate next review interval based on difficulty
    const baseInterval = INTERVAL[Math.min(nextIteration, INTERVAL.length - 1)];
    const adjustedInterval = Math.max(Math.round(baseInterval * factorInterval[difficulty]), 1);
    
    // Calculate next review date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + adjustedInterval);
    const nextReviewDate = nextDate.toISOString().split("T")[0];

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
          ease: difficulty,
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
    updatedWords[currentIndex].ease = difficulty;
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
          <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-gray-900 mb-1">
            Ready to review?
          </h2>
          <p className="text-gray-600 text-sm mb-1">
            {filterTag
              ? `No words with the tag "${filterTag}"`
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
          <h2 className="text-gray-900">Review mode</h2>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {words.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-gray-600 text-sm">
            {filterTag
              ? `Review the words of the tag: ${filterTag}`
              : "Review your words of the day"}
          </p>
          {filterTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">
              <Tag className="w-3 h-3" />
              {filterTag}
            </span>
          )}
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center mb-6">
        <div
          className="relative w-full bg-white rounded-xl shadow-lg border border-gray-200 transition-all"
          style={{ minHeight: "320px" }}
        >
          {/* Reviewed Badge */}
          {currentWord.reviewed && (
            <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-lg shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          <div className="p-8 flex flex-col items-center justify-center h-full min-h-[320px]">
            {!hasCorrelation || showWord ? (
              <div className="text-center">
                <div className="text-4xl text-gray-900 mb-8">
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
              <div className="text-center">
                <div className="text-gray-700 leading-relaxed mb-6 max-w-sm text-lg">
                  {currentWord.correlation}
                </div>
                <div className="w-16 h-1 bg-orange-500 rounded-full mx-auto mb-6" />
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs"
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
              className="w-10 h-10 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-all flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-all flex items-center justify-center"
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
                  ? "bg-green-500"
                  : index === currentIndex
                    ? "bg-orange-500"
                    : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="text-center text-sm font-medium text-gray-700 mb-3">
          How difficult was this word?
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => markAsReviewed(EASE.EASY)}
            disabled={currentWord.reviewed}
            className={`flex-1 py-3.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 font-medium ${
              currentWord.reviewed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-green-20 text-gray-900 border-2 shadow-sm"
            }`}
          >
            <Check className="w-5 h-5" />
            <span className="text-sm">Easy</span>
          </button>
          <button
            onClick={() => markAsReviewed(EASE.MEDIUM)}
            disabled={currentWord.reviewed}
            className={`flex-1 py-3.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 font-medium ${
              currentWord.reviewed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-orange-50 text-gray-900 border-2 shadow-sm"
            }`}
          >
            <Check className="w-5 h-5" />
            <span className="text-sm">Medium</span>
          </button>
          <button
            onClick={() => markAsReviewed(EASE.HARD)}
            disabled={currentWord.reviewed}
            className={`flex-1 py-3.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 font-medium ${
              currentWord.reviewed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-red-50 text-gray-900 border-2 shadow-sm"
            }`}
          >
            <Check className="w-5 h-5" />
            <span className="text-sm">Hard</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 p-4 bg-orange-50 rounded-lg text-center border border-orange-100">
        <p className="text-sm text-orange-900">
          <span className="font-semibold">
            {words.filter((w) => w.reviewed).length}
          </span>{" "}
          /{" "}
          <span className="font-semibold">{words.length}</span>{" "}
          words reviewed
        </p>
      </div>

      {/* Completion Dialog */}
      {showCompletionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-orange-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <PartyPopper className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-gray-900 mb-3 text-2xl">
              Congratulations!
            </h3>
            <p className="text-gray-600 mb-6">
              You have reviewed all your words for today.
              Excellent work!
            </p>
            <button
              onClick={close}
              className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}