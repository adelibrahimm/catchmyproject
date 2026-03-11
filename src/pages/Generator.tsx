import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Upload, Zap, Heart, Brain, BookOpen, Layers, RefreshCw, X, ChevronDown, ChevronUp, Users, Lightbulb } from 'lucide-react';
import { generateIdeasStream, ProjectIdea } from '../lib/gemini';
import NeuralAnimation from '../components/NeuralAnimation';
import TypewriterText from '../components/TypewriterText';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { TOPICS } from '../lib/topics';
import { SKILLS, SKILL_CATEGORIES } from '../lib/skills';
import { runInference, formatInferenceForPrompt, InferenceResult, FiredRule } from '../lib/knowledgeBase/ruleEngine';
import { parseCV } from '../lib/ml/cvParser';
import { getTrainingResult, classifySkill, DOMAINS, TrainingResult } from '../lib/ml/skillClassifier';
import TrainingLossChart from '../components/TrainingLossChart';
import { optimizeProjectSelection, OptimizationResult, SimplexPivotStep } from '../lib/optimization/projectOptimizer';
import { saveToHistory, toggleFavorite, isFavorite, HistoryEntry } from './History';
import { getProfile } from './Profile';
import { detectSimilarities, SimilarityWarning } from '../lib/similarity';
import PageMeta from '../components/PageMeta';

