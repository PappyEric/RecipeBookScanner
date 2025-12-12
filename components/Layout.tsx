import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Camera, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'My Cookbook', path: '/', icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Digitize / Scan', path: '/digitize', icon: <Camera className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-stone-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <Link to="/" className="text-xl font-serif font-bold text-sage-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Heirloom
        </Link>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-stone-600">
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar Navigation (Desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        w-64 bg-white border-r border-stone-200 z-10 flex flex-col
      `}>
        <div className="p-6 border-b border-stone-100 hidden md:block">
          <Link to="/" className="text-2xl font-serif font-bold text-sage-800 flex items-center gap-2">
            <BookOpen className="w-7 h-7" />
            Heirloom
          </Link>
          <p className="text-xs text-stone-500 mt-2">Preserving culinary history</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-sage-100 text-sage-800 font-medium'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-stone-100">
           <div className="bg-sage-50 p-4 rounded-lg text-xs text-sage-700">
              <p className="font-semibold mb-1">Self-Hosted</p>
              <p>Your data stays in your browser's local storage.</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;