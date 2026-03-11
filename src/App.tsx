import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Home as HomeIcon, Lightbulb, Languages, User, FolderOpen, Moon, Sun } from 'lucide-react';
import Home from './pages/Home';
import Generator from './pages/Generator';
import Plan from './pages/Plan';
import Profile from './pages/Profile';
import History from './pages/History';
import NotFound from './pages/NotFound';
import Footer from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { LanguageProvider, useLanguage } from './lib/i18n';
import { ThemeProvider, useTheme } from './lib/theme';

function Navigation() {
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { path: '/home', label: t('nav_home'), icon: HomeIcon },
    { path: '/generate', label: t('nav_generator'), icon: Lightbulb },
    { path: '/history', label: lang === 'ar' ? 'السجل' : 'History', icon: FolderOpen },
    { path: '/profile', label: lang === 'ar' ? 'ملفي' : 'My Profile', icon: User },
  ];

  return (
    <header className={`shadow-md z-50 sticky top-0 ${isDark ? 'bg-slate-900 border-b border-slate-800' : 'bg-red-700'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between p-3 sm:p-4">
        <Link to="/home" className="flex items-center gap-2 sm:gap-3 group">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-sm border border-red-500/30 group-hover:ring-2 group-hover:ring-white/50 transition-all bg-white flex items-center justify-center">
            <img src="/nmu-logo.png" alt="NMU Logo" loading="lazy" className="w-[90%] h-[90%] object-contain" />
          </div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white hidden sm:block">
            {t('nav_title')}
          </h1>
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden p-2 rounded-lg text-white hover:bg-red-800/50"
          aria-label="Toggle menu"
        >
          <div className="space-y-1.5">
            <div className={`w-5 h-0.5 bg-white transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-5 h-0.5 bg-white transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 bg-white transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-medium ${isActive
                  ? isDark ? 'bg-red-600/30 text-red-300' : 'bg-red-800/50 text-white shadow-inner'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-red-100 hover:text-white hover:bg-black/5'
                  }`}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-slate-700' : 'bg-red-600/50'}`} />
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-red-100 hover:text-white hover:bg-black/5'}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-red-100 hover:text-white hover:bg-black/5'}`}
            aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            title="Toggle Language"
          >
            <Languages className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">{lang === 'en' ? 'عربي' : 'EN'}</span>
          </button>
        </nav>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className={`sm:hidden absolute top-full left-0 right-0 border-t shadow-xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-red-700 border-red-600/50'}`}>
          <div className="p-3 space-y-1">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium w-full ${isActive
                    ? isDark ? 'bg-red-600/30 text-red-300' : 'bg-red-800/50 text-white'
                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-red-100 hover:text-white hover:bg-red-800/30'
                    }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className={`flex items-center gap-2 px-4 py-3 border-t mt-2 pt-3 ${isDark ? 'border-slate-800' : 'border-red-600/50'}`}>
              <button
                onClick={() => { toggleTheme(); setMenuOpen(false); }}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-sm font-medium ${isDark ? 'text-amber-400 bg-slate-800' : 'text-white bg-red-800/50'}`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? 'Light' : 'Dark'}
              </button>
              <button
                onClick={() => { setLang(lang === 'en' ? 'ar' : 'en'); setMenuOpen(false); }}
                className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-sm font-medium ${isDark ? 'text-slate-300 bg-slate-800' : 'text-white bg-red-800/50'}`}
              >
                <Languages className="w-4 h-4" />
                {lang === 'en' ? 'عربي' : 'English'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const location = useLocation();

  return (
    <div className={`min-h-screen font-sans relative selection:bg-red-600/30 flex flex-col ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <Navigation />

      <main className="px-4 pb-12 w-full overflow-hidden flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/generate" element={
                <ErrorBoundary>
                  <Generator />
                </ErrorBoundary>
              } />
              <Route path="/plan" element={
                <ErrorBoundary>
                  <Plan />
                </ErrorBoundary>
              } />
              <Route path="/history" element={<History />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
