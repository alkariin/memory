import { useState, useEffect, type KeyboardEvent, type FocusEvent, type MouseEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Check, X, Tag } from 'lucide-react';
import { EASE, Word } from '@/shared/types';

export default function AddWord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [word, setWord] = useState('');
  const [correlation, setCorrelation] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  // Load existing word when editing
  useEffect(() => {
    if (id) {
      const storedWords: Word[] = JSON.parse(localStorage.getItem('words') || '[]');
      const found = storedWords.find((w) => w.id === id);
      if (found) {
        setEditingWord(found);
        setWord(found.word);
        setCorrelation(found.correlation || '');
        setTags(found.tags || []);
      } else {
        // Word not found, go back to list
        navigate('/list');
      }
    } else {
      // Reset form when switching from edit to add
      setEditingWord(null);
      setWord('');
      setCorrelation('');
      setTags([]);
      setTagInput('');
    }
  }, [id, navigate]);

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

    const existingWords: Word[] = JSON.parse(localStorage.getItem('words') || '[]');

    if (isEditing && editingWord) {
      // Update existing word
      const updatedWords = existingWords.map((w) =>
        w.id === editingWord.id
          ? { ...w, word: word.trim(), correlation: correlation.trim(), tags }
          : w
      );
      localStorage.setItem('words', JSON.stringify(updatedWords));

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
        date: new Date().toISOString().split('T')[0],
        reviewCount: 0,
        lastReviewedDate: null,
        tags: tags,
        iteration: 0,
        ease: EASE.UNKNOWN,
        nextReviewDate: null,
      };

      const updatedWords = [newWord, ...existingWords];
      localStorage.setItem('words', JSON.stringify(updatedWords));

      // Reset the form
      setWord('');
      setCorrelation('');
      setTags([]);
      setTagInput('');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-1">{isEditing ? 'Edit word' : 'Add a word'}</h2>
        <p className="text-gray-500 text-sm">{isEditing ? 'Modify this word' : 'Expand your vocabulary'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="word" className="block text-sm text-gray-600 mb-2">
            Word to learn
          </label>
          <input
            type="text"
            id="word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Enter the word..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
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
          <label htmlFor="tags" className="block text-sm text-gray-600 mb-2">
            Tags
          </label>
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            onBlur={handleAddTag}
            placeholder="Type a tag and press Enter..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-sm border border-orange-200"
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