import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { List, Plus, BookOpen, Settings, Download, Upload } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname.startsWith('/edit/')) return true;
    return location.pathname === path;
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleExport = () => {
    const words = localStorage.getItem('words') || '[]';
    const blob = new Blob([words], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (Array.isArray(data)) {
            localStorage.setItem('words', JSON.stringify(data));
            window.location.reload();
          }
        } catch {
          alert('Invalid file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white px-6 py-5 border-b border-gray-200">
        <div className="relative flex items-center justify-center">
          <h1 className="text-center text-gray-900 tracking-tight">Vocabulary</h1>
          <div ref={menuRef} className="absolute right-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-50">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export words
                </button>
                <button
                  onClick={handleImport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors border-t border-gray-100"
                >
                  <Upload className="w-4 h-4" />
                  Import words
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
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
            to="/"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/')
                ? 'text-orange-600 border-orange-600'
                : 'text-gray-400 border-transparent hover:text-gray-700'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">Add</span>
          </Link>

          <Link
            to="/review"
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-colors border-t-2 ${
              isActive('/review')
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