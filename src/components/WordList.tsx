import { useState, useEffect } from 'react';
import { Calendar, Trash2, List, Tag, Filter, Search, RotateCcw, Clock, Pencil, BookOpen } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { PREDEFINED_REVIEW_FILTER, ReviewFilterPayload, Word } from '@/shared/types';
import { getIsoDate } from '@/shared/dates';
import { loadStoredWords, saveWords } from '@/shared/words';
import { ensureDailySnapshot } from '@/shared/dailySnapshot';

interface GroupedWords {
  [date: string]: Word[];
}

const TODAY_FILTER_LABEL = "Today";
const TOMORROW_FILTER_LABEL = 'Tomorrow';

const getTodayDate = () => getIsoDate();

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getIsoDate(tomorrow);
};

const isPredefinedFilter = (category: string | null): category is PREDEFINED_REVIEW_FILTER => {
  return category === PREDEFINED_REVIEW_FILTER.TODAY || category === PREDEFINED_REVIEW_FILTER.TOMORROW;
};

const getFilterLabel = (category: string | null) => {
  if (category === PREDEFINED_REVIEW_FILTER.TODAY) return TODAY_FILTER_LABEL;
  if (category === PREDEFINED_REVIEW_FILTER.TOMORROW) return TOMORROW_FILTER_LABEL;
  return category;
};

