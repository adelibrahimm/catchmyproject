import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Brain, Database, Cloud, Settings2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { playClick } from '../lib/audio';

const TABS = [
    { id: 'nn', icon: Brain, en: 'Neural Networks', ar: 'الشبكات العصبية' },
    { id: 'db', icon: Database, en: 'Database Schema', ar: 'مخطط قاعدة البيانات' },
    { id: 'cloud', icon: Cloud, en: 'Cloud Deployment', ar: 'النشر السحابي' },
    { id: 'sda', icon: Settings2, en: 'System Architecture', ar: 'هندسة النظام' },
] as const;

function NNTab({ isDark, lang }: { isDark: boolean; lang: string }) {
    const boxClass = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-800';
    const arrowClass = isDark ? 'text-red-400' : 'text-red-600';
    const labelClass = isDark ? 'text-slate-400' : 'text-slate-500';

    const layers = [
        { label: lang === 'ar' ? 'طبقة الإدخال' : 'Input Layer', items: [lang === 'ar' ? 'المقررات' : 'Courses', lang === 'ar' ? 'الاهتمامات' : 'Interests', lang === 'ar' ? 'المهارات' : 'Skills'] },
        { label: lang === 'ar' ? 'المعالجة' : 'Processing', items: [lang === 'ar' ? 'محرك القواعد (KBS)' : 'Rule Engine (KBS)', lang === 'ar' ? 'التحسين' : 'Optimizer', lang === 'ar' ? 'استخراج السيرة' : 'CV Parser'] },
        { label: lang === 'ar' ? 'نموذج الذكاء' : 'AI Model', items: ['Gemini API', lang === 'ar' ? 'التوليف' : 'Prompt Engineering'] },
        { label: lang === 'ar' ? 'طبقة الإخراج' : 'Output Layer', items: [lang === 'ar' ? 'أفكار المشاريع' : 'Project Ideas', lang === 'ar' ? 'خطة التنفيذ' : 'Implementation Plan'] },
    ];

    return (
        <div className="space-y-6">
            <p className={`text-sm leading-relaxed ${labelClass}`}>
                {lang === 'ar'
                    ? 'يوضح هذا المخطط كيف يعمل نظام التوصية كخط أنابيب يشبه الشبكة العصبية، حيث تمر بيانات الطالب عبر طبقات متعددة للوصول إلى الأفكار والخطط النهائية.'
                    : 'This diagram shows how the recommendation system works as a neural-network-like pipeline, where student data flows through multiple processing layers to produce project ideas and plans.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 overflow-x-auto py-4">
                {layers.map((layer, i) => (
                    <React.Fragment key={i}>
                        <div className={`border rounded-2xl p-4 min-w-[160px] w-full sm:w-auto shadow-sm ${boxClass}`}>
                            <h4 className={`text-xs font-bold uppercase tracking-wide mb-3 ${arrowClass}`}>{layer.label}</h4>
                            <div className="space-y-2">
                                {layer.items.map(item => (
                                    <div key={item} className={`px-3 py-2 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-600/50' : 'bg-slate-50 border border-slate-100'}`}>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {i < layers.length - 1 && (
                            <ArrowRight className={`w-6 h-6 flex-shrink-0 rotate-90 sm:rotate-0 ${arrowClass}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

function DBTab({ isDark, lang }: { isDark: boolean; lang: string }) {
    const tables = [
        { name: 'students', cols: ['student_id PK', 'university_id', 'full_name', 'email', 'department', 'academic_year'] },
        { name: 'skills', cols: ['skill_id PK', 'skill_key', 'name_en', 'name_ar', 'category'] },
        { name: 'courses', cols: ['course_id PK', 'course_code', 'name_en', 'name_ar', 'credit_hours'] },
        { name: 'projects', cols: ['project_id PK', 'title', 'description', 'implementation_plan', 'is_optimal'] },
        { name: 'student_skills', cols: ['student_id FK', 'skill_id FK', 'proficiency', 'source', 'confidence'] },
        { name: 'recommendations', cols: ['recommendation_id PK', 'student_id FK', 'session_token', 'kb_context', 'language'] },
    ];

    const tblClass = isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200';
    const headerClass = isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-700';
    const colClass = isDark ? 'text-slate-300 border-slate-600' : 'text-slate-600 border-slate-100';

    return (
        <div className="space-y-4">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {lang === 'ar' ? 'المخطط العلائقي لقاعدة البيانات (3NF) — 8 جداول مع مفاتيح أجنبية وفهارس.' : 'Normalized relational schema (3NF) — 8 tables with foreign keys and indexes.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map(t => (
                    <div key={t.name} className={`border rounded-xl overflow-hidden shadow-sm ${tblClass}`}>
                        <div className={`px-4 py-2 font-mono text-xs font-bold ${headerClass}`}>{t.name}</div>
                        {t.cols.map(c => (
                            <div key={c} className={`px-4 py-1.5 text-xs border-t font-mono ${colClass}`}>
                                {c.includes('PK') ? <span className="font-bold text-amber-500">🔑 </span> : c.includes('FK') ? <span className="text-blue-500">🔗 </span> : null}
                                {c}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function CloudTab({ isDark, lang }: { isDark: boolean; lang: string }) {
    const codeClass = isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-900 text-slate-100 border-slate-800';

    return (
        <div className="space-y-6">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {lang === 'ar' ? 'التطبيق جاهز للنشر عبر Docker. إليك إعدادات الحاويات.' : 'The application is Docker-ready for cloud deployment. Here are the container configurations.'}
            </p>
            <div>
                <h4 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Dockerfile</h4>
                <pre className={`rounded-xl p-4 text-xs font-mono overflow-x-auto border ${codeClass}`}>{`FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`}</pre>
            </div>
            <div>
                <h4 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>docker-compose.yml</h4>
                <pre className={`rounded-xl p-4 text-xs font-mono overflow-x-auto border ${codeClass}`}>{`version: '3.8'
services:
  web:
    build: .
    ports:
      - "80:80"
    environment:
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    restart: unless-stopped`}</pre>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-emerald-900/20 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                <h4 className="font-bold text-sm mb-1">{lang === 'ar' ? 'أوامر النشر' : 'Deploy Commands'}</h4>
                <pre className="text-xs font-mono mt-2">{`docker-compose build
docker-compose up -d`}</pre>
            </div>
        </div>
    );
}

function SDATab({ isDark, lang }: { isDark: boolean; lang: string }) {
    const boxClass = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-800';
    const arrowClass = isDark ? 'text-red-400' : 'text-red-600';

    const components = [
        { label: lang === 'ar' ? 'المتصفح' : 'Browser', desc: 'React SPA', color: 'border-blue-400' },
        { label: 'Vite Dev Server', desc: 'HMR + Tailwind', color: 'border-purple-400' },
        { label: lang === 'ar' ? 'مكونات React' : 'React Components', desc: 'Pages + State', color: 'border-emerald-400' },
        { label: lang === 'ar' ? 'طبقة الخدمات' : 'Service Layer', desc: 'KBS + ML + Optimizer', color: 'border-amber-400' },
        { label: 'Gemini API', desc: 'gemini-2.0-flash', color: 'border-red-400' },
    ];

    return (
        <div className="space-y-6">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {lang === 'ar' ? 'المخطط المعماري لتدفق البيانات في النظام من المتصفح إلى واجهة الذكاء الاصطناعي.' : 'System architecture showing the data flow from browser to AI backend.'}
            </p>
            <div className="flex flex-col items-center gap-3 py-4">
                {components.map((c, i) => (
                    <React.Fragment key={i}>
                        <div className={`border-2 ${c.color} rounded-2xl p-4 w-full max-w-md shadow-sm ${boxClass}`}>
                            <h4 className="font-bold text-sm">{c.label}</h4>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.desc}</p>
                        </div>
                        {i < components.length - 1 && (
                            <div className={`flex flex-col items-center ${arrowClass}`}>
                                <div className="w-0.5 h-3 bg-current" />
                                <ArrowRight className="w-4 h-4 rotate-90" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

export default function Docs() {
    const { lang } = useLanguage();
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<string>('nn');

    const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

    return (
        <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {lang === 'ar' ? 'التوثيق التقني' : 'Technical Documentation'}
                </h2>
                <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'ar' ? 'يوضح كيفية تطبيق كل مقرر دراسي في المنصة' : 'Shows how each course is applied within the platform'}
                </p>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { playClick(); setActiveTab(tab.id); }}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {lang === 'ar' ? tab.ar : tab.en}
                        </button>
                    ))}
                </div>

                <div className={`border rounded-2xl p-6 shadow-sm ${cardClass}`}>
                    {activeTab === 'nn' && <NNTab isDark={isDark} lang={lang} />}
                    {activeTab === 'db' && <DBTab isDark={isDark} lang={lang} />}
                    {activeTab === 'cloud' && <CloudTab isDark={isDark} lang={lang} />}
                    {activeTab === 'sda' && <SDATab isDark={isDark} lang={lang} />}
                </div>
            </motion.div>
        </div>
    );
}
