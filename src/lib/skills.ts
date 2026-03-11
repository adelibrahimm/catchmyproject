export interface Skill {
  id: string;
  en: string;
  ar: string;
}

export interface SkillCategory {
  id: string;
  en: string;
  ar: string;
  skills: Skill[];
}

import skillsData from './skills.json';

export const SKILL_CATEGORIES: SkillCategory[] = skillsData as SkillCategory[];

// Flat list of all skills (for backwards-compatibility with existing imports)
export const SKILLS: Skill[] = SKILL_CATEGORIES.flatMap(cat => cat.skills);
