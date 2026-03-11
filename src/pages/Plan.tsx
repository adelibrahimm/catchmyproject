import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft, ArrowRight, Loader2, Sparkles, Printer,
  AlertTriangle, Copy, CheckCircle2, Share2, CalendarDays
} from 'lucide-react';
import { generatePlanStream, generateTimeline, ProjectIdea, TimelineDay } from '../lib/gemini';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { getProfile } from './Profile';
import { useToast } from '../components/Toast';

export default function Plan() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const idea = location.state?.idea as ProjectIdea;

  const [plan, setPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Gantt timeline state
  const [timeline, setTimeline] = useState<TimelineDay[] | null>(null);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Buffer chunks so we batch-update state instead of per-character re-renders
  const bufferRef = useRef('');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!idea) return;

    const generate = async () => {
      try {
        await generatePlanStream(idea, lang, (chunk) => {
          bufferRef.current += chunk;
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(() => {
              setPlan(bufferRef.current);
              rafRef.current = null;
            });
          }
        });
        // Final flush
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        setPlan(bufferRef.current);
      } catch (err) {
        console.error('Failed to generate plan:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsGenerating(false);
      }
    };

    generate();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [idea, lang]);

  if (!idea) return <Navigate to="/generate" replace />;

  const ArrowBack = lang === 'ar' ? ArrowRight : ArrowLeft;
  const profile = getProfile();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleShare = () => {
    const text = `${idea.title}\n\n${plan.slice(0, 400)}...`;
    if (navigator.share) {
      navigator.share({ title: idea.title, text }).catch(() => { });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      });
    }
  };

  /** Advanced PDF Export: Direct download via optimized off-screen renderer */
  const handleDownloadPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    // Yield to browser so React can render the "Preparing..." spinner
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      // Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      const contentElement = document.getElementById('pdf-export-content');
      if (!contentElement) throw new Error('Export element not found');

      // Inject HTML into the iframe, including Tailwind typography styles
      iframeDoc.write(`
        <!DOCTYPE html>
        <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <title>${idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_plan</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              color: #0f172a; 
              padding: 40px; 
              background: #ffffff;
            }
            .prose { max-w: none; line-height: 1.6; }
            .prose h1, .prose h2, .prose h3 { color: #1e293b; font-weight: bold; margin-top: 2em; margin-bottom: 0.5em; }
            .prose p { margin-bottom: 1em; color: #334155; }
            .prose ul { margin-bottom: 1em; padding-left: 1.5em; }
            .prose li { margin-bottom: 0.25em; }
            .prose pre { background: #f8fafc; padding: 1em; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; }
            .prose code { color: #dc2626; background: #fee2e2; padding: 0.1em 0.3em; border-radius: 4px; font-family: monospace; }
            .prose strong { color: #0f172a; font-weight: 600; }
            #pdf-export-content { display: block !important; padding: 40px !important; }
            @page { margin: 15mm; }
          </style>
        </head>
        <body>
          ${contentElement.outerHTML}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
        </html>
      `);
      iframeDoc.close();

      // We wait a short moment for the iframe to finish printing (the user closing or saving the dialog)
      await new Promise(resolve => {
        const cleanup = () => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve(true);
        };
        // 2 seconds is generally enough time for the browser to spool the print job
        setTimeout(cleanup, 2000);
      });

    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast(
        lang === 'ar' ? 'فشل إنشاء ملف PDF. يرجى المحاولة مرة أخرى.' : 'Failed to generate PDF. Please try again.',
        'error'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateTimeline = async () => {
    if (isGeneratingTimeline || !plan) return;
    setIsGeneratingTimeline(true);
    setTimeline(null);
    try {
      const days = await generateTimeline(idea, plan);
      setTimeline(days);
      setTimeout(() => timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate timeline', 'error');
    } finally {
      setIsGeneratingTimeline(false);
    }
  };

  const TASK_COLORS: Record<string, string> = {
    research: 'bg-purple-500',
    design: 'bg-blue-500',
    implement: 'bg-red-500',
    test: 'bg-amber-500',
    deploy: 'bg-emerald-500',
  };
  const TASK_LABELS: Record<string, string> = {
    research: 'Research',
    design: 'Design',
    implement: 'Implement',
    test: 'Test',
    deploy: 'Deploy',
  };

  const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const subClass = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <>
      {/* Print-only header injected via a style tag — keeps the PDF clean */}
      <style>{`
        @media print {
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          #plan-content pre { background: #f8fafc !important; color: #1e293b !important; border: 1px solid #e2e8f0 !important; }
          #plan-content code { background: #f1f5f9 !important; color: #dc2626 !important; }
        }
        @media screen { .print-only { display: none !important; } }
      `}</style>

      <div id="print-root" className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4">

        {/* Print cover — visible only when printing */}
        <div className="print-only mb-8 text-center border-b pb-6">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#dc2626', marginBottom: 12 }}>
            <span style={{ color: 'white', fontSize: 24, fontWeight: 900 }}>C</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: '8px 0 4px' }}>Catch My Project</h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Faculty of Computer Science &amp; Engineering — New Mansoura University</p>
          <hr style={{ margin: '16px 0', border: 'none', borderTop: '2px solid #dc2626' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{idea.title}</h2>
          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{idea.description}</p>
          {profile?.name && <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 12 }}>{profile.name}</p>}
          {profile?.studentId && <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>ID: {profile.studentId}</p>}
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Spring Semester 2026</p>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back to project ideas"
          className={`no-print inline-flex items-center gap-2 mb-6 sm:mb-8 transition-colors font-medium ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <ArrowBack className="w-4 h-4" /> {t('plan_btn_back')}
        </button>

        {/* Idea Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border shadow-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 mb-6 sm:mb-8 ${cardClass}`}
        >
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${isDark ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            <Sparkles className="w-3 h-3" /> {t('plan_target_project')}
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-3 ${headingClass}`}>{idea.title}</h1>
          <p className={`text-base sm:text-lg leading-relaxed ${subClass}`}>{idea.description}</p>

          {idea.courses && idea.courses.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200/50">
              {idea.courses.map((c) => (
                <span
                  key={c}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Plan Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`border shadow-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 min-h-96 ${cardClass}`}
        >
          {/* Plan Header */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b pb-4 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <h2 className={`text-xl font-bold ${headingClass}`}>{t('plan_title')}</h2>

            <div className="no-print flex items-center gap-2 flex-wrap">
              {isGenerating ? (
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-semibold ${isDark ? 'bg-red-900/20 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('plan_generating')}</span>
                  <span className="inline-flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleCopyToClipboard}
                    aria-label={copied ? 'Plan copied to clipboard' : 'Copy plan to clipboard'}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${copied
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : isDark ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                  >
                    {copied ? <><CheckCircle2 className="w-4 h-4" /> {lang === 'ar' ? 'تم النسخ' : 'Copied'}</> : <><Copy className="w-4 h-4" /> {lang === 'ar' ? 'نسخ' : 'Copy'}</>}
                  </button>

                  <button
                    onClick={handleShare}
                    aria-label={shared ? 'Plan shared' : 'Share plan'}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${shared
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : isDark ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                  >
                    {shared ? <><CheckCircle2 className="w-4 h-4" /> {lang === 'ar' ? 'تم' : 'Shared'}</> : <><Share2 className="w-4 h-4" /> {lang === 'ar' ? 'مشاركة' : 'Share'}</>}
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={isExporting}
                    aria-label={isExporting ? 'Generating PDF, please wait' : 'Download implementation plan as PDF'}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${isExporting
                      ? isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isDark ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300'
                      }`}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {lang === 'ar' ? 'جاري التحضير...' : 'Preparing...'}
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 rotate-90" />
                        {lang === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Plan body */}
          <div id="plan-content">
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-100'}`}>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className={`text-xl font-bold ${headingClass}`}>{t('gen_error_title')}</h3>
                <p className={`max-w-md ${subClass}`}>{t('gen_error_desc')}</p>
                <p className={`text-sm font-medium px-4 py-2 rounded-lg ${isDark ? 'text-red-400 bg-red-900/20 border border-red-800' : 'text-red-600 bg-red-50 border border-red-100'}`}>{error}</p>
              </div>
            ) : isGenerating && plan.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-100'}`}>
                  <Sparkles className="w-8 h-8 text-red-500 animate-pulse" />
                </div>
                <p className={`text-sm font-medium ${subClass}`}>
                  {lang === 'ar' ? 'يفكر الذكاء الاصطناعي في خطتك...' : 'AI is crafting your implementation plan...'}
                </p>
              </div>
            ) : (
              <div className={`prose max-w-none ${isDark
                ? [
                  'prose-invert',
                  'prose-headings:text-white',
                  'prose-p:text-slate-300',
                  'prose-li:text-slate-300',
                  'prose-strong:text-white',
                  'prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700',
                  'prose-code:text-red-400 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
                  'prose-a:text-rose-400',
                  'prose-blockquote:border-l-red-600 prose-blockquote:text-slate-400',
                  'prose-hr:border-slate-700',
                ].join(' ')
                : [
                  'prose-slate',
                  'prose-headings:text-slate-900',
                  'prose-p:text-slate-700',
                  'prose-li:text-slate-700',
                  'prose-strong:text-slate-900',
                  'prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200',
                  'prose-code:text-red-600 prose-code:bg-red-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
                  'prose-a:text-red-600',
                  'prose-blockquote:border-l-red-400 prose-blockquote:text-slate-500',
                ].join(' ')
                }`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {plan.replace(/^```(markdown)?\s*/i, '').replace(/\s*```$/i, '')}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Generate Timeline button — shown after plan is ready */}
          {!isGenerating && plan && (
            <div className={`no-print mt-6 pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <span className={`text-xs font-medium ${subClass}`}>
                {lang === 'ar' ? '✨ احصل على جدول زمني مرئي لمدة أسبوعين' : '✨ Get a visual day-by-day 2-week sprint'}
              </span>
              <button
                onClick={handleGenerateTimeline}
                disabled={isGeneratingTimeline}
                aria-label="Generate 2-week AI project timeline"
                className={`no-print inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${isGeneratingTimeline
                  ? isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700'
                  }`}
              >
                {isGeneratingTimeline
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {lang === 'ar' ? 'جاري الإنشاء...' : 'Generating...'}</>
                  : <><CalendarDays className="w-4 h-4" /> {lang === 'ar' ? 'إنشاء جدول زمني' : 'Generate 2-Week Timeline'}</>
                }
              </button>
            </div>
          )}
        </motion.div>

        {/* ─── Gantt Chart Timeline ─── */}
        {timeline && (
          <motion.div
            ref={timelineRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`no-print border rounded-2xl sm:rounded-3xl p-6 sm:p-8 ${cardClass}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                <CalendarDays className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${headingClass}`}>{lang === 'ar' ? 'الجدول الزمني للمشروع (2 أسبوع)' : '2-Week Sprint Timeline'}</h2>
                <p className={`text-xs ${subClass}`}>{lang === 'ar' ? 'مُحسَّن للعمل مع مساعدات الذكاء الاصطناعي' : 'Optimised for AI-assisted implementation in 2026'}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-6">
              {Object.entries(TASK_LABELS).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-full ${TASK_COLORS[type]}`} />
                  <span className={`text-xs font-medium ${subClass}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Week rows */}
            {([1, 2] as const).map(week => (
              <div key={week} className="mb-6 last:mb-0">
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'ar' ? `الأسبوع ${week}` : `Week ${week}`}
                </h3>
                <div className="space-y-2.5">
                  {timeline.filter(d => d.week === week).map((day, di) => (
                    <motion.div
                      key={day.day}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: di * 0.05 }}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}
                    >
                      {/* Day badge */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                        D{day.day}
                      </div>

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-sm font-semibold ${headingClass} truncate`}>{day.task}</span>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${TASK_COLORS[day.type] ?? 'bg-slate-500'}`}>
                            {TASK_LABELS[day.type] ?? day.type}
                          </span>
                          {day.course && (
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-white text-slate-600 border-slate-200'
                              }`}>{day.course}</span>
                          )}
                        </div>
                        <p className={`text-xs ${subClass} truncate`}>✓ {day.deliverable}</p>
                        {/* Animated progress bar */}
                        <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ delay: di * 0.07 + 0.3, duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${TASK_COLORS[day.type] ?? 'bg-slate-500'}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ─── HIDDEN OFF-SCREEN PDF RENDERER ─── */}
      <div id="pdf-export-content" style={{ display: 'none', width: '800px', backgroundColor: '#ffffff', color: '#0f172a', padding: '40px' }}>
        {/* Cover Page */}
        <div style={{ textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid #dc2626' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>Catch My Project</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 32px 0' }}>Faculty of Computer Science &amp; Engineering — New Mansoura University</p>

          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px 0' }}>{idea.title}</h2>
          <p style={{ fontSize: '16px', color: '#475569', margin: '0 0 32px 0', lineHeight: '1.6' }}>{idea.description}</p>

          {profile?.name && <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', margin: '16px 0 4px 0' }}>{profile.name}</p>}
          {profile?.studentId && <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>ID: {profile.studentId}</p>}
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '12px 0 0 0' }}>Spring Semester 2026</p>
        </div>

        {/* Body Content */}
        <div className="prose prose-slate max-w-none" style={{ backgroundColor: '#ffffff', width: '100%' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {plan}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
}
