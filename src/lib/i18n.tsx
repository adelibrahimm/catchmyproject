import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}

export const translations: Translations = {
  // Navigation
  nav_home: { en: 'Home', ar: 'الرئيسية' },
  nav_generator: { en: 'Generator', ar: 'مولد الأفكار' },
  nav_title: { en: 'Catch My Project', ar: 'اكتشف مشروعي' },

  // Home
  home_badge: { en: 'Catch My Project Platform', ar: 'منصة اكتشف مشروعي' },
  home_title_1: { en: 'Discover Your Next', ar: 'اكتشف مشروعك القادم' },
  home_title_2: { en: 'Great Project', ar: 'المميز' },
  home_subtitle: {
    en: 'An intelligent platform designed to help New Mansoura University students brainstorm, refine, and plan innovative projects for their semester courses.',
    ar: 'منصة ذكية متصممة عشان تساعد طلبة جامعة المنصورة الجديدة يفكروا، يطوروا، ويخططوا لمشاريع مبتكرة لمواد الترم بتاعهم.'
  },
  home_cta: { en: 'Start Generating Ideas', ar: 'ابدأ في توليد الأفكار' },

  // Courses
  course_kbs: { en: 'Knowledge Based Systems', ar: 'النظم القائمة على المعرفة' },
  course_cc: { en: 'Cloud Computing', ar: 'الحوسبة السحابية' },
  course_ot: { en: 'Optimization Techniques', ar: 'تقنيات التحسين' },
  course_nn: { en: 'Neural Networks', ar: 'الشبكات العصبية' },
  course_ad: { en: 'Advanced Databases', ar: 'قواعد البيانات المتقدمة' },
  course_ml: { en: 'Machine Learning', ar: 'تعلم الآلة' },
  course_sda: { en: 'Systems Design and Analysis', ar: 'تصميم وتحليل النظم' },

  // Generator
  gen_title: { en: 'Project Generator', ar: 'مولد المشاريع' },
  gen_step1_title: { en: 'Select Target Courses', ar: 'اختار المواد المستهدفة' },
  gen_step1_desc: { en: 'Which courses do you want this project to cover?', ar: 'إيه المواد اللي عايز المشروع ده يغطيها؟' },
  gen_step2_title: { en: 'Your Interests', ar: 'اهتماماتك' },
  gen_step2_desc: { en: 'Select the topics or industries you are most interested in.', ar: 'اختار المواضيع أو المجالات اللي مهتم بيها أكتر حاجة.' },
  gen_step2_placeholder: { en: "I'm really interested in applying AI to improve healthcare diagnostics...", ar: 'أنا مهتم جداً أطبق الذكاء الاصطناعي عشان أحسن تشخيص الأمراض...' },
  gen_step3_title: { en: 'Technical Strengths', ar: 'نقاط قوتك التقنية' },
  gen_step3_desc: { en: 'Select your current technical skills from the list below.', ar: 'اختار مهاراتك التقنية الحالية من القائمة تحت.' },
  gen_step3_placeholder: { en: "I have strong experience with Python and basic knowledge of TensorFlow...", ar: 'عندي خبرة كويسة في بايثون ومعرفة أساسية بـ TensorFlow...' },

  gen_btn_next: { en: 'Next Step', ar: 'الخطوة الجاية' },
  gen_btn_back: { en: 'Back', ar: 'رجوع' },
  gen_btn_generate: { en: 'Generate Ideas', ar: 'ولد الأفكار' },
  gen_btn_start_over: { en: 'Start Over', ar: 'ابدأ من جديد' },

  gen_loading: { en: 'Brainstorming innovative ideas...', ar: 'بفكر في أفكار مبتكرة...' },
  gen_results_title: { en: 'Generated Ideas', ar: 'الأفكار المقترحة' },
  gen_btn_plan: { en: 'Generate Implementation Plan', ar: 'اعمل خطة التنفيذ' },
  gen_error_title: { en: 'Oops! Something went wrong', ar: 'عذراً! حدث خطأ ما' },
  gen_error_desc: { en: 'We could not generate ideas right now. The AI service might be busy or your API key is invalid.', ar: 'مقدرناش نولد أفكار دلوقتي. ممكن خدمة الذكاء الاصطناعي تكون مشغولة أو مفتاح الـ API فيه مشكلة.' },

  // Plan
  plan_btn_back: { en: 'Back to Ideas', ar: 'الرجوع للأفكار' },
  plan_target_project: { en: 'Selected Project', ar: 'المشروع المختار' },
  plan_title: { en: 'Implementation Plan', ar: 'خطة التنفيذ' },
  plan_generating: { en: 'Generating...', ar: 'جاري التحضير...' },
  plan_export_pdf: { en: 'Export as PDF', ar: 'تصدير كملف PDF' },

  // Footer / Misc
  disclaimer: { en: 'AI-generated plans should be reviewed with your academic supervisor.', ar: 'لازم تراجع الخطط اللي بيعملها الذكاء الاصطناعي مع المشرف الأكاديمي بتاعك.' },

  // ML: CV Upload
  cv_upload: { en: 'Upload CV (PDF)', ar: 'رفع السيرة الذاتية (PDF)' },
  cv_parsing: { en: 'Analyzing...', ar: 'جاري التحليل...' },

  // Optimization
  opt_btn: { en: 'Optimize Selection', ar: 'تحسين الاختيار' },
  opt_badge: { en: 'Optimal', ar: 'الأمثل' },
  opt_result_title: { en: 'Optimization Result', ar: 'نتيجة التحسين' },
  opt_result_desc: { en: '{count} project(s) needed for {coverage}% course coverage.', ar: '{count} مشروع/مشاريع مطلوبة لتغطية {coverage}% من المواد.' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');

  const t = (key: string) => {
    return translations[key]?.[lang] || key;
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div className={lang === 'ar' ? 'font-arabic' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
