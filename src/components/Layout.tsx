import { Outlet, Link, useLocation } from 'react-router';
import { List, Plus, BookOpen } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 border-b border-gray-200">
        <h1 className="text-center text-gray-900 tracking-tight">Vocabulary</h1>
      </header>

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