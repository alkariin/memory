import { Outlet, Link, useLocation } from 'react-router';
import { List, Plus, BookOpen, Settings, X } from 'lucide-react';
import { useState, useRef } from 'react';

export default function Layout() {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const handleExportData = () => {
    const words = JSON.parse(localStorage.getItem('words') || '[]');
    const dataStr = JSON.stringify(words, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary-export-${new Date().toISOString().split('T')[0]}.json`;
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
          localStorage.setItem('words', JSON.stringify(importedWords));
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col max-w-md mx-auto">
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
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h2>Paramètres</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="text-sm mb-2">Données</h3>
              <button 
                onClick={handleExportData}
                className="w-full text-left py-2 text-gray-600 hover:text-gray-900"
              >
                Exporter mes mots
              </button>
              <button 
                onClick={triggerImport}
                className="w-full text-left py-2 text-gray-600 hover:text-gray-900"
              >
                Importer mes mots
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto shadow-lg">
        <div className="flex items-stretch">
          <Link
            to="/list"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/list')
                ? 'text-orange-600 border-orange-600 bg-orange-50'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <List className="w-6 h-6" />
            <span className="text-xs">List</span>
          </Link>

          <Link
            to="/"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/')
                ? 'text-orange-600 border-orange-600 bg-orange-50'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs">Add</span>
          </Link>

          <Link
            to="/review"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/review')
                ? 'text-orange-600 border-orange-600 bg-orange-50'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-xs">Review</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}