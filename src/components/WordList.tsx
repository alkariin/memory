import { useState, useEffect } from 'react';
import { Calendar, Trash2, List, Tag, Filter, RotateCcw, Clock, X, Plus, Check, BookOpen } from 'lucide-react';
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
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

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

  const addTagToWord = (wordId: string) => {
    if (!tagInput.trim()) return;
    
    const allWords = JSON.parse(localStorage.getItem('words') || '[]');
    const updatedWords = allWords.map((w: Word) => {
      if (w.id === wordId) {
        const tags = w.tags || [];
        if (!tags.includes(tagInput.trim())) {
          return { ...w, tags: [...tags, tagInput.trim()] };
        }
      }
      return w;
    });
    
    localStorage.setItem('words', JSON.stringify(updatedWords));
    setTagInput('');
    loadWords();
  };

  const removeTagFromWord = (wordId: string, tagToRemove: string) => {
    const allWords = JSON.parse(localStorage.getItem('words') || '[]');
    const updatedWords = allWords.map((w: Word) => {
      if (w.id === wordId) {
        return { ...w, tags: (w.tags || []).filter(t => t !== tagToRemove) };
      }
      return w;
    });
    
    localStorage.setItem('words', JSON.stringify(updatedWords));
    loadWords();
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
          <span className="text-sm text-gray-500">
            {words.length} {words.length > 1 ? 'words' : 'word'}
          </span>
        </div>
        <p className="text-gray-600 text-sm">All your words to learn</p>
      </div>

      {/* Filter by tags */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Filter by tag</span>
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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <List className="w-8 h-8 text-gray-400" />
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
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm text-gray-700">
                    {formatDate(date)}
                  </h3>
                </div>

                <div className="space-y-2">
                  {groupedWords[date].map((word) => (
                    <div
                      key={word.id}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-orange-200 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-2">
                            <h4 className="text-gray-900">
                              {word.word}
                            </h4>
                            {word.correlation && (
                              <p className="text-sm text-gray-600 truncate flex-1">
                                - {word.correlation}
                              </p>
                            )}
                          </div>
                          
                          {/* Tags */}
                          <div className="mb-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {word.tags && word.tags.length > 0 && word.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs group/tag"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                  {editingWordId === word.id && (
                                    <button
                                      onClick={() => removeTagFromWord(word.id, tag)}
                                      className="hover:text-orange-900"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                              
                              {editingWordId === word.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        addTagToWord(word.id);
                                      }
                                    }}
                                    placeholder="New tag..."
                                    className="px-2 py-0.5 text-xs border border-orange-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => addTagToWord(word.id)}
                                    className="p-0.5 text-green-600 hover:text-green-700"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingWordId(null);
                                      setTagInput('');
                                    }}
                                    className="p-0.5 text-gray-600 hover:text-gray-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingWordId(word.id)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                  Tag
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Review stats */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
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
                        <button
                          onClick={() => deleteWord(word.id)}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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