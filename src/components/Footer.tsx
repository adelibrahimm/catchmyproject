import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useTheme } from '../lib/theme';

export default function Footer() {
    const { lang } = useLanguage();
    const { isDark } = useTheme();

    return (
        <footer className={`border-t mt-12 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
            <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <img src="/nmu-logo.png" alt="NMU" className="w-10 h-10 rounded-full bg-white border border-slate-200 p-0.5 object-contain" />
                            <div>
                                <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Catch My Project</h3>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {lang === 'ar' ? 'بواسطة فريق ERTH' : 'By ERTH Team'}
                                </p>
                            </div>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {lang === 'ar'
                                ? 'منصة ذكية لطلاب كلية الحاسبات والهندسة بجامعة المنصورة الجديدة لاقتراح أفكار مشاريع مبتكرة.'
                                : 'An intelligent platform for NMU Computer Science students to discover innovative project ideas.'}
                        </p>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className={`font-bold text-sm mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {lang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                        </h4>
                        <div className="space-y-3">
                            <a
                                href="mailto:info@erth.dev"
                                className={`flex items-center gap-2 text-sm hover:text-red-600 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                            >
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                info@erth.dev
                            </a>
                            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {lang === 'ar' ? 'تواصل معنا عبر البريد الإلكتروني على مدار الساعة' : 'Contact us via email 24/7'}
                            </p>
                            <div className={`flex items-start gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>
                                    {lang === 'ar'
                                        ? 'محافظة الدقهلية - مدينة المنصورة الجديدة - الطريق الساحلي الدولي'
                                        : 'Dakahlia Governorate - New Mansoura City - International Coastal Road'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Semester */}
                    <div>
                        <h4 className={`font-bold text-sm mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {lang === 'ar' ? 'الفصل الدراسي' : 'Semester'}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {lang === 'ar' ? 'الفصل الدراسي الثاني 2025-2026' : 'Spring Semester 2025-2026'}
                        </p>
                        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {lang === 'ar'
                                ? 'كلية الحاسبات والهندسة - جامعة المنصورة الجديدة'
                                : 'Faculty of Computer Science & Engineering — New Mansoura University'}
                        </p>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className={`mt-8 pt-6 border-t text-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {lang === 'ar' ? 'جميع الحقوق محفوظة © ERTH 2026' : 'All rights reserved © ERTH 2026'}
                    </p>
                </div>
            </div>
        </footer>
    );
}
