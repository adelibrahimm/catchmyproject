import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, ArrowRight, ArrowLeft, FolderOpen, Heart } from 'lucide-react';

import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { ProjectIdea } from '../lib/gemini';

export interface HistoryEntry {
    id: string;
    timestamp: number;
    courses: string[];
    ideas: ProjectIdea[];
}

const HISTORY_KEY = 'cmp-history';
const FAVORITES_KEY = 'cmp-favorites';

export function saveToHistory(courses: string[], ideas: ProjectIdea[]) {
    try {
        const existing: HistoryEntry[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const entry: HistoryEntry = {
            id: Date.now().toString(36),
            timestamp: Date.now(),
            courses,
            ideas,
        };
        existing.unshift(entry);
        // Keep last 20 sessions
        localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 20)));
    } catch { /* ignore */ }
}

export function getFavorites(): ProjectIdea[] {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
}

export function toggleFavorite(idea: ProjectIdea): boolean {
    const favs = getFavorites();
    const exists = favs.find(f => f.id === idea.id);
    let updated: ProjectIdea[];
    if (exists) {
        updated = favs.filter(f => f.id !== idea.id);
    } else {
        updated = [idea, ...favs];
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return !exists; // returns true if added
}

export function isFavorite(id: string): boolean {
    return getFavorites().some(f => f.id === id);
}

export default function History() {
    const navigate = useNavigate();
    const { lang } = useLanguage();
    const { isDark } = useTheme();
    const [tab, setTab] = useState<'history' | 'favorites'>('history');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [favorites, setFavorites] = useState<ProjectIdea[]>([]);

    useEffect(() => {
        setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
        setFavorites(getFavorites());
    }, []);

    const clearHistory = () => {
        localStorage.removeItem(HISTORY_KEY);
        setHistory([]);
    };

    const removeFavorite = (id: string) => {
        const updated = favorites.filter(f => f.id !== id);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        setFavorites(updated);
    };

    const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const ArrowNav = lang === 'ar' ? ArrowLeft : ArrowRight;

    return (
        <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                        <FolderOpen className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    </div>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {lang === 'ar' ? 'سجل المشاريع' : 'Project Dashboard'}
                    </h2>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => { setTab('history'); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'history'
                                ? isDark ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                                : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Clock className="w-4 h-4 inline mr-1.5" />
                        {lang === 'ar' ? 'السجل' : 'History'} ({history.length})
                    </button>
                    <button
                        onClick={() => { setTab('favorites'); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'favorites'
                                ? isDark ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                                : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Heart className="w-4 h-4 inline mr-1.5" />
                        {lang === 'ar' ? 'المفضلة' : 'Favorites'} ({favorites.length})
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {tab === 'history' && (
                        <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {history.length === 0 ? (
                                <div className={`border rounded-2xl p-8 text-center ${cardClass}`}>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {lang === 'ar' ? 'لا يوجد سجل بعد. ابدأ بتوليد أفكار!' : 'No history yet. Start generating ideas!'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className={`flex justify-end mb-2`}>
                                        <button onClick={clearHistory} className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
                                            <Trash2 className="w-3 h-3" /> {lang === 'ar' ? 'مسح الكل' : 'Clear All'}
                                        </button>
                                    </div>
                                    {history.map(entry => (
                                        <div key={entry.id} className={`border rounded-2xl p-5 shadow-sm ${cardClass}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {new Date(entry.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {entry.courses.slice(0, 3).map(c => (
                                                        <span key={c} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                            {c.length > 20 ? c.slice(0, 20) + '…' : c}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {entry.ideas.map(idea => (
                                                    <button
                                                        key={idea.id}
                                                        onClick={() => { navigate('/plan', { state: { idea } }); }}
                                                        className={`w-full text-start px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between transition-all ${isDark ? 'bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        <span className="truncate pr-2">{idea.title}</span>
                                                        <ArrowNav className="w-4 h-4 flex-shrink-0 opacity-40" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </motion.div>
                    )}

                    {tab === 'favorites' && (
                        <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {favorites.length === 0 ? (
                                <div className={`border rounded-2xl p-8 text-center ${cardClass}`}>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {lang === 'ar' ? 'لا توجد مفضلات. اضغط على ❤️ في بطاقة أي فكرة لحفظها.' : 'No favorites yet. Click ❤️ on any idea card to save it.'}
                                    </p>
                                </div>
                            ) : (
                                favorites.map(idea => (
                                    <div key={idea.id} className={`border rounded-2xl p-5 shadow-sm ${cardClass}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{idea.title}</h4>
                                            <button onClick={() => removeFavorite(idea.id)} className="text-red-500 hover:text-red-600 flex-shrink-0 p-1">
                                                <Heart className="w-4 h-4 fill-current" />
                                            </button>
                                        </div>
                                        <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{idea.description}</p>
                                        <button
                                            onClick={() => { navigate('/plan', { state: { idea } }); }}
                                            className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                                        >
                                            {lang === 'ar' ? 'عرض خطة التنفيذ' : 'View Plan'} <ArrowNav className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
