/**
 * Knowledge Based Systems — Expert System Engine
 *
 * ═══════════════════════════════════════════════════════════════════
 * This module implements a full Expert System with four components,
 * directly matching the AIE212 Knowledge-Based Systems course syllabus:
 *
 * 1. WORKING MEMORY (Fact Base)
 *    Stores known facts (student skills & interests) with certainty
 *    values. User-selected facts start with CF = 1.0 (known for certain).
 *    New facts can be derived and added during inference.
 *
 * 2. KNOWLEDGE BASE (Production Rules)
 *    IF-THEN rules loaded from projectRules.json, each with:
 *      - Multiple antecedent conditions
 *      - A consequent (recommended domain + tech)
 *      - A Certainty Factor (CF ∈ [0,1]) expressing rule confidence
 *
 * 3. INFERENCE ENGINE — Forward Chaining with:
 *    a) Conflict Detection  — find ALL rules whose antecedents match WM
 *    b) Conflict Resolution — order by SPECIFICITY (# of antecedents)
 *                             then by CF (higher = more confident)
 *    c) Rule Firing         — update WM, propagate CFs, repeat
 *    d) Termination         — stop when no new rules can fire
 *
 * 4. EXPLANATION FACILITY
 *    Records a step-by-step inference trace for every rule that fired:
 *      - Which facts matched which conditions
 *      - How the output CF was calculated
 *      - A natural-language justification ("Why did you recommend X?")
 *
 * Certainty Factor Propagation:
 *   CF(conclusion) = CF(rule) × min(CF of matched antecedent facts)
 *   (Standard Mycin-style CF calculus, simplified for conjunctive rules)
 *
 * Reference: Dr. Shaimaa Elsabbahi, AIE212 Lectures 1–2, NMU 2026
 * ═══════════════════════════════════════════════════════════════════
 */

import rawRules from './projectRules.json';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single condition in a production rule antecedent */
export interface RuleCondition {
  type: 'skill' | 'interest';
  value: string;
}

/** A production rule in the Knowledge Base */
export interface ProductionRule {
  id: string;
  name: string;
  description: string;
  antecedents: RuleCondition[];
  consequent: {
    recommendedDomain: string;
    suggestedTech: string[];
  };
  cf: number; // Certainty Factor of the rule itself (0–1)
}

/** A fact in Working Memory */
export interface Fact {
  type: 'skill' | 'interest';
  value: string;
  /** Certainty of this fact (1.0 = user-confirmed, derived facts may be < 1) */
  cf: number;
  /** How this fact was established */
  source: 'user-input' | 'derived';
}

/** Matched condition: links a rule condition to the fact that satisfied it */
interface MatchedCondition {
  condition: RuleCondition;
  fact: Fact;
}

/** A rule that has fired during inference */
export interface FiredRule {
  rule: ProductionRule;
  matchedConditions: MatchedCondition[];
  /** CF(conclusion) = CF(rule) × min(CF of matched facts) */
  outputCf: number;
  /** Step number in the inference sequence */
  firingOrder: number;
  /** Human-readable explanation of why this rule fired */
  justification: string;
}

