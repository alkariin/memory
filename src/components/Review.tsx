import { useState, useEffect, useMemo } from "react";
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
  Sparkles,
  List,
} from "lucide-react";
import { useNavigate } from "react-router";
import { EASE, ReviewFilterPayload, ScheduleSnapshot, Word } from "@/shared/types";
import { getIsoDate } from "@/shared/dates";
import {
  CategoryGroup,
  groupWordsByCategory,
  ReviewWord,
  sessionCategoryGroups,
} from "@/shared/groupWordsByCategory";
import { loadStoredWords, saveWords } from "@/shared/words";
import { shouldUseContinuousBars } from "@/shared/reviewProgress";
import { dueWordsFor, ensureDailySnapshot } from "@/shared/dailySnapshot";
import { loadSettings } from "@/shared/settings";
import { loadDailyFillers } from "@/shared/dailyMinimum";
import {
  applySessionOrder,
  firstUnreviewedIndex,
  loadAnswerSnapshots,
  loadSessionOrder,
  nextUnreviewedIndex,
  resumeSessionWords,
  saveAnswerSnapshot,
  saveSessionOrder,
} from "@/shared/reviewSession";

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
  const [dailyMinimum, setDailyMinimum] = useState<number | null>(null);
  // Words that top the day up to the minimum, drawn beyond what was due
  const [fillerIds, setFillerIds] = useState<Set<string>>(new Set());
  const [dayComplete, setDayComplete] = useState(false);
  // The category the session is about to enter, shown on a card of its own
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

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
    // Pre-answer states of the day's own session, empty for a filtered one
    let daySnapshots: Record<string, ScheduleSnapshot> = {};
    // The day's own session, as opposed to one started from the list
    let isDailySession = true;

    // Check if there's an active filter
    const filterData = localStorage.getItem("reviewFilter");
    if (filterData) {
      const filter = JSON.parse(filterData) as ReviewFilterPayload;

      // Freeze today's programme before answering anything outside of it: the
      // day is then settled whatever a filtered session does to the words
      ensureDailySnapshot(today);

      isDailySession = false;
      setDayComplete(false);
      setDailyLimit(null);
      setDailyMinimum(null);
      setFillerIds(new Set());
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

      // The day's word ids, answered ones and fillers included, so the session
      // resumes where it was left instead of losing the words already reviewed
      const { dailyLimitEnabled, dailyWordLimit, dailyMinimumEnabled, dailyMinimumWords } =
        loadSettings();
      setDailyLimit(dailyLimitEnabled ? dailyWordLimit : null);
      setDailyMinimum(dailyMinimumEnabled ? dailyMinimumWords : null);
      const sessionIds = ensureDailySnapshot(today);
      setFillerIds(new Set(dailyMinimumEnabled ? loadDailyFillers(today) ?? [] : []));

      // The day's answers are its progress: a session run from the list
      // answers words for real, but it is not part of the day's programme
      daySnapshots = loadAnswerSnapshots(today);
      rawWords = resumeSessionWords(storedWords, sessionIds, Object.keys(daySnapshots));
      const allAnswered = sessionIds.length > 0 && rawWords.length === 0;
      setDayComplete(allAnswered);
      // Today's words are all answered while others remain due: they wait for tomorrow
      setDailyLimitReached(dailyLimitEnabled && allAnswered && dueWords.length > 0);
    }

    // Grouped by category, the daily limit on or off: the day is drawn at
    // random across categories, but it is still reviewed one category at a time
    const { grouped } = groupWordsByCategory(rawWords);

    // A session of the day keeps the order it was first shown in; a filtered
    // one is started on demand, so it is shuffled anew every time
    const ordered = isDailySession
      ? applySessionOrder(grouped, loadSessionOrder(today))
      : grouped;
    if (isDailySession) saveSessionOrder(ordered.map((w) => w.id), today);

    const restored = ordered.map((w) =>
      daySnapshots[w.id] ? { ...w, beforeAnswer: daySnapshots[w.id] } : w,
    );

    setWords(restored);
    // The row of categories follows the session order, so it stays put from one
    // visit to the next instead of being reshuffled on every load
    setCategoryGroups(sessionCategoryGroups(restored));
    setCurrentIndex(firstUnreviewedIndex(restored));
    setPendingCategory(null);
  };

  const handleFlip = () => {
    setShowWord(!showWord);
  };

  const handleNext = () => {
    setShowWord(false);
    setCurrentIndex((prev) => Math.min(prev + 1, words.length - 1));
  };

  const handlePrevious = () => {
    setShowWord(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const markAsReviewed = (known: boolean) => {
    const currentWord = words[currentIndex];
    const result = known ? EASE.KNOWN : EASE.UNKNOWN;
    const isAnswerChange = currentWord.reviewed;

    // Changing an answer recomputes from the state the word had before the
    // first one, so switching back and forth does not stack up
    const beforeAnswer: ScheduleSnapshot = currentWord.beforeAnswer ?? {
      reviewCount: currentWord.reviewCount || 0,
      lastReviewedDate: currentWord.lastReviewedDate,
      nextReviewDate: currentWord.nextReviewDate,
      iteration: currentWord.iteration || 0,
      ease: currentWord.ease,
    };

    // Known -> advance iteration (spaced further apart)
    // Unknown -> drop by 2 iterations (floor at 0)
    const currentIteration = beforeAnswer.iteration || 0;
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
      ? beforeAnswer.nextReviewDate
      : getIsoDate(nextDate);

    const answered = {
      reviewCount: (beforeAnswer.reviewCount || 0) + 1,
      lastReviewedDate: getIsoDate(),
      nextReviewDate,
      iteration: nextIteration,
      ease: result,
    };

    const updatedAllWords = loadStoredWords().map((w) =>
      w.id === currentWord.id ? { ...w, ...answered } : w,
    );

    saveWords(updatedAllWords);
    // Snapshots double as the day's progress, so a filtered session writes none
    if (!isAnswerChange && !isFilteredSession) {
      saveAnswerSnapshot(currentWord.id, beforeAnswer);
    }

    // Update local state
    const updatedWords = words.map((w, index) =>
      index === currentIndex
        ? { ...w, ...answered, reviewed: true, beforeAnswer }
        : w,
    );
    setWords(updatedWords);

    // Changing an answer stays on the card so the new choice stays visible
    if (isAnswerChange) return;

    // Check if it was the last word
    if (updatedWords.every((w) => w.reviewed)) {
      setShowCompletionDialog(true);
    } else {
      const nextIndex = nextUnreviewedIndex(updatedWords, currentIndex);
      const currentCategory = updatedWords[currentIndex].assignedCategory;
      const nextCategory = updatedWords[nextIndex].assignedCategory;

      // Announce the new group on a card of its own before its first word
      if (currentCategory !== nextCategory) {
        setPendingCategory(nextCategory);
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
    setPendingCategory(null);
    // A session of the day ends the day; a filtered one leaves it untouched
    if (!isFilteredSession) setDayComplete(true);
  };

  if (words.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-50 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-orange-300" />
          </div>
          <h2 className="text-gray-900 mb-1">
            {dayComplete ? "All done for today" : "Ready to review?"}
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            {filterLabel
              ? `No words in the category "${filterLabel}"`
              : dailyLimitReached
                ? `You are done for today (${dailyLimit} words)`
                : dayComplete
                  ? "Every word of the day has been reviewed"
                  : "No words to review"}
          </p>
          <p className="text-sm text-gray-400">
            {dailyLimitReached
              ? "The remaining words wait for tomorrow"
              : dayComplete
                ? "Come back tomorrow for the next ones"
                : "Add words to get started"}
          </p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const pendingCategoryCount = pendingCategory
    ? words.filter((w) => w.assignedCategory === pendingCategory && !w.reviewed).length
    : 0;
  const isFirstWord = currentIndex === 0;
  const isLastWord = currentIndex === words.length - 1;
  const hasCorrelation =
    currentWord.correlation &&
    currentWord.correlation.trim().length > 0;
  // The card is flipped once the word side is showing; it starts on the definition
  const isFlipped = Boolean(hasCorrelation) && showWord;

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
          <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs border border-orange-200">
              <Tag className="w-3 h-3" />
              {filterLabel}
            </span>
            {preserveSchedule && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
                No-impact mode
              </span>
            )}
            {/* A filtered session is left on demand: the words already answered
                keep their answer, the rest simply stay untouched */}
            <button
              onClick={() => navigate("/list")}
              className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded text-xs transition-all"
            >
              <X className="w-3 h-3" />
              Stop this review
            </button>
          </div>
        )}
        {(dailyLimit !== null || dailyMinimum !== null) && (
          <div className="flex items-center gap-2 mt-2 mb-3">
            {dailyLimit !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
                <Shuffle className="w-3 h-3" />
                {dailyLimit} words a day
              </span>
            )}
            {dailyMinimum !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200">
                <Sparkles className="w-3 h-3" />
                at least {dailyMinimum} a day
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
        {pendingCategory ? (
          /* Announces the group the session moves into, so the change is not missed */
          <button
            onClick={() => setPendingCategory(null)}
            className="w-full rounded-lg border border-orange-200 bg-orange-50 p-8 flex flex-col items-center justify-center text-center transition-all hover:bg-orange-100"
            style={{ minHeight: "320px" }}
          >
            <span className="text-xs uppercase tracking-wide text-orange-400 mb-4">
              Next category
            </span>
            <span className="inline-flex items-center gap-2 text-2xl text-gray-900 font-bold mb-2">
              <Tag className="w-5 h-5 text-orange-500" />
              {pendingCategory}
            </span>
            <span className="text-sm text-gray-500 mb-8">
              {pendingCategoryCount} word{pendingCategoryCount > 1 ? "s" : ""} to review
            </span>
            <span className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-medium">
              Start
              <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        ) : (
          <div
            className={`relative w-full rounded-lg border overflow-hidden transition-all ${
              isFlipped
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

              {/* Category, and whether the word is a filler beyond the due ones */}
              {(currentWord.category || fillerIds.has(currentWord.id)) && (
                <div className="flex justify-center gap-2 mt-4">
                  {currentWord.category && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-orange-600 rounded text-xs ${
                        isFlipped ? "" : "bg-orange-50"
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      {currentWord.category}
                    </span>
                  )}
                  {fillerIds.has(currentWord.id) && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-gray-500 rounded text-xs ${
                        isFlipped ? "" : "bg-gray-100"
                      }`}
                      title="Not due today: drawn to reach the daily minimum"
                    >
                      <Sparkles className="w-3 h-3" />
                      Extra
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={isFirstWord}
                aria-label="Previous word"
                className={`w-10 h-10 text-gray-500 hover:text-gray-700 rounded-lg transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none ${
                  isFlipped ? "hover:bg-orange-100" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                disabled={isLastWord}
                aria-label="Next word"
                className={`w-10 h-10 text-gray-500 hover:text-gray-700 rounded-lg transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none ${
                  isFlipped ? "hover:bg-orange-100" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
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
      <div className={`space-y-3 ${pendingCategory ? "invisible" : ""}`}>
        <div className="text-center text-sm text-gray-400 mb-3">
          {currentWord.reviewed
            ? "Your answer - pick the other one to change it"
            : "Did you remember this word?"}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => markAsReviewed(false)}
            aria-pressed={currentWord.reviewed && currentWord.ease === EASE.UNKNOWN}
            className={`flex-1 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 font-medium ${
              !currentWord.reviewed
                ? "bg-white text-gray-900 border border-gray-300 hover:bg-gray-100"
                : currentWord.ease === EASE.UNKNOWN
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            }`}
          >
            <X className="w-5 h-5" />
            <span className="text-sm">Again</span>
          </button>
          <button
            onClick={() => markAsReviewed(true)}
            aria-pressed={currentWord.reviewed && currentWord.ease === EASE.KNOWN}
            className={`flex-1 py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 font-medium ${
              !currentWord.reviewed
                ? "bg-orange-600 text-white hover:bg-orange-700"
                : currentWord.ease === EASE.KNOWN
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            }`}
          >
            <Check className="w-5 h-5" />
            <span className="text-sm">Got it</span>
          </button>
        </div>
      </div>


      {/* Completion Dialog */}
      {showCompletionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
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