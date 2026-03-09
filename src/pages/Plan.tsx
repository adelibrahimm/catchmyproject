import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Download, AlertTriangle, Copy, CheckCircle2, Share2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { generatePlanStream, ProjectIdea } from '../lib/gemini';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { getProfile } from './Profile';

export default function Plan() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { isDark } = useTheme();
  const idea = location.state?.idea as ProjectIdea;

  const [plan, setPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!idea) return;

    const generate = async () => {
      try {
        let fullText = '';
        await generatePlanStream(idea, lang, (chunk) => {
          fullText += chunk;
          setPlan(fullText);
        });
      } catch (err) {
        console.error("Failed to generate plan:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [idea, lang]);

  if (!idea) {
    return <Navigate to="/generate" replace />;
  }

  const ArrowBack = lang === 'ar' ? ArrowRight : ArrowLeft;
  const profile = getProfile();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback for older browsers */ }
  };

  const handleShare = () => {
    const shareData = {
      title: idea.title,
      text: `${idea.title}\n\n${idea.description}\n\n${plan.slice(0, 500)}...`,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => { });
    } else {
      // Fallback: copy URL + plan summary to clipboard
      const url = window.location.href;
      navigator.clipboard.writeText(`${idea.title}\n${url}\n\n${plan.slice(0, 300)}...`).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      });
    }
  };

  const handleExportPDF = () => {
    const element = document.getElementById('plan-content');
    if (!element) return;

    // Create cover page
    const coverPage = document.createElement('div');
    coverPage.id = 'pdf-cover-page';
    coverPage.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;font-family:system-ui,sans-serif;padding:2rem;">
        <img src="/nmu-logo.png" style="width:120px;height:120px;margin-bottom:2rem;border-radius:50%;object-fit:contain;" />
        <h1 style="font-size:28px;font-weight:800;color:#1e293b;margin-bottom:12px;">Catch My Project</h1>
        <p style="font-size:13px;color:#64748b;margin-bottom:2rem;">Faculty of Computer Science & Engineering — New Mansoura University</p>
        <div style="width:60px;height:3px;background:#dc2626;border-radius:2px;margin:1.5rem 0;"></div>
        <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px;">${idea.title}</h2>
        <p style="font-size:14px;color:#475569;max-width:500px;line-height:1.6;">${idea.description}</p>
        <div style="margin-top:2rem;padding:1rem 2rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
          ${profile?.name ? `<p style="font-size:14px;color:#334155;font-weight:600;">${profile.name}</p>` : ''}
          ${profile?.studentId ? `<p style="font-size:12px;color:#64748b;font-family:monospace;">ID: ${profile.studentId}</p>` : ''}
          <p style="font-size:11px;color:#94a3b8;margin-top:4px;">Spring 2025-2026</p>
        </div>
        <div style="margin-top:2rem;">
          <p style="font-size:11px;color:#94a3b8;">Courses: ${idea.courses.join(' • ')}</p>
        </div>
        <div style="position:absolute;bottom:2rem;font-size:10px;color:#cbd5e1;">Executed by ERTH Team • info@erth.dev</div>
      </div>
    `;

    // Insert cover page as the first child of plan content
    element.insertBefore(coverPage, element.firstChild);

    const opt = {
      margin: 0.75,
      filename: `${idea.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()} _plan.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    element.classList.add('pdf-export-mode');

    html2pdf().set(opt).from(element).save().then(() => {
      element.classList.remove('pdf-export-mode');
      coverPage.remove();
    });
  };

  const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const subClass = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-2 sm:px-0">
      <button
        onClick={() => { navigate(-1); }}
        className={`inline - flex items - center gap - 2 mb - 6 sm: mb - 8 transition - colors font - medium px - 2 sm: px - 0 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'} `}
      >
        <ArrowBack className="w-4 h-4" /> {t('plan_btn_back')}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border shadow - sm rounded - 2xl sm: rounded - 3xl p - 6 sm: p - 8 mb - 6 sm: mb - 8 ${cardClass} `}
      >
        <div className={`inline - flex items - center gap - 2 px - 3 py - 1 rounded - full text - xs font - semibold mb - 4 ${isDark ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'} `}>
          <Sparkles className="w-3 h-3" /> {t('plan_target_project')}
        </div>
        <h1 className={`text - 2xl sm: text - 3xl font - bold mb - 3 ${headingClass} `}>{idea.title}</h1>
        <p className={`text - base sm: text - lg leading - relaxed ${subClass} `}>{idea.description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`border shadow - sm rounded - 2xl sm: rounded - 3xl p - 6 sm: p - 8 min - h - [400px] ${cardClass} `}
      >
        <div className={`flex flex - col sm: flex - row sm: items - center justify - between gap - 4 mb - 6 sm: mb - 8 border - b pb - 4 ${isDark ? 'border-slate-700' : 'border-slate-100'} `}>
          <h2 className={`text - xl font - bold ${headingClass} `}>{t('plan_title')}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {isGenerating ? (
              <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" /> {t('plan_generating')}
              </div>
            ) : (
              <>
                {/* Copy to Clipboard */}
                <button
                  onClick={handleCopyToClipboard}
                  className={`inline - flex items - center gap - 2 px - 3 py - 2 rounded - xl text - sm font - semibold transition - all ${copied
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : isDark ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    } `}
                >
                  {copied ? <><CheckCircle2 className="w-4 h-4" /> {lang === 'ar' ? 'تم النسخ' : 'Copied'}</> : <><Copy className="w-4 h-4" /> {lang === 'ar' ? 'نسخ' : 'Copy'}</>}
                </button>
                {/* Share */}
                <button
                  onClick={handleShare}
                  className={`inline - flex items - center gap - 2 px - 3 py - 2 rounded - xl text - sm font - semibold transition - all ${shared
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : isDark ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    } `}
                >
                  {shared ? <><CheckCircle2 className="w-4 h-4" /> {lang === 'ar' ? 'تم' : 'Shared'}</> : <><Share2 className="w-4 h-4" /> {lang === 'ar' ? 'مشاركة' : 'Share'}</>}
                </button>
                {/* Export PDF */}
                <button
                  onClick={handleExportPDF}
                  className={`inline - flex items - center gap - 2 px - 4 py - 2 rounded - xl text - sm font - semibold transition - all shadow - sm ${isDark ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300'} `}
                >
                  <Download className="w-4 h-4" /> {t('plan_export_pdf')}
                </button>
              </>
            )}
          </div>
        </div>

        <div id="plan-content" className={`markdown - body prose max - w - none prose - p: leading - relaxed ${isDark ? 'prose-invert prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-a:text-rose-400 hover:prose-a:text-rose-300' : 'prose-slate prose-red prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-a:text-rose-600 hover:prose-a:text-rose-700 prose-headings:text-slate-900 prose-strong:text-slate-800'} `}>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className={`w - 16 h - 16 rounded - full flex items - center justify - center mb - 4 shadow - sm ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-100'} `}>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className={`text - xl font - bold ${headingClass} `}>{t('gen_error_title')}</h3>
              <p className={`max - w - md ${subClass} `}>{t('gen_error_desc')}</p>
              <p className={`text - sm font - medium mt - 4 px - 4 py - 2 rounded - lg ${isDark ? 'text-red-400 bg-red-900/20 border border-red-800' : 'text-red-600 bg-red-50 border border-red-100'} `}>{error}</p>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {plan}
            </ReactMarkdown>
          )}
        </div>
      </motion.div>
    </div>
  );
}
