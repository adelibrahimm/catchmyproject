import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ArrowLeft, BookOpen, Layers, Cpu, Code2, Brain, Database, Settings } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export default function Home() {
  const { t, lang } = useLanguage();
  const { isDark } = useTheme();

  const COURSES = [
    { name: t('course_kbs'), icon: BookOpen, color: 'text-emerald-600' },
    { name: t('course_ml'), icon: Brain, color: 'text-purple-600' },
    { name: t('course_nn'), icon: Code2, color: 'text-red-600' },
    { name: t('course_ot'), icon: Settings, color: 'text-rose-600' },
    { name: t('course_cc'), icon: Layers, color: 'text-cyan-600' },
    { name: t('course_ad'), icon: Database, color: 'text-amber-600' },
    { name: t('course_sda'), icon: Cpu, color: 'text-blue-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <h1 className={`text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t('home_title_1')}<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-rose-600">
            {t('home_title_2')}
          </span>
        </h1>
        <p className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {t('home_subtitle')}
        </p>

        <div className="pt-8">
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-full bg-gradient-to-r from-red-700 to-rose-700 text-white font-semibold text-base sm:text-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-red-600/25 group"
          >
            {t('home_cta')}
            {lang === 'ar' ? (
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-2"
      >
        {COURSES.map((course, i) => (
          <div key={i} className={`border shadow-sm rounded-2xl p-5 sm:p-6 hover:shadow-md transition-all group ${isDark ? 'bg-slate-800 border-slate-700 hover:border-red-800' : 'bg-white border-slate-200 hover:border-red-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isDark ? 'bg-slate-700 group-hover:bg-red-900/30' : 'bg-slate-50 group-hover:bg-red-50'}`}>
              <course.icon className={`w-6 h-6 ${course.color}`} />
            </div>
            <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{course.name}</h3>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