export default function Generator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang } = useLanguage();
  const { isDark } = useTheme();
  const cvInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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
  const [nnTraining, setNnTraining] = useState<TrainingResult | null>(null);
  const [similarityWarnings, setSimilarityWarnings] = useState<SimilarityWarning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<number>>(new Set());
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [, setFavRefresh] = useState(0);

  // Rate limiting: 30-second cooldown between generations
  const COOLDOWN = 30;
  const [cooldownSecs, setCooldownSecs] = useState<number>(() => {
    try {
      const last = parseInt(localStorage.getItem('cmp-last-gen') || '0', 10);
      const elapsed = Math.floor((Date.now() - last) / 1000);
      return Math.max(0, COOLDOWN - elapsed);
    } catch { return 0; }
  });
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    localStorage.setItem('cmp-last-gen', Date.now().toString());
    setCooldownSecs(COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldownSecs(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (cooldownSecs > 0) startCooldown();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const profile = getProfile();
    if (profile && profile.skills.length > 0) {
      setSelectedSkills(prev => [...new Set([...prev, ...profile.skills])]);
    }
  }, []);

  // ── Train NN when entering step 3 ────────────────────────────────────────
  useEffect(() => {
    if (step === 3 && !nnTraining) {
      requestAnimationFrame(() => setNnTraining(getTrainingResult()));
    }
  }, [step, nnTraining]);

  // ── Keyboard shortcuts: Enter = next step, Escape = back ─────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.key === 'Enter') {
        if (step === 1 && selectedCourses.length > 0) setStep(2);
        else if (step === 2 && selectedTopics.length > 0) setStep(3);
        // step 3 → generate handled by button (requires async)
      }
      if (e.key === 'Escape') {
        if (step === 2) setStep(1);
        else if (step === 3) setStep(2);
        else if (step === 4) setSearchParams({ step: '3' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, selectedCourses, selectedTopics, setSearchParams]);

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
    setIdeas([]);  // clear previous ideas before streaming new ones
    setOptimizationResult(null);
    setInferenceData(null);
    setSimilarityWarnings([]);
    setDismissedWarnings(new Set());
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

      // Collect all streamed ideas so we can save them at the end
      const streamed: ProjectIdea[] = [];

      await generateIdeasStream(
        selectedCourses,
        interestsStr,
        strengthsStr,
        lang,
        kbContext,
        (idea, index) => {
          streamed.push(idea);
          setIdeas(prev => [...prev, idea]);
          // Scroll into view when first idea arrives
          if (index === 0) {
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
          }
        }
      );

      if (streamed.length > 0) {
        saveToHistory(selectedCourses, streamed);
        startCooldown();

        // Similarity detection against past history
        try {
          const hist: HistoryEntry[] = JSON.parse(localStorage.getItem('cmp-history') || '[]');
          const warnings = detectSimilarities(streamed, hist);
          setSimilarityWarnings(warnings);
        } catch { /* ignore */ }
      }
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

  const toggleReasoning = (ideaId: string) => {
    setExpandedReasoning(prev => {
      const next = new Set(prev);
      if (next.has(ideaId)) next.delete(ideaId); else next.add(ideaId);
      return next;
    });
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


  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4 relative">

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className={`text-2xl sm:text-3xl font-bold ${headingClass}`}>{t('gen_title')}</h2>

        {/* Step indicator with labels */}
        <div className="flex items-start gap-1 sm:gap-2">
          {([
            { n: 1, label: lang === 'ar' ? 'المقررات' : 'Courses' },
            { n: 2, label: lang === 'ar' ? 'الاهتمامات' : 'Interests' },
            { n: 3, label: lang === 'ar' ? 'المهارات' : 'Skills' },
            { n: 4, label: lang === 'ar' ? 'الأفكار' : 'Ideas' },
          ] as const).map(({ n, label }) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div
                className={`h-1.5 sm:h-2 w-8 sm:w-14 rounded-full transition-all duration-300 ${step > n ? 'bg-red-600' : step === n ? 'bg-red-500' : isDark ? 'bg-slate-700' : 'bg-slate-200'
                  }`}
              />
              <span
                className={`hidden sm:block text-[10px] font-semibold transition-colors ${step >= n ? (isDark ? 'text-red-400' : 'text-red-600') : isDark ? 'text-slate-600' : 'text-slate-400'
                  }`}
              >
                {label}
              </span>
            </div>
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


            {/* ─── Neural Network Training Panel ─── */}
            {nnTraining && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800/80 border-emerald-500/30 ring-1 ring-emerald-500/10' : 'bg-white border-emerald-200 ring-1 ring-emerald-500/10'
                  }`}
              >
                {/* Header */}
                <div className={`px-5 py-3 border-b flex items-center gap-3 ${isDark ? 'border-slate-700 bg-emerald-900/20' : 'border-emerald-100 bg-emerald-50/50'
                  }`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
                    }`}>
                    <Brain className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {lang === 'ar' ? 'الشبكة العصبية — مصنّف المجال (AIE231)' : 'Neural Network — Skill Domain Classifier (AIE231)'}
                    </h4>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {lang === 'ar'
                        ? `بنية: مدخل(${nnTraining.weights ? 'n' : '?'}) → Dense(16, ReLU) → Dense(5, Softmax)`
                        : `Architecture: Input(n_skills) → Dense(16, ReLU) → Dense(5, Softmax) · Trained with GD + Backprop`}
                    </p>
                  </div>
                  <div className={`ml-auto px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${isDark ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {lang === 'ar' ? 'مدرَّبة' : 'Trained'}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Loss chart */}
                  <TrainingLossChart result={nnTraining} isDark={isDark} />

                  {/* Skill domain predictions (for selected skills) */}
                  {selectedSkills.length > 0 && (
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'
                        }`}>
                        {lang === 'ar' ? 'تصنيف مهاراتك المختارة' : 'Your Selected Skills — NN Classification'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSkills.slice(0, 12).map(skillId => {
                          const { domain, confidence } = classifySkill(skillId)
                            ? { domain: DOMAINS[classifySkill(skillId).indexOf(Math.max(...classifySkill(skillId)))], confidence: Math.max(...classifySkill(skillId)) }
                            : { domain: DOMAINS[0], confidence: 0 };
                          const skill = SKILLS.find(s => s.id === skillId);
                          return (
                            <span key={skillId} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border ${domain.bg}`}>
                              <span className={domain.color}>{lang === 'ar' ? skill?.ar : skill?.en}</span>
                              <span className="opacity-50">→</span>
                              <span className={domain.color}>{domain.en}</span>
                              <span className="opacity-40 font-mono">{(confidence * 100).toFixed(0)}%</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <div className={`flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-0 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <button
                onClick={() => setStep(2)}
                aria-label="Go back to interests step"
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-medium transition-colors ${backBtnClass}`}
              >
                {t('gen_btn_back')}
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedSkills.length === 0 || cooldownSecs > 0}
                aria-label={cooldownSecs > 0 ? `Please wait ${cooldownSecs}s before generating again` : 'Generate project ideas'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold hover:from-red-700 hover:to-rose-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {cooldownSecs > 0 ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Retry in {cooldownSecs}s</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> {t('gen_btn_generate')}</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 4: Results ─── */}
        {step === 4 && (
          <motion.div
            key="step4"
            ref={resultsRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {isLoading && ideas.length === 0 ? (
              <div className={`border rounded-3xl p-8 ${stepContainerClass}`}>
                <NeuralAnimation isDark={isDark} />
              </div>
            ) : error && ideas.length === 0 ? (
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
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${isDark ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-800 hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                        }`}
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

                {/* Similarity Warnings */}
                {similarityWarnings.filter((_, i) => !dismissedWarnings.has(i)).length > 0 && (
                  <div className="space-y-2">
                    {similarityWarnings.map((w, i) => dismissedWarnings.has(i) ? null : (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-indigo-50/50 border-indigo-100 text-indigo-900'
                          }`}
                      >
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-indigo-100'
                          }`}>
                          <Layers className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-indigo-600'}`} />
                        </div>
                        <span className="flex-1 leading-relaxed">
                          {lang === 'ar'
                            ? `"${w.ideaTitle}" تتشابه مع "${w.matchTitle}"${w.isFromHistory ? ' من سجل سابق' : ''} بنسبة ${Math.round(w.score * 100)}%`
                            : `"${w.ideaTitle}" is ${Math.round(w.score * 100)}% similar to "${w.matchTitle}"${w.isFromHistory ? ' (from your history)' : ''}`}
                        </span>
                        <button
                          onClick={() => setDismissedWarnings(prev => new Set([...prev, i]))}
                          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity p-1"
                          aria-label="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}


                {/* ─── KBS Expert System Panel ─── */}
                {inferenceData && inferenceData.firedRules.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-2xl shadow-sm overflow-hidden ${isDark ? 'bg-slate-800/80 border-emerald-500/30 ring-1 ring-emerald-500/20' : 'bg-white border-emerald-200 ring-1 ring-emerald-500/10'}`}
                  >
                    {/* Header */}
                    <div className={`px-5 py-4 border-b flex items-center gap-3 ${isDark ? 'border-slate-700 bg-emerald-900/20' : 'border-emerald-100 bg-emerald-50/50'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                        <Brain className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {lang === 'ar' ? 'نظام خبير — اشتقاق المعرفة (KBS)' : 'Expert System — Knowledge-Based Inference'}
                        </h4>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {lang === 'ar'
                            ? `قاعدة معرفة: ${inferenceData.workingMemory.length} حقيقة · ${inferenceData.conflictSetSize} قاعدة في الصراع · ${inferenceData.firedRules.length} استنتاج`
                            : `Working Memory: ${inferenceData.workingMemory.length} fact(s) · Conflict Set: ${inferenceData.conflictSetSize} rule(s) · ${inferenceData.firedRules.length} fired`}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">

                      {/* Working Memory */}
                      <div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Working Memory (Fact Base)</div>
                        <div className="flex flex-wrap gap-1.5">
                          {inferenceData.workingMemory.map((fact, fi) => (
                            <span key={fi} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${fact.type === 'skill'
                              ? isDark ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200'
                              : isDark ? 'bg-amber-900/30 text-amber-300 border-amber-700' : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              <span className="opacity-60">{fact.type === 'skill' ? '🔧' : '🎯'}</span>
                              {fact.value} <span className="opacity-50">CF={fact.cf.toFixed(1)}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Fired Rules */}
                      <div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          Fired Rules — Specificity Ordering ({inferenceData.firedRules.length})
                        </div>
                        <div className="space-y-2">
                          {(inferenceData.firedRules as FiredRule[]).slice(0, 6).map((fr, ri) => {
                            const isExpanded = expandedReasoning.has(fr.rule.id);
                            return (
                              <motion.div
                                key={fr.rule.id}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: ri * 0.06 }}
                                className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
                                  }`}
                              >
                                <button
                                  onClick={() => setExpandedReasoning(prev => {
                                    const next = new Set(prev);
                                    if (next.has(fr.rule.id)) next.delete(fr.rule.id); else next.add(fr.rule.id);
                                    return next;
                                  })}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                                >
                                  {/* Firing order badge */}
                                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${isDark ? 'bg-emerald-600' : 'bg-emerald-500'}`}>{fr.firingOrder}</span>

                                  {/* Rule info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>{fr.rule.id}: {fr.rule.name}</span>
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                        {fr.rule.antecedents.length} antecedent{fr.rule.antecedents.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    {/* CF bar */}
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${fr.outputCf * 100}%` }}
                                          transition={{ delay: ri * 0.07 + 0.2, duration: 0.5, ease: 'easeOut' }}
                                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                        />
                                      </div>
                                      <span className={`text-[10px] font-bold flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        CF={fr.outputCf.toFixed(3)}
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`flex-shrink-0 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {isExpanded ? '▲' : '▼'}
                                  </span>
                                </button>

                                {/* Expanded explanation */}
                                {isExpanded && (
                                  <div className={`px-3 pb-3 border-t text-xs space-y-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <div className="pt-2">
                                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>IF: </span>
                                      {fr.matchedConditions.map((mc, ci) => (
                                        <span key={ci}>
                                          <span className={isDark ? 'text-blue-300' : 'text-blue-600'}>{mc.condition.type}</span>
                                          {' = “'}<span className={isDark ? 'text-white' : 'text-slate-900'}>{mc.condition.value}</span>{'” '}(CF={mc.fact.cf.toFixed(1)})
                                          {ci < fr.matchedConditions.length - 1 && <span className={`mx-1 font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>AND</span>}
                                        </span>
                                      ))}
                                    </div>
                                    <div>
                                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>THEN: </span>
                                      <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>{fr.rule.consequent.recommendedDomain}</span>
                                    </div>
                                    <div className={`font-mono text-[10px] p-2 rounded-lg ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                      CF = {fr.rule.cf.toFixed(2)} × min({fr.matchedConditions.map(mc => mc.fact.cf.toFixed(1)).join(', ')}) = {fr.outputCf.toFixed(3)}
                                    </div>
                                    <div className={`flex flex-wrap gap-1`}>
                                      {fr.rule.consequent.suggestedTech.map(tech => (
                                        <span key={tech} className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{tech}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Inference Trace */}
                      <details className="group">
                        <summary className={`cursor-pointer text-xs font-semibold flex items-center gap-2 py-1 select-none ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                          {lang === 'ar' ? 'عرض تتبع الاستنتاج الكامل' : 'Show Full Inference Trace'}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            {inferenceData.explanationTrace.length} step(s)
                          </span>
                        </summary>
                        <div className={`mt-3 rounded-xl border p-3 font-mono text-[10px] leading-relaxed space-y-1.5 max-h-48 overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {inferenceData.explanationTrace.map((step, si) => (
                            <div key={si}><span className={`${isDark ? 'text-emerald-500' : 'text-emerald-600'} mr-2`}>[{si + 1}]</span>{step}</div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </motion.div>
                )}

                {/* ─── Simplex LP Optimization Panel ─── */}
                {optimizationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-2xl shadow-sm overflow-hidden ${isDark ? 'bg-slate-800/80 border-violet-500/30 ring-1 ring-violet-500/20' : 'bg-white border-violet-200 ring-1 ring-violet-500/10'}`}
                  >
                    {/* Panel header */}
                    <div className={`px-5 py-4 border-b flex items-center gap-3 ${isDark ? 'border-slate-700 bg-violet-900/20' : 'border-violet-100 bg-violet-50/50'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                        <Zap className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                      </div>
                      <div>
                        <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {lang === 'ar' ? 'تحسين اختيار المشروع (LP Simplex)' : 'Project Selection — Linear Programming (Simplex Method)'}
                        </h4>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {lang === 'ar' ? 'خوارزمية دانتزيغ، 1947 — مقرر تقنيات التحسين' : 'Dantzig\'s Algorithm, 1947 · Optimization Techniques Course'}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-5">

                      {/* LP Formulation block */}
                      <div className={`rounded-xl border p-4 font-mono text-xs leading-relaxed ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>LP Formulation</div>
                        <div><span className={`font-bold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>Maximize: </span>
                          Z = {ideas.map((idea, i) => `${idea.courses.filter(c => selectedCourses.some(sc => sc.toLowerCase() === c.toLowerCase())).length}·x${['₁', '₂', '₃'][i] ?? `(${i + 1})`}`).join(' + ')}
                        </div>
                        <div className={`mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Subject to:</div>
                        {ideas.map((_, i) => (
                          <div key={i} className="ml-4">x{['₁', '₂', '₃'][i] ?? `(${i + 1})`} ≤ 1</div>
                        ))}
                        <div className="ml-4">{ideas.map((_, i) => `x${['₁', '₂', '₃'][i] ?? `(${i + 1})`}`).join(' + ')} ≤ {2}</div>
                        <div className="ml-4">{ideas.map((_, i) => `x${['₁', '₂', '₃'][i] ?? `(${i + 1})`}`).join(', ')} ≥ 0</div>
                        <div className={`mt-2 pt-2 border-t text-[10px] ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                          Z* = {optimizationResult.lpObjectiveValue?.toFixed(2) ?? '–'} &nbsp;·&nbsp;
                          LP solution: [{optimizationResult.lpSolution?.map(v => v.toFixed(2)).join(', ') ?? '–'}]
                        </div>
                      </div>

                      {/* Simplex Pivot Table */}
                      {optimizationResult.simplexPivots && optimizationResult.simplexPivots.length > 0 && (
                        <div>
                          <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                            Simplex Iterations ({optimizationResult.simplexPivots.length} pivot{optimizationResult.simplexPivots.length !== 1 ? 's' : ''})
                          </div>
                          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                            <table className="w-full text-xs min-w-[520px]">
                              <thead>
                                <tr className={`text-left ${isDark ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                  {['Iter', 'Entering', 'Leaving', 'Pivot', 'Z before'].map(h => (
                                    <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(optimizationResult.simplexPivots as SimplexPivotStep[]).map((step, si) => (
                                  <motion.tr
                                    key={si}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: si * 0.08 }}
                                    className={`border-t font-mono ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-100 text-slate-700'}`}
                                  >
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white ${isDark ? 'bg-violet-600' : 'bg-violet-500'}`}>{step.iteration}</span>
                                    </td>
                                    <td className={`px-3 py-2 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{step.enteringVar} ↑</td>
                                    <td className={`px-3 py-2 font-bold ${isDark ? 'text-red-400' : 'text-red-500'}`}>{step.leavingVar} ↓</td>
                                    <td className="px-3 py-2">{step.pivotElement.toFixed(4)}</td>
                                    <td className="px-3 py-2">{step.objectiveValue.toFixed(4)}</td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className={`mt-2 text-[10px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            ↑ Entering = most negative reduced cost ĉⱼ (Dantzig\'s rule) &nbsp;·&nbsp; ↓ Leaving = min-ratio test
                          </p>
                        </div>
                      )}

                      {/* Coverage result */}
                      <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {lang === 'ar' ? 'تغطية المقررات' : 'Course Coverage'}
                          </span>
                          <span className={`text-sm font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                            {optimizationResult.coveragePercentage}%
                          </span>
                        </div>
                        <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${optimizationResult.coveragePercentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                          {optimizationResult.coveredCourses.map(c => (
                            <span key={c} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm ${isDark ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> {c}
                            </span>
                          ))}
                          {optimizationResult.uncoveredCourses.map(c => (
                            <span key={c} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{c}</span>
                          ))}
                        </div>
                      </div>
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

                    return (
                      <motion.div
                        key={idea.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.12 }}
                        className={`relative overflow-hidden border rounded-2xl sm:rounded-3xl transition-all group shadow-sm hover:shadow-lg ${isOptimal
                          ? isDark ? 'border-indigo-500/50 ring-2 ring-indigo-500/20' : 'border-indigo-300 ring-2 ring-indigo-500/10'
                          : optimizationResult
                            ? isDark ? 'border-slate-700 opacity-60' : 'border-slate-200 opacity-60'
                            : isDark ? 'border-slate-700 hover:border-red-800' : 'border-slate-200 hover:border-red-200'
                          } ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                      >
                        {/* Thin top accent line */}
                        <div className={`h-0.5 w-full ${isOptimal ? 'bg-indigo-500' : 'bg-red-600'
                          }`} />

                        <div className="p-5 sm:p-7">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOptimal
                                ? isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'
                                : isDark ? 'bg-slate-700' : 'bg-red-50'
                                }`}>
                                <BookOpen className={`w-5 h-5 ${isOptimal
                                  ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                                  : isDark ? 'text-red-400' : 'text-red-600'
                                  }`} />
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-lg sm:text-xl font-bold leading-tight ${headingClass}`}>
                                  <TypewriterText text={idea.title} speed={20} />
                                </h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Coverage badge */}
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${isDark ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                {courseCoverage}/{totalCourses}
                              </span>
                              {isOptimal && (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                  }`}>
                                  <Zap className="w-3 h-3 text-indigo-500" />
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

                          {/* Why This Idea — collapsible */}
                          {idea.reasoning && (
                            <div className="mb-4">
                              <button
                                onClick={() => toggleReasoning(idea.id)}
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${expandedReasoning.has(idea.id)
                                  ? isDark ? 'bg-violet-900/30 border-violet-700 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'
                                  : isDark ? 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-violet-300 hover:border-violet-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-violet-700 hover:border-violet-200'
                                  }`}
                              >
                                <Lightbulb className="w-3.5 h-3.5" />
                                {lang === 'ar' ? 'لماذا هذه الفكرة؟' : 'Why this idea?'}
                                {expandedReasoning.has(idea.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              <AnimatePresence>
                                {expandedReasoning.has(idea.id) && (
                                  <motion.div
                                    key="reasoning"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.22 }}
                                    className="overflow-hidden"
                                  >
                                    <div className={`mt-2 rounded-xl border p-4 space-y-3 ${isDark ? 'bg-violet-900/10 border-violet-800' : 'bg-violet-50 border-violet-100'
                                      }`}>
                                      {idea.reasoning.skillMatches?.length > 0 && (
                                        <div>
                                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                                            {lang === 'ar' ? '🎯 مهاراتك المستخدمة' : '🎯 Your Skills Used'}
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {idea.reasoning.skillMatches.map(s => (
                                              <span key={s} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isDark ? 'bg-violet-900/40 text-violet-300 border-violet-700' : 'bg-white text-violet-700 border-violet-200'
                                                }`}>{s}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {idea.reasoning.innovationFactor && (
                                        <div>
                                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                                            {lang === 'ar' ? '✨ عامل الابتكار' : '✨ Innovation Factor'}
                                          </p>
                                          <p className={`text-xs leading-relaxed ${isDark ? 'text-violet-200' : 'text-violet-800'}`}>
                                            {idea.reasoning.innovationFactor}
                                          </p>
                                        </div>
                                      )}
                                      {idea.reasoning.problemSolved && (
                                        <div>
                                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                                            {lang === 'ar' ? '🔧 المشكلة التي تحلها' : '🔧 Problem Solved'}
                                          </p>
                                          <p className={`text-xs leading-relaxed ${isDark ? 'text-violet-200' : 'text-violet-800'}`}>
                                            {idea.reasoning.problemSolved}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

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

                {/* ERTH Matching Banner */}
                {ideas.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className={`mt-4 rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-100'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-red-900/30' : 'bg-red-100'
                      }`}>
                      <Users className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {lang === 'ar' ? 'هل أنت مستعد لبناء فريقك؟' : 'Ready to build your team?'}
                      </h4>
                      <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {lang === 'ar'
                          ? 'منصة ERTH Matching تجمع فريق يتكامل في مهاراته مع فكرة مشروعك تلقائيًا.'
                          : 'ERTH Matching assembles a team whose skills perfectly complement your project idea.'}
                      </p>
                    </div>
                    <a
                      href="https://matching.erth.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md bg-red-600 text-white hover:bg-red-700"
                    >
                      {lang === 'ar' ? 'ابحث عن فريق' : 'Find a Team'}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </motion.div>
                )}

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
