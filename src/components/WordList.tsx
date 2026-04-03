import { useState, useEffect } from 'react';
import { Calendar, Trash2, List, Tag, Filter, RotateCcw, Clock, Pencil, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Word } from '@/shared/types';

interface GroupedWords {
  [date: string]: Word[];
}

export default function WordList() {
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [groupedWords, setGroupedWords] = useState<GroupedWords>({});
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadWords();
  }, [selectedTag]);

  const loadWords = () => {
    const storedWords = JSON.parse(localStorage.getItem('words') || '[]');
    // Migrate old words without the new fields
    const migratedWords = storedWords.map((w: any) => ({
      ...w,
      reviewCount: w.reviewCount || 0,
      lastReviewedDate: w.lastReviewedDate || null,
      tags: w.tags || [],
    }));
    
    // Extract all unique tags
    const tags = new Set<string>();
    migratedWords.forEach((w: Word) => {
      w.tags?.forEach((tag: string) => tags.add(tag));
    });
    setAllTags(Array.from(tags).sort());
    
    // Filter by tag if a tag is selected
    const filteredWords = selectedTag
      ? migratedWords.filter((w: Word) => w.tags?.includes(selectedTag))
      : migratedWords;
    
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
      const allWords = JSON.parse(localStorage.getItem('words') || '[]');
      const updatedWords = allWords.filter((word: Word) => word.id !== id);
      localStorage.setItem('words', JSON.stringify(updatedWords));
      loadWords();
    }
  };

  const startReviewWithTag = () => {
    if (selectedTag) {
      localStorage.setItem('reviewFilter', JSON.stringify({ tag: selectedTag }));
      navigate('/review');
    }
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
      return date.toLocaleDateString('fr-CH', { 
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
      return 'on ' + date.toLocaleDateString('fr-CH', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const formatNextReview = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-CH', {
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
        <p className="text-gray-500 text-sm">All your words to learn</p>
      </div>

      {/* Filter by tags */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Filter by tag</span>
            </div>
            {selectedTag && words.length > 0 && (
              <button
                onClick={startReviewWithTag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                Review
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedTag === null
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedTag === tag
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Tag className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {words.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-50 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <List className="w-8 h-8 text-orange-300" />
          </div>
          <p className="text-gray-500 mb-1">
            {selectedTag ? `No words with the tag "${selectedTag}"` : 'No words yet'}
          </p>
          <p className="text-sm text-gray-400">
            {selectedTag ? 'Try another filter' : 'Add your first word'}
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
                          
                          {/* Tags */}
                          {word.tags && word.tags.length > 0 && (
                            <div className="mb-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {word.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs"
                                  >
                                    <Tag className="w-3 h-3" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
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