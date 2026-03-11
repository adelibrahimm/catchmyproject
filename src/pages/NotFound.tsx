import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useLanguage } from '../lib/i18n';

export default function NotFound() {
    const { isDark } = useTheme();
    const { lang } = useLanguage();

    return (
        <div className={`min-h-[80vh] flex items-center justify-center px-4`}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center max-w-md w-full"
            >
                {/* Animated 404 number */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200 }}
                    className="relative mb-6 select-none"
                >
                    <span
                        className="text-[120px] sm:text-[160px] font-black leading-none tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-red-600 to-rose-400"
                    >
                        404
                    </span>
                    <div
                        className={`absolute inset-0 text-[120px] sm:text-[160px] font-black leading-none tracking-tighter blur-2xl opacity-20 bg-clip-text text-transparent bg-gradient-to-br from-red-600 to-rose-400 select-none pointer-events-none`}
                    >
                        404
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-3 mb-8"
                >
                    <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {lang === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
                    </h1>
                    <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lang === 'ar'
                            ? 'يبدو أن الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
                            : "The page you're looking for doesn't exist or has been moved."}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                    <button
                        onClick={() => window.history.back()}
                        aria-label="Go back to previous page"
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {lang === 'ar' ? 'رجوع' : 'Go Back'}
                    </button>
                    <Link
                        to="/home"
                        aria-label="Go to homepage"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <Home className="w-4 h-4" />
                        {lang === 'ar' ? 'الرئيسية' : 'Home'}
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
