import { Outlet, Link, useLocation } from 'react-router';
import { List, Plus, BookOpen, Settings, X, Download, Upload } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { getIsoDate } from '@/shared/dates';
import { loadStoredWords, migrateWords, saveWords } from '@/shared/words';
import { ensureDailySnapshot } from '@/shared/dailySnapshot';
import {
  DEFAULT_DAILY_MINIMUM_WORDS,
  DEFAULT_DAILY_WORD_LIMIT,
  loadSettings,
  saveSettings,
  Settings as AppSettings,
} from '@/shared/settings';
import { clearDailySelection } from '@/shared/dailySelection';
import { clearDailyFillers } from '@/shared/dailyMinimum';

export default function Layout() {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureDailySnapshot();
  }, []);

  const isActive = (path: string) => {
    if (path === '/add' && location.pathname.startsWith('/edit/')) return true;
    if (path === '/' && location.pathname === '/review') return true;
    return location.pathname === path;
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(loadStoredWords(), null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary-export-${getIsoDate()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedWords = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedWords)) {
          // Older exports store a `tags` array: migrate them to a single category
          saveWords(migrateWords(importedWords));
          alert('Data successfully imported!');
          window.location.reload();
        } else {
          alert('Invalid format');
        }
      } catch (error) {
        alert('Error during the importation');
      }
    };
    reader.readAsText(file);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  // Changing a setting drops today's draw and fillers so it applies right away
  const updateSettings = (changes: Partial<AppSettings>) => {
    const next = { ...settings, ...changes };
    setSettings(next);
    saveSettings(next);
    clearDailySelection();
    clearDailyFillers();
  };

  const handleCountChange = (key: 'dailyWordLimit' | 'dailyMinimumWords', value: string) => {
    const count = Number.parseInt(value, 10);
    if (!Number.isFinite(count) || count < 1) return;
    updateSettings({ [key]: count });
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4 border-b flex items-center justify-between">
        <div className="w-10"></div>
        <h1 className="text-gray-900">Vocabulary</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)}></div>

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-52 bg-white shadow-xl border-l-2 border-gray-300">
            <div className="p-4 border-b flex items-center justify-between">
              <h2>Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={handleExportData}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 rounded-lg border border-gray-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export my words
              </button>
              <button
                onClick={triggerImport}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-700 rounded-lg border border-gray-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import my words
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />

              <div className="pt-3 border-t border-gray-200 space-y-2">
                <label className="flex items-center justify-between gap-2 text-sm text-gray-700 cursor-pointer">
                  <span>Daily limit</span>
                  <input
                    type="checkbox"
                    checked={settings.dailyLimitEnabled}
                    onChange={(e) => updateSettings({ dailyLimitEnabled: e.target.checked })}
                    className="w-4 h-4 accent-orange-600"
                  />
                </label>
                <p className="text-xs text-gray-400">
                  Review a fixed number of words a day, drawn at random across all categories.
                </p>
                {settings.dailyLimitEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      defaultValue={settings.dailyWordLimit || DEFAULT_DAILY_WORD_LIMIT}
                      onChange={(e) => handleCountChange('dailyWordLimit', e.target.value)}
                      className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-500">words / day</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200 space-y-2">
                <label className="flex items-center justify-between gap-2 text-sm text-gray-700 cursor-pointer">
                  <span>Daily minimum</span>
                  <input
                    type="checkbox"
                    checked={settings.dailyMinimumEnabled}
                    onChange={(e) => updateSettings({ dailyMinimumEnabled: e.target.checked })}
                    className="w-4 h-4 accent-orange-600"
                  />
                </label>
                <p className="text-xs text-gray-400">
                  Top a short day up with words drawn at random from your list, as far as it goes.
                </p>
                {settings.dailyMinimumEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      defaultValue={settings.dailyMinimumWords || DEFAULT_DAILY_MINIMUM_WORDS}
                      onChange={(e) => handleCountChange('dailyMinimumWords', e.target.value)}
                      className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-500">words / day</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {/* Keyed so the current page picks up a changed daily limit immediately */}
        <Outlet
          key={`${settings.dailyLimitEnabled}-${settings.dailyWordLimit}-${settings.dailyMinimumEnabled}-${settings.dailyMinimumWords}`}
        />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 max-w-md mx-auto">
        <div className="flex items-stretch">
          <Link
            to="/list"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/list')
                ? 'text-orange-600 border-orange-600'
                : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            <List className="w-5 h-5" />
            <span className="text-xs">List</span>
          </Link>

          <Link
            to="/add"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/add')
                ? 'text-orange-600 border-orange-600'
                : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">Add</span>
          </Link>

          <Link
            to="/"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/')
                ? 'text-orange-600 border-orange-600'
                : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-xs">Review</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}