export default function WordList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [groupedWords, setGroupedWords] = useState<GroupedWords>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showCategoryFilters, setShowCategoryFilters] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wordToDelete, setWordToDelete] = useState<Word | null>(null);
  const canStartReview = Boolean(selectedCategory && words.length > 0);

  useEffect(() => {
    loadWords();
  }, [selectedCategory, searchQuery]);

  // `?word=<id>` (from a review card) points at one word: clear the filters so
  // it is visible, then drop the param so a refresh does not replay it
  useEffect(() => {
    const id = searchParams.get('word');
    if (!id) return;

    setHighlightedId(id);
    setSelectedCategory(null);
    setSearchQuery('');
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Scroll the targeted word into view, then fade the highlight out
  useEffect(() => {
    if (!highlightedId) return;

    document
      .getElementById(`word-${highlightedId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const timeout = setTimeout(() => setHighlightedId(null), 2500);
    return () => clearTimeout(timeout);
  }, [highlightedId, words]);

  // Escape closes the confirmation, as the native dialog it replaces did
  useEffect(() => {
    if (!wordToDelete) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWordToDelete(null);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [wordToDelete]);

  const loadWords = () => {
    const storedWords = loadStoredWords();

    // The words today's review started from: with the daily limit on, the
    // day's random draw rather than everything that was due
    const todayWordIds = new Set(ensureDailySnapshot(getTodayDate()));

    // Extract all unique categories
    const categories = new Set<string>();
    storedWords.forEach((w) => {
      if (w.category) categories.add(w.category);
    });
    setAllCategories(Array.from(categories).sort());

    // Filter by selected category first
    const categoryFilteredWords = selectedCategory
      ? selectedCategory === PREDEFINED_REVIEW_FILTER.TODAY
        ? storedWords.filter((w) => todayWordIds.has(w.id))
        : selectedCategory === PREDEFINED_REVIEW_FILTER.TOMORROW
          ? storedWords.filter((w) => w.nextReviewDate === getTomorrowDate())
          : storedWords.filter((w) => w.category === selectedCategory)
      : storedWords;

    // Then filter by search query on word or correlation
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredWords = normalizedQuery
      ? categoryFilteredWords.filter((w) =>
          w.word.toLowerCase().includes(normalizedQuery)
          || w.correlation.toLowerCase().includes(normalizedQuery)
        )
      : categoryFilteredWords;

    setWords(filteredWords);

    // Group words by date
    const grouped = filteredWords.reduce((acc: GroupedWords, word: Word) => {
      if (!acc[word.date]) {
        acc[word.date] = [];
      }
      acc[word.date].push(word);
      return acc;
    }, {});

    setGroupedWords(grouped);
  };

  // Confirmed in the app rather than with window.confirm: the native dialog is
  // titled with the site's own address, in the language of the browser
  const deleteWord = () => {
    if (!wordToDelete) return;

    saveWords(loadStoredWords().filter((word) => word.id !== wordToDelete.id));
    setWordToDelete(null);
    loadWords();
  };

  const startReviewWithCategory = () => {
    if (selectedCategory) {
      if (isPredefinedFilter(selectedCategory)) {
        const payload: ReviewFilterPayload = {
          type: 'predefined',
          filter: selectedCategory,
          label: selectedCategory === PREDEFINED_REVIEW_FILTER.TODAY ? TODAY_FILTER_LABEL : TOMORROW_FILTER_LABEL,
          wordIds: words.map((word) => word.id),
          preserveSchedule: true,
        };
        localStorage.setItem('reviewFilter', JSON.stringify(payload));
      } else {
        const payload: ReviewFilterPayload = {
          type: 'category',
          category: selectedCategory,
          preserveSchedule: true,
        };
        localStorage.setItem('reviewFilter', JSON.stringify(payload));
      }
      navigate('/review');
    }
  };

  const toggleCategoryFilters = () => {
    if (showCategoryFilters) {
      setShowCategoryFilters(false);
      setSelectedCategory(null);
      return;
    }

    setShowCategoryFilters(true);
    setShowSearch(false);
    setSearchQuery('');
  };

  const toggleSearch = () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchQuery('');
      return;
    }

    setShowSearch(true);
    setShowCategoryFilters(false);
    setSelectedCategory(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const formatLastReviewed = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'yesterday';
    } else {
      return 'on ' + date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const formatNextReview = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-gray-900">My words</h2>
          <span className="text-sm text-gray-400">
            {words.length} {words.length > 1 ? 'words' : 'word'}
          </span>
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="mb-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={toggleCategoryFilters}
              className={`inline-flex items-center gap-1.5 px-6 py-3 rounded-lg text-sm transition-all ${
                showCategoryFilters
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button
              onClick={toggleSearch}
              className={`inline-flex items-center gap-1.5 px-6 py-3 rounded-lg text-sm transition-all ${
                showSearch
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
          {showSearch && (
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in words or definitions..."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}
          {showCategoryFilters && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                selectedCategory === null
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === PREDEFINED_REVIEW_FILTER.TODAY ? null : PREDEFINED_REVIEW_FILTER.TODAY)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                selectedCategory === PREDEFINED_REVIEW_FILTER.TODAY
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              <Tag className="w-3 h-3" />
              {TODAY_FILTER_LABEL}
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === PREDEFINED_REVIEW_FILTER.TOMORROW ? null : PREDEFINED_REVIEW_FILTER.TOMORROW)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                selectedCategory === PREDEFINED_REVIEW_FILTER.TOMORROW
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              <Tag className="w-3 h-3" />
              {TOMORROW_FILTER_LABEL}
            </button>
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                  selectedCategory === category
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Tag className="w-3 h-3" />
                {category}
              </button>
            ))}
          </div>
          )}
          {canStartReview && (
            <button
              onClick={startReviewWithCategory}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-medium"
            >
              <BookOpen className="w-4 h-4" />
              Review "{getFilterLabel(selectedCategory)}"
            </button>
          )}
      </div>

      {words.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-50 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <List className="w-8 h-8 text-orange-300" />
          </div>
          <p className="text-gray-500 mb-1">
            {searchQuery
              ? `No words match "${searchQuery}"`
              : selectedCategory
                ? `No words in the category "${getFilterLabel(selectedCategory)}"`
                : 'No words yet'}
          </p>
          <p className="text-sm text-gray-400">
            {selectedCategory ? 'Try another filter' : 'Add your first word'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedWords)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map((date) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm text-gray-500 font-medium">
                    {formatDate(date)}
                  </h3>
                </div>

                <div className="space-y-3">
                  {groupedWords[date].map((word) => (
                    <div
                      key={word.id}
                      id={`word-${word.id}`}
                      className={`bg-white rounded-lg p-4 border hover:border-orange-200 hover:shadow-md transition-all group ${
                        highlightedId === word.id
                          ? 'border-orange-300 ring-2 ring-orange-400'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-gray-900 font-bold">
                              {word.word}
                            </h4>
                          </div>
                          {word.correlation && (
                            <p className="text-sm text-gray-500 mb-2 truncate">
                              {word.correlation}
                            </p>
                          )}
                          
                          {/* Category */}
                          {word.category && (
                            <div className="mb-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs">
                                <Tag className="w-3 h-3" />
                                {word.category}
                              </span>
                            </div>
                          )}
                          
                          {/* Review stats */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <div className="inline-flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              <span>
                                {word.reviewCount || 0} review{(word.reviewCount || 0) > 1 ? 's' : ''}
                              </span>
                            </div>
                            {word.lastReviewedDate && (
                              <div className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Reviewed {formatLastReviewed(word.lastReviewedDate)}
                                </span>
                              </div>
                            )}
                            {word.nextReviewDate && (
                              <div className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Next: {formatNextReview(word.nextReviewDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex flex-col gap-1">
                          <button
                            onClick={() => navigate(`/edit/${word.id}`)}
                            className="p-2 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setWordToDelete(word)}
                            className="p-2 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Delete confirmation */}
      {wordToDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          onClick={() => setWordToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-word-title"
            className="bg-white rounded-lg p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="w-20 h-20 bg-red-50 rounded-lg mx-auto mb-6 flex items-center justify-center">
              <Trash2 className="w-10 h-10 text-red-600" />
            </div>
            <h3 id="delete-word-title" className="text-gray-900 mb-3 text-2xl font-bold">
              Delete this word?
            </h3>
            <p className="text-gray-500 mb-6 break-words">
              "{wordToDelete.word}" is deleted for good, with its review history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setWordToDelete(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-lg hover:bg-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={deleteWord}
                className="flex-1 bg-red-600 text-white py-3.5 rounded-lg hover:bg-red-700 transition-all font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
