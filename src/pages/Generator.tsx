import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Upload, Zap, Heart, Brain, BookOpen, RefreshCw } from 'lucide-react';
import { generateIdeas, ProjectIdea } from '../lib/gemini';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { TOPICS } from '../lib/topics';
import { SKILLS, SKILL_CATEGORIES } from '../lib/skills';
import { runInference, formatInferenceForPrompt, InferenceResult } from '../lib/knowledgeBase/ruleEngine';
import { parseCV } from '../lib/ml/cvParser';
import { optimizeProjectSelection, OptimizationResult } from '../lib/optimization/projectOptimizer';
import { saveToHistory, toggleFavorite, isFavorite } from './History';
import { getProfile } from './Profile';

export default function Generator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang } = useLanguage();
  const { isDark } = useTheme();
  const cvInputRef = useRef<HTMLInputElement>(null);

  const step = parseInt(searchParams.get('step') || '1', 10);
  const setStep = (newStep: number) => setSearchParams({ step: newStep.toString() });

  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);

  const [cvParsing, setCvParsing] = useState(false);
  const [cvResult, setCvResult] = useState<string | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [inferenceData, setInferenceData] = useState<InferenceResult | null>(null);
  const [, setFavRefresh] = useState(0);

  useEffect(() => {
    const profile = getProfile();
    if (profile && profile.skills.length > 0) {
      setSelectedSkills(prev => [...new Set([...prev, ...profile.skills])]);
    }
  }, []);

  const COURSES = [
    t('course_kbs'), t('course_cc'), t('course_ot'),
    t('course_nn'), t('course_ad'), t('course_ml'), t('course_sda')
  ];

  const toggleCourse = (course: string) => {
    setSelectedCourses(prev =>
      prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
    );
  };
  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId]
    );
  };
  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
    );
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    setCvParsing(true);
    setCvResult(null);
    try {
      const result = await parseCV(file);
      setSelectedSkills(prev => [...new Set([...prev, ...result.detectedSkillIds])]);
      setCvResult(
        lang === 'ar'
          ? `تم اكتشاف ${result.detectedSkillIds.length} مهارة من السيرة الذاتية`
          : `Detected ${result.detectedSkillIds.length} skills from your CV`
      );
    } catch (err) {
      console.error('CV parsing failed:', err);
      setCvResult(lang === 'ar' ? 'فشل في تحليل السيرة الذاتية' : 'Failed to parse CV');
    } finally {
      setCvParsing(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedCourses.length === 0 || selectedTopics.length === 0 || selectedSkills.length === 0) return;
    setIsLoading(true);
    setError(null);
    setOptimizationResult(null);
    setInferenceData(null);
    setSearchParams({ step: '4' });

    try {
      const interestsStr = selectedTopics.map(id => {
        const topic = TOPICS.find(t => t.id === id);
        return topic ? (lang === 'ar' ? topic.ar : topic.en) : id;
      }).join(', ');

      const strengthsStr = selectedSkills.map(id => {
        const skill = SKILLS.find(s => s.id === id);
        return skill ? (lang === 'ar' ? skill.ar : skill.en) : id;
      }).join(', ');

      const inferenceResult = runInference(selectedSkills, selectedTopics);
      const kbContext = formatInferenceForPrompt(inferenceResult);
      setInferenceData(inferenceResult);

      const results = await generateIdeas(selectedCourses, interestsStr, strengthsStr, lang, kbContext);
      setIdeas(results);
      saveToHistory(selectedCourses, results);
    } catch (err) {
      console.error("Failed to generate ideas:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = () => {
    const result = optimizeProjectSelection(ideas, selectedCourses);
    setOptimizationResult(result);
  };

  const handleSelectIdea = (idea: ProjectIdea) => {
    navigate('/plan', { state: { idea } });
  };

  const ArrowNext = lang === 'ar' ? ArrowLeft : ArrowRight;

  // Theme-aware classes
  const cardClass = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200';
  const stepContainerClass = isDark
    ? 'bg-slate-800/80 border border-slate-700 shadow-lg shadow-slate-900/30'
    : 'bg-white border border-slate-200 shadow-sm';
  const btnInactiveClass = isDark
    ? 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300';
  const btnActiveClass = isDark
    ? 'bg-red-900/30 border-red-700 text-red-300 shadow-sm ring-1 ring-red-600/30'
    : 'bg-red-50 border-red-200 text-red-800 shadow-sm ring-1 ring-red-500/20';
  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const subClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const backBtnClass = isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200';

  // Accent colors for idea cards
  const cardAccents = [
    { gradient: 'from-red-500 to-rose-600', light: 'bg-red-50', dark: 'bg-red-900/20', border: isDark ? 'border-red-800' : 'border-red-200' },
    { gradient: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', dark: 'bg-blue-900/20', border: isDark ? 'border-blue-800' : 'border-blue-200' },
    { gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', dark: 'bg-emerald-900/20', border: isDark ? 'border-emerald-800' : 'border-emerald-200' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4 relative">

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className={`text-2xl sm:text-3xl font-bold ${headingClass}`}>{t('gen_title')}</h2>
        <div className="flex gap-1.5 sm:gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 sm:h-2 w-8 sm:w-12 rounded-full transition-colors ${step >= s ? 'bg-red-600' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Course Selection ─── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
            className={`rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 ${stepContainerClass}`}
          >
            <div>
              <h3 className={`text-lg sm:text-xl font-bold mb-2 ${headingClass}`}>{t('gen_step1_title')}</h3>
              <p className={`text-sm sm:text-base ${subClass}`}>{t('gen_step1_desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {COURSES.map(course => (
                <button
                  key={course}
                  onClick={() => toggleCourse(course)}
                  aria-pressed={selectedCourses.includes(course)}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-start transition-all ${selectedCourses.includes(course) ? btnActiveClass : btnInactiveClass
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm sm:text-base">{course}</span>
                    {selectedCourses.includes(course) && <CheckCircle2 className="w-5 h-5 text-red-600 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
            <div className={`flex ${lang === 'ar' ? 'justify-start' : 'justify-end'} pt-4`}>
              <button
                onClick={() => setStep(2)}
                disabled={selectedCourses.length === 0}
                className="inline-flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {t('gen_btn_next')} <ArrowNext className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 2: Interests ─── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
            className={`rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 ${stepContainerClass}`}
          >
            <div>
              <h3 className={`text-lg sm:text-xl font-bold mb-2 ${headingClass}`}>{t('gen_step2_title')}</h3>
              <p className={`text-sm sm:text-base ${subClass}`}>{t('gen_step2_desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {TOPICS.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  aria-pressed={selectedTopics.includes(topic.id)}
                  className={`p-3 rounded-xl border text-sm font-medium text-start transition-all ${selectedTopics.includes(topic.id) ? btnActiveClass : btnInactiveClass
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{lang === 'ar' ? topic.ar : topic.en}</span>
                    {selectedTopics.includes(topic.id) && <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0 ml-2" />}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-0 pt-4">
              <button onClick={() => setStep(1)} className={`w-full sm:w-auto px-6 py-3 rounded-xl font-medium transition-colors ${backBtnClass}`}>
                {t('gen_btn_back')}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedTopics.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {t('gen_btn_next')} <ArrowNext className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 3: Skills ─── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
            className={`rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 ${stepContainerClass}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className={`text-lg sm:text-xl font-bold mb-2 ${headingClass}`}>{t('gen_step3_title')}</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className={`text-sm sm:text-base ${subClass}`}>{t('gen_step3_desc')}</p>
                  {selectedSkills.length > 0 && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {selectedSkills.length} {lang === 'ar' ? 'مهارة' : 'selected'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                <input ref={cvInputRef} type="file" accept=".pdf" onChange={handleCVUpload} className="hidden" id="cv-upload" />
                <button
                  onClick={() => cvInputRef.current?.click()}
                  disabled={cvParsing}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${isDark ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800 hover:bg-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                >
                  {cvParsing ? (<><Loader2 className="w-4 h-4 animate-spin" /> {t('cv_parsing')}</>) : (<><Upload className="w-4 h-4" /> {t('cv_upload')}</>)}
                </button>
                {cvResult && (<span className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{cvResult}</span>)}
              </div>
            </div>

            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {SKILL_CATEGORIES.map(category => (
                <div key={category.id} className="space-y-3">
                  <h4 className={`text-sm font-bold border-b pb-2 uppercase tracking-wide ${isDark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'}`}>
                    {lang === 'ar' ? category.ar : category.en}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {category.skills.map(skill => {
                      const isSelected = selectedSkills.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          onClick={() => toggleSkill(skill.id)}
                          aria-pressed={isSelected}
                          className={`p-2.5 rounded-lg border text-xs sm:text-sm font-medium text-start transition-all ${isSelected ? btnActiveClass : btnInactiveClass}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate pr-1">{lang === 'ar' ? skill.ar : skill.en}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className={`flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-0 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <button onClick={() => setStep(2)} className={`w-full sm:w-auto px-6 py-3 rounded-xl font-medium transition-colors ${backBtnClass}`}>
                {t('gen_btn_back')}
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedSkills.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold hover:from-red-700 hover:to-rose-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> {t('gen_btn_generate')}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 4: Results ─── */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`border rounded-2xl p-6 sm:p-8 animate-pulse ${cardClass} shadow-sm`}>
                    <div className={`h-6 w-2/3 rounded-lg mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className={`h-4 w-full rounded-lg mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className={`h-4 w-5/6 rounded-lg mb-6 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className="flex gap-2 mb-6">
                      {[1, 2, 3].map(j => (
                        <div key={j} className={`h-6 w-20 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <div className={`h-11 w-40 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  </div>
                ))}
                <p className={`text-center text-sm font-medium animate-pulse ${subClass}`}>{t('gen_loading')}</p>
              </div>
            ) : error ? (
              <div className={`flex flex-col items-center justify-center py-16 sm:py-20 space-y-4 text-center rounded-2xl ${stepContainerClass}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-sm ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-100'}`}>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className={`text-xl font-bold ${headingClass}`}>{t('gen_error_title')}</h3>
                <p className={`max-w-md text-sm px-4 ${subClass}`}>{error}</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={handleGenerate}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" /> {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                  <button
                    onClick={() => { setSearchParams({ step: '1' }); setError(null); setIdeas([]); }}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${backBtnClass}`}
                  >
                    <ArrowLeft className="w-4 h-4" /> {t('gen_btn_start_over')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                  <h3 className={`text-xl sm:text-2xl font-bold ${headingClass}`}>{t('gen_results_title')}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleOptimize}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${isDark ? 'bg-amber-900/20 text-amber-300 border border-amber-800 hover:bg-amber-900/40' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}
                    >
                      <Zap className="w-4 h-4" /> {t('opt_btn')}
                    </button>
                    <button
                      onClick={() => { setSearchParams({ step: '1' }); setIdeas([]); setOptimizationResult(null); setInferenceData(null); }}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      {t('gen_btn_start_over')}
                    </button>
                  </div>
                </div>

                {/* AI Reasoning Panel */}
                {inferenceData && inferenceData.matchedRuleCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-2xl p-5 shadow-sm ${isDark ? 'bg-purple-900/10 border-purple-800' : 'bg-purple-50 border-purple-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      <h4 className={`text-sm font-bold ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                        {lang === 'ar' ? 'تحليل محرك المعرفة (KBS)' : 'AI Reasoning (Knowledge Based Systems)'}
                      </h4>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                        {inferenceData.matchedRuleCount} {lang === 'ar' ? 'قاعدة' : 'rules matched'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {inferenceData.recommendedDomains.map(d => (
                        <span key={d} className={`px-3 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-purple-900/30 text-purple-300 border border-purple-700' : 'bg-white text-purple-700 border border-purple-200'}`}>
                          🎯 {d}
                        </span>
                      ))}
                    </div>
                    {inferenceData.suggestedTechnologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {inferenceData.suggestedTechnologies.slice(0, 8).map(tech => (
                          <span key={tech} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Optimization Panel */}
                {optimizationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-2xl p-6 shadow-sm ${isDark ? 'bg-amber-900/10 border-amber-800' : 'bg-amber-50 border-amber-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <h4 className={`text-lg font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>{t('opt_result_title')}</h4>
                    </div>
                    <p className={`text-sm font-medium mb-3 ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                      {t('opt_result_desc')
                        .replace('{count}', optimizationResult.selectedProjects.length.toString())
                        .replace('{coverage}', optimizationResult.coveragePercentage.toString())}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {optimizationResult.coveredCourses.map(c => (
                        <span key={c} className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${isDark ? 'bg-amber-900/30 text-amber-300 border-amber-700' : 'bg-white text-amber-700 border-amber-200'}`}>
                          ✓ {c}
                        </span>
                      ))}
                      {optimizationResult.uncoveredCourses.map(c => (
                        <span key={c} className={`px-3 py-1 rounded-full text-xs font-medium line-through border ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── Idea Cards ─── */}
                <div className="grid gap-6">
                  {ideas.map((idea, idx) => {
                    const isOptimal = optimizationResult?.selectedProjects.some(p => p.id === idea.id);
                    const isFav = isFavorite(idea.id);
                    const courseCoverage = idea.courses.length;
                    const totalCourses = selectedCourses.length || 7;
                    const accent = cardAccents[idx % cardAccents.length];

                    return (
                      <motion.div
                        key={idea.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.12 }}
                        className={`relative overflow-hidden border rounded-2xl sm:rounded-3xl transition-all group shadow-sm hover:shadow-xl ${isOptimal
                            ? isDark ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-amber-300 ring-2 ring-amber-500/20'
                            : optimizationResult
                              ? isDark ? 'border-slate-700 opacity-60' : 'border-slate-200 opacity-60'
                              : `${accent.border} hover:shadow-lg`
                          } ${isDark ? 'bg-slate-800/80' : 'bg-white'}`}
                      >
                        {/* Top gradient accent bar */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${accent.gradient}`} />

                        <div className="p-5 sm:p-7">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? accent.dark : accent.light}`}>
                                <BookOpen className={`w-5 h-5 bg-gradient-to-r ${accent.gradient} bg-clip-text`} style={{ color: idx === 0 ? '#ef4444' : idx === 1 ? '#3b82f6' : '#10b981' }} />
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-lg sm:text-xl font-bold leading-tight ${headingClass}`}>{idea.title}</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Coverage badge */}
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${isDark ? 'bg-blue-900/30 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                {courseCoverage}/{totalCourses}
                              </span>
                              {isOptimal && (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-amber-900/30 text-amber-300 border border-amber-700' : 'bg-amber-100 border border-amber-200 text-amber-800'}`}>
                                  <Zap className="w-3 h-3" />
                                </span>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(idea); setFavRefresh(n => n + 1); }}
                                className={`p-1.5 rounded-full transition-colors ${isFav ? 'text-red-500' : isDark ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}
                              >
                                <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Description */}
                          <p className={`mb-5 text-sm sm:text-base leading-relaxed ${subClass}`}>{idea.description}</p>

                          {/* Course tags */}
                          <div className="flex flex-wrap gap-2 mb-5">
                            {idea.courses.map(c => (
                              <span key={c} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDark ? 'bg-slate-700/70 text-slate-300 border-slate-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                {c}
                              </span>
                            ))}
                          </div>

                          {/* Action button */}
                          <button
                            onClick={() => handleSelectIdea(idea)}
                            className={`inline-flex items-center justify-center sm:justify-start gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all w-full sm:w-auto text-sm shadow-sm hover:shadow-md ${isDark
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500'
                                : 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500'
                              }`}
                          >
                            {t('gen_btn_plan')} <ArrowNext className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="text-center mt-8">
        <p className={`text-xs font-medium flex items-center justify-center gap-1.5 ${subClass}`}>
          <Sparkles className="w-3.5 h-3.5 text-red-600" />
          {t('disclaimer')}
        </p>
      </div>
    </div>
  );
}
