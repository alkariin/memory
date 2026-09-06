import { useState, useEffect, useCallback, useMemo } from "react";
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
  Shuffle,
  List,
} from "lucide-react";
import { useNavigate } from "react-router";
import { EASE, ReviewFilterPayload, Word } from "@/shared/types";
import { getIsoDate } from "@/shared/dates";
import {
  CategoryGroup,
  groupWordsAsSingleGroup,
  groupWordsByCategory,
  ReviewWord,
} from "@/shared/groupWordsByCategory";
import { loadStoredWords, saveWords } from "@/shared/words";
import { shouldUseContinuousBars } from "@/shared/reviewProgress";
import { dueWordsFor } from "@/shared/dailySnapshot";
import { loadSettings } from "@/shared/settings";
import { ensureDailyDraw } from "@/shared/dailySelection";

const INTERVAL = [0, 1, 3, 7, 14, 30, 60, 120, 240];


export default function Review() {
  const navigate = useNavigate();
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showWord, setShowWord] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [isFilteredSession, setIsFilteredSession] = useState(false);
  const [preserveSchedule, setPreserveSchedule] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [categoryTransition, setCategoryTransition] = useState(false);

  // Lookup maps so the progress row stays O(n) instead of scanning words per segment
  const wordById = useMemo(
    () => new Map(words.map((w) => [w.id, w])),
    [words],
  );
  const indexById = useMemo(
    () => new Map(words.map((w, i) => [w.id, i])),
    [words],
  );
  const useContinuousBars = useMemo(
    () => shouldUseContinuousBars(categoryGroups),
    [categoryGroups],
  );

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = () => {
    const storedWords = loadStoredWords();

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = getIsoDate();

    let rawWords: (Word & { reviewed: boolean })[] = [];
    // A limited session mixes categories, so it is grouped as one block
    let isDrawnSession = false;

    // Check if there's an active filter
    const filterData = localStorage.getItem("reviewFilter");
    if (filterData) {
      const filter = JSON.parse(filterData) as ReviewFilterPayload;

      setDailyLimit(null);
      setDailyLimitReached(false);

      if (filter.type === "predefined") {
        setFilterLabel(filter.label);
        setIsFilteredSession(true);
        setPreserveSchedule(filter.preserveSchedule);
        const orderedWords = filter.wordIds
          .map((id) => storedWords.find((w) => w.id === id))
          .filter((w): w is Word => Boolean(w));
        rawWords = orderedWords.map((w) => ({ ...w, reviewed: false }));
      } else {
        setFilterLabel(filter.category);
        setIsFilteredSession(true);
        setPreserveSchedule(filter.preserveSchedule);
        rawWords = storedWords
          .filter((w) => w.category === filter.category)
          .map((w) => ({ ...w, reviewed: false }));
      }

      localStorage.removeItem("reviewFilter"); // Clear filter after use
    } else {
      setFilterLabel(null);
      setIsFilteredSession(false);
      setPreserveSchedule(false);
      const dueWords = dueWordsFor(storedWords, today);

      const { dailyLimitEnabled, dailyWordLimit } = loadSettings();
      if (dailyLimitEnabled) {
        setDailyLimit(dailyWordLimit);
        isDrawnSession = true;
        const { words: drawn } = ensureDailyDraw(dueWords, dailyWordLimit, today);
        rawWords = drawn.map((w) => ({ ...w, reviewed: false }));
        // Today's draw is done while words remain due: they wait for tomorrow
        setDailyLimitReached(drawn.length === 0 && dueWords.length > 0);
      } else {
        setDailyLimit(null);
        setDailyLimitReached(false);
        rawWords = dueWords.map((w) => ({ ...w, reviewed: false }));
      }
    }

    // Group by category, unless the words were drawn across all categories
    const { grouped, categoryGroups: groups } = isDrawnSession
      ? groupWordsAsSingleGroup(rawWords)
      : groupWordsByCategory(rawWords);
    setWords(grouped);
    setCategoryGroups(groups);
  };

  const handleFlip = () => {
    setShowWord(!showWord);
  };

  // Find the next unreviewed word, preferring within current category group
  const findNextUnreviewed = useCallback((updatedWords: ReviewWord[], fromIndex: number): number => {
    // First try to find next unreviewed in same category group
    const currentCategory = updatedWords[fromIndex]?.assignedCategory;
    if (currentCategory) {
      for (let i = fromIndex + 1; i < updatedWords.length; i++) {
        if (!updatedWords[i].reviewed && updatedWords[i].assignedCategory === currentCategory) {
          return i;
        }
      }
    }
    // Then find any next unreviewed (next category group)
    for (let i = fromIndex + 1; i < updatedWords.length; i++) {
      if (!updatedWords[i].reviewed) return i;
    }
    // Wrap around
    for (let i = 0; i < fromIndex; i++) {
      if (!updatedWords[i].reviewed) return i;
    }
    return fromIndex;
  }, []);

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

    // Known -> advance iteration (spaced further apart)
    // Unknown -> drop by 2 iterations (floor at 0)
    const currentIteration = currentWord.iteration || 0;
    const nextIteration = preserveSchedule
      ? currentIteration
      : known && isFilteredSession
        ? currentIteration
        : known
          ? currentIteration + 1
          : Math.max(0, currentIteration - 2);

    // Calculate next review interval
    const interval = INTERVAL[Math.min(nextIteration, INTERVAL.length - 1)];
    const nextInterval = Math.max(interval, 1);

    // Calculate next review date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);
    const nextReviewDate = preserveSchedule
      ? currentWord.nextReviewDate
      : getIsoDate(nextDate);

    const updatedAllWords = loadStoredWords().map((w) => {
      if (w.id === currentWord.id) {
        return {
          ...w,
          reviewCount: (w.reviewCount || 0) + 1,
          lastReviewedDate: getIsoDate(),
          nextReviewDate,
          iteration: nextIteration,
          ease: result,
        };
      }
      return w;
    });

    saveWords(updatedAllWords);

    // Update local state
    const updatedWords = [...words];
    updatedWords[currentIndex].reviewed = true;
    updatedWords[currentIndex].reviewCount =
      (updatedWords[currentIndex].reviewCount || 0) + 1;
    updatedWords[currentIndex].lastReviewedDate = getIsoDate();
    updatedWords[currentIndex].nextReviewDate = nextReviewDate;
    updatedWords[currentIndex].iteration = nextIteration;
    updatedWords[currentIndex].ease = result;
    setWords(updatedWords);

    // Check if it was the last word
    if (updatedWords.every((w) => w.reviewed)) {
      setShowCompletionDialog(true);
    } else {
      // Find next unreviewed word
      const nextIndex = findNextUnreviewed(updatedWords, currentIndex);
      const currentCategory = updatedWords[currentIndex].assignedCategory;
      const nextCategory = updatedWords[nextIndex].assignedCategory;

      // Show category transition animation if changing groups
      if (currentCategory !== nextCategory) {
        setCategoryTransition(true);
        setTimeout(() => setCategoryTransition(false), 1500);
      }

      setShowWord(false);
      setCurrentIndex(nextIndex);
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
              ? `No words in the category "${filterLabel}"`
              : dailyLimitReached
                ? `You are done for today (${dailyLimit} words)`
                : "No words to review"}
          </p>
          <p className="text-sm text-gray-400">
            {dailyLimitReached
              ? "The remaining words wait for tomorrow"
              : "Add words to get started"}
          </p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const hasCorrelation =
    currentWord.correlation &&
    currentWord.correlation.trim().length > 0;
  // The card is flipped when the definition side is showing
  const showingDefinition = Boolean(hasCorrelation) && !showWord;

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
        {dailyLimit !== null && (
          <div className="flex items-center gap-2 mt-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
              <Shuffle className="w-3 h-3" />
              {dailyLimit} words a day
            </span>
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
          className={`relative w-full rounded-lg border overflow-hidden transition-all ${
            showingDefinition
              ? "bg-orange-50 border-orange-200"
              : "bg-white border-gray-200"
          }`}
          style={{ minHeight: "320px" }}
        >
          {/* Reviewed Badge */}
          {currentWord.reviewed && (
            <div className="absolute top-4 right-4 bg-orange-500 text-white p-2 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          {/* Shortcut to this word in the list */}
          <button
            onClick={() => navigate(`/list?word=${currentWord.id}`)}
            className="absolute top-4 left-4 p-2 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
            aria-label="Show in the list"
            title="Show in the list"
          >
            <List className="w-5 h-5" />
          </button>

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
                <div className="text-2xl text-gray-900 leading-relaxed mb-8 max-w-sm font-bold">
                  {currentWord.correlation}
                </div>
                <button
                  onClick={handleFlip}
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm px-4 py-2 rounded-lg hover:bg-orange-100 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Show the word
                </button>
              </div>
            )}

            {/* Category */}
            {currentWord.category && (
              <div className={`flex justify-center mt-4 ${categoryTransition ? "animate-category-pulse" : ""}`}>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-orange-600 rounded text-xs ${
                    showingDefinition ? "bg-white" : "bg-orange-50"
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {currentWord.category}
                </span>
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

      {/* Progress - grouped by category */}
      <div className="mb-6">
        <div className="flex gap-2">
          {categoryGroups.map((group) => {
            const reviewedCount = group.wordIds.reduce(
              (count, id) => (wordById.get(id)?.reviewed ? count + 1 : count),
              0,
            );
            const isActiveGroup = currentWord.assignedCategory === group.category;
            return (
              <div key={group.category} className="flex-1 min-w-0 flex flex-col gap-1">
                {categoryGroups.length > 1 && (
                  <span
                    className={`text-[10px] truncate text-center ${
                      isActiveGroup ? "text-orange-600" : "text-gray-400"
                    }`}
                  >
                    {group.category}
                  </span>
                )}
                {useContinuousBars ? (
                  <>
                    <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-orange-600 rounded-full transition-all"
                        style={{
                          width: `${(reviewedCount / group.wordIds.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 text-center tabular-nums">
                      {reviewedCount}/{group.wordIds.length}
                    </span>
                  </>
                ) : (
                  <div className="flex gap-0.5 min-w-0 overflow-hidden">
                    {group.wordIds.map((id) => {
                      const word = wordById.get(id);
                      return (
                        <div
                          key={id}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            word?.reviewed
                              ? "bg-orange-600"
                              : indexById.get(id) === currentIndex
                                ? "bg-orange-500"
                                : "bg-gray-200"
                          }`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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