/** Full result of the inference engine */
export interface InferenceResult {
  /** Working memory used during inference */
  workingMemory: Fact[];
  /** Number of rules in the Conflict Set before resolution */
  conflictSetSize: number;
  /** Rules selected after conflict resolution, ordered by firing priority */
  firedRules: FiredRule[];
  /** Unique recommended domains (deduplicated, ordered by outputCf) */
  recommendedDomains: string[];
  /** Unique suggested technologies (deduplicated) */
  suggestedTechnologies: string[];
  /** Backward-compatible: count of matched rules */
  matchedRuleCount: number;
  /** Step-by-step natural language inference trace */
  explanationTrace: string[];
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function buildWorkingMemory(
  selectedSkillIds: string[],
  selectedInterestIds: string[]
): Fact[] {
  const facts: Fact[] = [];
  for (const value of selectedSkillIds) {
    facts.push({ type: 'skill', value, cf: 1.0, source: 'user-input' });
  }
  for (const value of selectedInterestIds) {
    facts.push({ type: 'interest', value, cf: 1.0, source: 'user-input' });
  }
  return facts;
}

function findFact(wm: Fact[], condition: RuleCondition): Fact | null {
  return wm.find(f => f.type === condition.type && f.value === condition.value) ?? null;
}

function matchRule(
  rule: ProductionRule,
  wm: Fact[]
): MatchedCondition[] | null {
  const matched: MatchedCondition[] = [];
  for (const cond of rule.antecedents) {
    const fact = findFact(wm, cond);
    if (!fact) return null; // Condition not satisfied → rule cannot fire
    matched.push({ condition: cond, fact });
  }
  return matched;
}

function buildJustification(rule: ProductionRule, matched: MatchedCondition[], cf: number): string {
  const condStrs = matched.map(m =>
    `${m.condition.type} "${m.condition.value}" (CF=${m.fact.cf.toFixed(2)})`
  );
  const formula = `CF = ${rule.cf.toFixed(2)} × min(${matched.map(m => m.fact.cf.toFixed(2)).join(', ')}) = ${cf.toFixed(3)}`;
  return `Rule ${rule.id} fired because: ${condStrs.join(' AND ')}. ${formula}`;
}

// ─── Inference Engine ─────────────────────────────────────────────────────────

/**
 * Runs the forward-chaining inference engine over the knowledge base.
 *
 * Algorithm:
 *   1. Initialise Working Memory from user selections (CF = 1.0)
 *   2. Build Conflict Set: all rules whose antecedents are satisfied in WM
 *   3. Conflict Resolution: sort by specificity (more conditions first),
 *      then by Certainty Factor (higher CF first)
 *   4. Fire rules in resolved order, propagate CFs
 *   5. Record every firing in the Explanation Trace
 */
export function runInference(
  selectedSkillIds: string[],
  selectedInterestIds: string[]
): InferenceResult {
  const knowledge = rawRules as ProductionRule[];

  // ── Step 1: Initialise Working Memory ─────────────────────────────────────
  const wm = buildWorkingMemory(selectedSkillIds, selectedInterestIds);

  const explanationTrace: string[] = [
    `Working Memory initialised with ${wm.filter(f => f.type === 'skill').length} skill fact(s) and ${wm.filter(f => f.type === 'interest').length} interest fact(s).`,
  ];

  // ── Step 2: Build Conflict Set ─────────────────────────────────────────────
  // Find all rules that can fire (all antecedents satisfied)
  const conflictSet: Array<{ rule: ProductionRule; matched: MatchedCondition[] }> = [];

  for (const rule of knowledge) {
    const matched = matchRule(rule, wm);
    if (matched) {
      conflictSet.push({ rule, matched });
    }
  }

  explanationTrace.push(
    `Conflict Set: ${conflictSet.length} rule(s) match the current Working Memory before conflict resolution.`
  );

  // ── Step 3: Conflict Resolution ────────────────────────────────────────────
  // Strategy: Specificity ordering (more antecedents = more specific = higher priority)
  //           Tie-broken by Certainty Factor (higher CF first)
  const resolved = [...conflictSet].sort((a, b) => {
    const specificityDiff = b.rule.antecedents.length - a.rule.antecedents.length;
    if (specificityDiff !== 0) return specificityDiff;
    return b.rule.cf - a.rule.cf; // higher CF wins ties
  });

  if (resolved.length > 0) {
    explanationTrace.push(
      `Conflict Resolution: applying specificity ordering. ` +
      `Highest priority rule is "${resolved[0].rule.name}" ` +
      `(${resolved[0].rule.antecedents.length} antecedents, CF=${resolved[0].rule.cf}).`
    );
  }

  // ── Step 4: Fire Rules ─────────────────────────────────────────────────────
  // Deduplicate by domain to avoid recommending the same domain from multiple rules
  const seenDomains = new Set<string>();
  const firedRules: FiredRule[] = [];

  for (const { rule, matched } of resolved) {
    const domain = rule.consequent.recommendedDomain;
    if (seenDomains.has(domain)) continue; // Already recommended this domain
    seenDomains.add(domain);

    // CF propagation: CF(conclusion) = CF(rule) × min(CF of matched facts)
    const minFactCf = Math.min(...matched.map(m => m.fact.cf));
    const outputCf = rule.cf * minFactCf;

    const justification = buildJustification(rule, matched, outputCf);
    const firingOrder = firedRules.length + 1;

    firedRules.push({ rule, matchedConditions: matched, outputCf, firingOrder, justification });

    explanationTrace.push(`[Iter ${firingOrder}] ${justification} → "${domain}"`);
  }

  // ── Step 5: Aggregate Results ──────────────────────────────────────────────
  // Sort by outputCf descending for display
  firedRules.sort((a, b) => b.outputCf - a.outputCf);

  const recommendedDomains = firedRules.map(f => f.rule.consequent.recommendedDomain);
  const suggestedTechnologies = [
    ...new Set(firedRules.flatMap(f => f.rule.consequent.suggestedTech)),
  ];

  if (firedRules.length === 0) {
    explanationTrace.push('No rules fired. Insufficient facts in Working Memory to trigger any production rule.');
  } else {
    explanationTrace.push(
      `Inference complete. ${firedRules.length} rule(s) fired. ` +
      `Top recommendation: "${firedRules[0].rule.consequent.recommendedDomain}" ` +
      `with CF=${firedRules[0].outputCf.toFixed(3)}.`
    );
  }

  return {
    workingMemory: wm,
    conflictSetSize: conflictSet.length,
    firedRules,
    recommendedDomains,
    suggestedTechnologies,
    matchedRuleCount: firedRules.length,
    explanationTrace,
  };
}

// ─── Prompt Formatter ─────────────────────────────────────────────────────────

/**
 * Formats the inference result into a context string for the AI prompt.
 * Only includes high-confidence recommendations (CF > 0.5).
 */
export function formatInferenceForPrompt(result: InferenceResult): string {
  if (result.firedRules.length === 0) return '';

  const highConfidence = result.firedRules
    .filter(fr => fr.outputCf > 0.5)
    .slice(0, 5);

  const domainLines = highConfidence
    .map(fr => `  • ${fr.rule.consequent.recommendedDomain} (CF=${fr.outputCf.toFixed(2)})`)
    .join('\n');

  const techSet = [...new Set(highConfidence.flatMap(fr => fr.rule.consequent.suggestedTech))];

  return `
[Knowledge-Based System Recommendations — ${highConfidence.length} rule(s) fired via forward chaining]
Recommended Domains (ordered by Certainty Factor):
${domainLines}
Suggested Technologies: ${techSet.join(', ')}
Please bias the generated project ideas towards these domains and technologies.`;
}
