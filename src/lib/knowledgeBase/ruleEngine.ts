/**
 * Knowledge Based Systems — Rule-Based Inference Engine
 * 
 * This module implements a simple rule-based recommendation system
 * that simulates a Knowledge Based System (KBS). It matches the
 * student's selected skills and interests against a set of predefined
 * rules to generate domain recommendations. These recommendations
 * are then sent as additional context to the Gemini AI for more
 * targeted project idea generation.
 * 
 * Course: Knowledge Based Systems
 */

import projectRules from './projectRules.json';

// ── Types ──────────────────────────────────────────────────────────

/** A single rule in the knowledge base */
interface Rule {
  skill: string;
  interest: string;
  recommendedDomain: string;
  suggestedTech: string[];
}

/** Result of the inference engine */
export interface InferenceResult {
  /** Recommended project domains based on matched rules */
  recommendedDomains: string[];
  /** Suggested technologies aggregated from matched rules */
  suggestedTechnologies: string[];
  /** Number of rules that matched the student's profile */
  matchedRuleCount: number;
  /** The raw matched rules for debugging/display */
  matchedRules: Rule[];
}

// ── Inference Engine ───────────────────────────────────────────────

/**
 * Runs the forward-chaining inference engine.
 * 
 * The engine iterates through all rules in the knowledge base and
 * checks if the student's selected skills and interests match. When
 * a rule's conditions (skill AND interest) are satisfied, the rule
 * "fires" and its recommendations are collected.
 * 
 * @param selectedSkillIds - Array of skill IDs the student selected
 * @param selectedInterestIds - Array of interest/topic IDs the student selected
 * @returns InferenceResult with matched domains and technologies
 */
export function runInference(
  selectedSkillIds: string[],
  selectedInterestIds: string[]
): InferenceResult {
  const rules = projectRules as Rule[];
  const matchedRules: Rule[] = [];

  // Forward chaining: match facts (selections) against rules
  for (const rule of rules) {
    const skillMatched = selectedSkillIds.includes(rule.skill);
    const interestMatched = selectedInterestIds.includes(rule.interest);

    // Rule fires if BOTH conditions are met
    if (skillMatched && interestMatched) {
      matchedRules.push(rule);
    }
  }

  // Aggregate results, removing duplicates
  const recommendedDomains = [...new Set(matchedRules.map(r => r.recommendedDomain))];
  const suggestedTechnologies = [...new Set(matchedRules.flatMap(r => r.suggestedTech))];

  return {
    recommendedDomains,
    suggestedTechnologies,
    matchedRuleCount: matchedRules.length,
    matchedRules,
  };
}

/**
 * Formats the inference result into a string that can be appended
 * to the Gemini prompt as additional context.
 * 
 * @param result - The inference result from runInference()
 * @returns A formatted string for prompt injection, or empty string if no matches
 */
export function formatInferenceForPrompt(result: InferenceResult): string {
  if (result.matchedRuleCount === 0) {
    return '';
  }

  return `
  [Knowledge Base Recommendations]
  Based on the student's profile, our rule-based system recommends focusing on these domains:
  Recommended Domains: ${result.recommendedDomains.join(', ')}
  Suggested Technologies: ${result.suggestedTechnologies.join(', ')}
  Please incorporate these recommendations into the project ideas where relevant.`;
}
