import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Check, X, Tag } from 'lucide-react';
import { EASE, Word } from '@/shared/types';
import { getIsoDate } from '@/shared/dates';
import { loadStoredWords, saveWords } from '@/shared/words';

export default function AddWord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [word, setWord] = useState('');
  const [correlation, setCorrelation] = useState('');
  const [category, setCategory] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all existing categories from localStorage
  useEffect(() => {
    const categorySet = new Set<string>();
    loadStoredWords().forEach((w) => {
      if (w.category) categorySet.add(w.category);
    });
    setAllCategories(Array.from(categorySet).sort());
  }, []);

  // Load existing word when editing
  useEffect(() => {
    if (id) {
      const found = loadStoredWords().find((w) => w.id === id);
      if (found) {
        setEditingWord(found);
        setWord(found.word);
        setCorrelation(found.correlation || '');
        setCategory(found.category || '');
      } else {
        navigate('/list');
      }
    } else {
      setEditingWord(null);
      setWord('');
      setCorrelation('');
      setCategory('');
    }
  }, [id, navigate]);

  const filteredSuggestions = allCategories.filter(
    (c) =>
      c.toLowerCase().includes(category.trim().toLowerCase()) &&
      c.toLowerCase() !== category.trim().toLowerCase()
  );

  const selectSuggestion = (suggestion: string) => {
    setCategory(suggestion);
    setShowSuggestions(false);
  };

  const handleCategoryBlur = () => {
    // Delay to allow click on suggestion to fire first
    blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleCategoryFocus = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }
    setShowSuggestions(true);
  };

  // Browsers word their own validation bubble in the UI language, so the
  // message is set here to keep the app in English
  const showMissingWord = (e: React.FormEvent<HTMLTextAreaElement>) => {
    e.currentTarget.setCustomValidity('Please enter a word to learn');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!word.trim()) return;

    const existingWords = loadStoredWords();
    const trimmedCategory = category.trim() || null;

    if (isEditing && editingWord) {
      // Update existing word
      saveWords(
        existingWords.map((w) =>
          w.id === editingWord.id
            ? { ...w, word: word.trim(), correlation: correlation.trim(), category: trimmedCategory }
            : w
        )
      );

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/list');
      }, 1200);
    } else {
      // Add new word
      const newWord: Word = {
        id: Date.now().toString(),
        word: word.trim(),
        correlation: correlation.trim(),
        date: getIsoDate(),
        reviewCount: 0,
        lastReviewedDate: null,
        category: trimmedCategory,
        iteration: 0,
        ease: EASE.UNKNOWN,
        nextReviewDate: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return getIsoDate(d); })(),
      };

      saveWords([newWord, ...existingWords]);

      if (trimmedCategory && !allCategories.includes(trimmedCategory)) {
        setAllCategories([...allCategories, trimmedCategory].sort());
      }

      // Reset the form
      setWord('');
      setCorrelation('');
      setCategory('');

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-gray-900">{isEditing ? 'Edit word' : 'Add a word'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="word" className="block text-sm text-gray-600 mb-2">
            Word to learn
          </label>
          <textarea
            id="word"
            value={word}
            onChange={(e) => {
              e.currentTarget.setCustomValidity('');
              setWord(e.target.value);
            }}
            onInvalid={showMissingWord}
            placeholder="Enter the word or a sentence..."
            rows={3}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none shadow-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="correlation" className="block text-sm text-gray-600 mb-2">
            Definition or example
          </label>
          <textarea
            id="correlation"
            value={correlation}
            onChange={(e) => setCorrelation(e.target.value)}
            placeholder="A sentence or a related word..."
            rows={5}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none shadow-sm"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm text-gray-600 mb-2">
            Category
          </label>
          <div className="relative">
            <input
              type="text"
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setShowSuggestions(false);
                }
              }}
              onBlur={handleCategoryBlur}
              onFocus={handleCategoryFocus}
              placeholder="Choose or type a category..."
              className="w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
              autoComplete="off"
            />
            {category && (
              <button
                type="button"
                onClick={() => setCategory('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Clear category"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg overflow-hidden z-50 max-h-32 overflow-auto">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(suggestion);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Tag className="w-3 h-3 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          {isEditing && (
            <button
              type="button"
              onClick={() => navigate('/list')}
              className="flex-1 bg-white text-gray-700 py-3.5 rounded-lg border border-gray-200 hover:bg-gray-100 active:scale-[0.99] transition-all font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="flex-1 bg-orange-600 text-white py-3.5 rounded-lg hover:bg-orange-700 active:scale-[0.99] transition-all font-medium"
          >
            {isEditing ? 'Save changes' : 'Add the word'}
          </button>
        </div>
      </form>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 z-50">
          <Check className="w-5 h-5" />
          <span>{isEditing ? 'Word updated successfully' : 'Word added successfully'}</span>
        </div>
      )}
    </div>
  );
}
