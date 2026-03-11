import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { User, Save, Upload, Loader2, CheckCircle2, Trash2, ArrowRight } from 'lucide-react';

import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { parseCV } from '../lib/ml/cvParser';
import { SKILLS, SKILL_CATEGORIES } from '../lib/skills';

export interface StudentProfile {
    name: string;
    studentId: string;
    skills: string[];
}

const STORAGE_KEY = 'cmp-profile';

export function getProfile(): StudentProfile | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export default function Profile() {
    const navigate = useNavigate();
    const { t, lang } = useLanguage();
    const { isDark } = useTheme();
    const cvInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [saved, setSaved] = useState(false);
    const [cvParsing, setCvParsing] = useState(false);
    const [cvResult, setCvResult] = useState<string | null>(null);

    useEffect(() => {
        const p = getProfile();
        if (p) {
            setName(p.name);
            setStudentId(p.studentId);
            setSkills(p.skills || []);
        }
    }, []);

    const handleSave = () => {
        const profile: StudentProfile = { name, studentId, skills };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        setSaved(true);
        // Show success briefly, then redirect to generator
        setTimeout(() => navigate('/generate'), 1200);
    };


    const handleClear = () => {
        localStorage.removeItem(STORAGE_KEY);
        setName('');
        setStudentId('');
        setSkills([]);
        setCvResult(null);
    };

    const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;
        setCvParsing(true);
        setCvResult(null);
        try {
            const result = await parseCV(file);
            setSkills(prev => [...new Set([...prev, ...result.detectedSkillIds])]);
            setCvResult(
                lang === 'ar'
                    ? `تم اكتشاف ${result.detectedSkillIds.length} مهارة`
                    : `Detected ${result.detectedSkillIds.length} skills`
            );
        } catch {
            setCvResult(lang === 'ar' ? 'فشل في تحليل السيرة الذاتية' : 'Failed to parse CV');
        } finally {
            setCvParsing(false);
        }
    };

    const toggleSkill = (skillId: string) => {
        setSkills(prev =>
            prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
        );
    };

    const cardClass = isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-slate-200';
    const inputClass = isDark
        ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400';

    const btnActiveClass = isDark
        ? 'bg-slate-600 border border-slate-500 text-white'
        : 'bg-red-50 border border-red-200 text-red-700';
    const btnInactiveClass = isDark
        ? 'bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-white'
        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50';

    return (
        <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                        <User className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    </div>
                    <div>
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {lang === 'ar' ? 'الملف الشخصي والمهارات' : 'Profile & Strengths'}
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {lang === 'ar' ? 'بياناتك ومهاراتك تُحفظ محلياً وتُستخدم في توليد المشاريع وتصديرها' : 'Your data and skills are saved locally to speed up project generation'}
                        </p>
                    </div>
                </div>

                <div className={`border rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm ${cardClass}`}>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-8 border-slate-200 dark:border-slate-700">
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={lang === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-colors focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none ${inputClass}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                {lang === 'ar' ? 'الرقم الجامعي' : 'Student ID'}
                            </label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={e => setStudentId(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                placeholder="223101172"
                                maxLength={9}
                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium font-mono transition-colors focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none ${inputClass}`}
                            />
                            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {lang === 'ar' ? '9 أرقام' : '9-digit student number'}
                            </p>
                        </div>
                    </div>

                    {/* Technical Strengths */}
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div>
                                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('gen_step3_title')}</h3>
                                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('gen_step3_desc')}</p>
                            </div>
                            <div className="flex-shrink-0">
                                <input ref={cvInputRef} type="file" accept=".pdf" onChange={handleCVUpload} className="hidden" />
                                <button
                                    onClick={() => { cvInputRef.current?.click(); }}
                                    disabled={cvParsing}
                                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 ${isDark ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800 hover:bg-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        }`}
                                >
                                    {cvParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> {lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}</> : <><Upload className="w-4 h-4" /> {lang === 'ar' ? 'استخراج مهارات من CV' : 'Auto-fill from CV'}</>}
                                </button>
                                {cvResult && <p className={`text-xs text-right mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{cvResult}</p>}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {SKILL_CATEGORIES.map(category => {
                                const categorySkills = category.skills;
                                return (
                                    <div key={category.id}>
                                        <h4 className={`font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                            {lang === 'ar' ? category.ar : category.en}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {categorySkills.map(skill => {
                                                const isSelected = skills.includes(skill.id);
                                                return (
                                                    <button
                                                        key={skill.id}
                                                        onClick={() => toggleSkill(skill.id)}
                                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isSelected ? btnActiveClass : btnInactiveClass
                                                            }`}
                                                    >
                                                        {lang === 'ar' ? skill.ar : skill.en}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={handleSave}
                            disabled={!name || !studentId}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-sm disabled:opacity-50 ${saved ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                        >
                            {saved ? <><CheckCircle2 className="w-5 h-5" /> {lang === 'ar' ? 'تم الحفظ بنجاح!' : 'Profile Saved!'}</> : <><Save className="w-5 h-5" /> {lang === 'ar' ? 'حفظ البيانات' : 'Save Profile'}</>}
                        </button>
                        <button
                            onClick={handleClear}
                            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Trash2 className="w-4 h-4" /> {lang === 'ar' ? 'مسح البيانات' : 'Clear All'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
