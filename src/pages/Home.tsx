import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, BookOpen, Layers, Cpu, Code2, Brain, Database, Settings } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { getProfile } from './Profile';
import PageMeta from '../components/PageMeta';
import { useCountUp } from '../lib/useCountUp';

// Stat counter component — ref passed from useCountUp triggers IntersectionObserver
function StatCounter({ target, label, suffix = '' }: { target: number; label: string; suffix?: string }) {
  const { isDark } = useTheme();
  const { count, ref } = useCountUp(target, 1200);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center">
      <div className={`text-4xl sm:text-5xl font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {count}{suffix}
      </div>
      <div className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Brief skeleton delay so cards animate in on first load
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Smart CTA: go to /generate if profile exists, else go fill profile first
  const handleStart = () => {
    const profile = getProfile();
    const hasProfile = profile && profile.name && profile.name.trim().length > 0;
    navigate(hasProfile ? '/generate' : '/profile');
  };

  const COURSES = [
    { name: t('course_kbs'), icon: BookOpen, color: 'text-emerald-600' },
    { name: t('course_ml'), icon: Brain, color: 'text-purple-600' },
    { name: t('course_nn'), icon: Code2, color: 'text-red-600' },
    { name: t('course_ot'), icon: Settings, color: 'text-rose-600' },
    { name: t('course_cc'), icon: Layers, color: 'text-cyan-600' },
    { name: t('course_ad'), icon: Database, color: 'text-amber-600' },
    { name: t('course_sda'), icon: Cpu, color: 'text-blue-600' },
  ];

  const STATS = [
    { target: 7, label: lang === 'ar' ? 'مقررات دراسية' : 'Courses Covered', suffix: '' },
    { target: 50, label: lang === 'ar' ? 'مهارة مدعومة' : 'Skills Tracked', suffix: '+' },
    { target: 3, label: lang === 'ar' ? 'أفكار لكل جلسة' : 'Ideas per Run', suffix: '' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16 py-8 sm:py-12">
      <PageMeta
        title={lang === 'ar' ? 'الرئيسية' : 'Home'}
        description="AI-powered project idea generator for NMU Computer Science &amp; Engineering students. Discover innovative projects for your semester courses."
      />

      {/* Hero */}
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
          <button
            onClick={handleStart}
            aria-label="Get started with the project generator"
            className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-full bg-gradient-to-r from-red-700 to-rose-700 text-white font-semibold text-base sm:text-lg hover:from-red-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-red-600/25 group"
          >
            {t('home_cta')}
            {lang === 'ar' ? (
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Course Cards — skeleton until mounted */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-2"
      >
        {COURSES.map((course, i) =>
          !mounted ? (
            // Skeleton card
            <div
              key={i}
              className={`border rounded-2xl p-5 sm:p-6 animate-pulse ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className={`w-12 h-12 rounded-xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
              <div className={`h-4 rounded-lg w-3/4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            </div>
          ) : (
            // Real card
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`border shadow-sm rounded-2xl p-5 sm:p-6 hover:shadow-md transition-all group ${isDark ? 'bg-slate-800 border-slate-700 hover:border-red-800' : 'bg-white border-slate-200 hover:border-red-200'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isDark ? 'bg-slate-700 group-hover:bg-red-900/30' : 'bg-slate-50 group-hover:bg-red-50'}`}>
                <course.icon className={`w-6 h-6 ${course.color}`} />
              </div>
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{course.name}</h3>
            </motion.div>
          )
        )}
      </motion.div>

      {/* Animated Stats Section — only shown after mount so IntersectionObserver fires correctly */}
      {mounted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`rounded-3xl border p-8 sm:p-10 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'}`}
        >
          <p className={`text-center text-sm font-semibold uppercase tracking-widest mb-8 ${isDark ? 'text-slate-500' : 'text-red-400'}`}>
            {lang === 'ar' ? 'إحصائيات المنصة' : 'Platform at a Glance'}
          </p>
          <div className={`grid grid-cols-3 gap-6 sm:gap-10 divide-x ${isDark ? 'divide-slate-700' : 'divide-red-100'}`}>
            {STATS.map((stat, i) => (
              <StatCounter key={i} target={stat.target} label={stat.label} suffix={stat.suffix} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
