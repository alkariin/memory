import { useState, useEffect } from 'react';
import { Calendar, Trash2, List, Tag, Filter, Search, RotateCcw, Clock, Pencil, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router';
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
  const [words, setWords] = useState<Word[]>([]);
  const [groupedWords, setGroupedWords] = useState<GroupedWords>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showCategoryFilters, setShowCategoryFilters] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const canStartReview = Boolean(selectedCategory && words.length > 0);

  useEffect(() => {
    loadWords();
  }, [selectedCategory, searchQuery]);

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

  const deleteWord = (id: string) => {
    if (window.confirm('Are you sure you want to delete this word?')) {
      saveWords(loadStoredWords().filter((word) => word.id !== id));
      loadWords();
    }
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
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
            <button
              onClick={startReviewWithCategory}
              disabled={!canStartReview}
              tabIndex={canStartReview ? 0 : -1}
              aria-hidden={!canStartReview}
              style={{ visibility: canStartReview ? 'visible' : 'hidden' }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-all disabled:pointer-events-none"
            >
              <BookOpen className="w-4 h-4" />
              Review
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
                      className="bg-white rounded-lg p-4 border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all group"
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
                            onClick={() => deleteWord(word.id)}
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
    </div>
  );
}
