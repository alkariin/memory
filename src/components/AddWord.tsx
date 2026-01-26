import { useState, type KeyboardEvent, type FocusEvent, type MouseEvent } from 'react';
import { Check, X, Tag } from 'lucide-react';
import { EASE, Word } from '@/shared/types';

export default function AddWord() {
  const [word, setWord] = useState('');
  const [correlation, setCorrelation] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddTag = (e?: KeyboardEvent | FocusEvent | MouseEvent) => {
    if (e) {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Enter') {
        return;
      }
      if (e.type === 'keydown' || e.type === 'click') {
        e.preventDefault();
      }
    }

    if (tagInput.trim()) {
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word.trim()) return;

    const newWord: Word = {
      id: Date.now().toString(),
      word: word.trim(),
      correlation: correlation.trim(),
      date: new Date().toISOString().split('T')[0],
      reviewCount: 0,
      lastReviewedDate: null,
      tags: tags,
      iteration: 0,
      ease: EASE.MEDIUM,
      nextReviewDate: null,
    };

    // Get existing words
    const existingWords = JSON.parse(localStorage.getItem('words') || '[]');
    const updatedWords = [newWord, ...existingWords];
    localStorage.setItem('words', JSON.stringify(updatedWords));

    // Reset the form
    setWord('');
    setCorrelation('');
    setTags([]);
    setTagInput('');
    
    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-1">Add a word</h2>
        <p className="text-gray-600 text-sm">Expand your vocabulary</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="word" className="block text-sm text-gray-700 mb-2">
            Word to learn
          </label>
          <input
            type="text"
            id="word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Enter the word..."
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="correlation" className="block text-sm text-gray-700 mb-2">
            Definition or example
          </label>
          <textarea
            id="correlation"
            value={correlation}
            onChange={(e) => setCorrelation(e.target.value)}
            placeholder="A sentence or a related word..."
            rows={6}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm text-gray-700 mb-2">
            Tags (optional)
          </label>
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              onBlur={handleAddTag}
              placeholder="Type a tag and press Enter..."
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-orange-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3.5 rounded-lg hover:bg-orange-700 active:scale-[0.99] transition-all shadow-sm"
        >
          Add the word
        </button>
      </form>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Check className="w-5 h-5" />
          <span>Word added successfully</span>
        </div>
      )}
    </div>
  );
}