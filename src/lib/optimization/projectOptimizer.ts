/**
 * Optimization Techniques — Project Selection via Linear Programming
 *
 * ═══════════════════════════════════════════════════════════════════
 * LP Formulation (Set-Cover Maximization):
 *
 *   Maximize:   Z = Σᵢ cᵢ · xᵢ
 *
 *   Subject to: xᵢ ≤ 1   ∀ i          (each project used at most once)
 *               Σᵢ xᵢ ≤ K             (budget: select at most K projects)
 *               xᵢ ≥ 0   ∀ i          (non-negativity)
 *
 *   Where:
 *     xᵢ  = decision variable for project i (LP relaxation: 0 ≤ xᵢ ≤ 1)
 *     cᵢ  = number of target courses uniquely covered by project i
 *     K   = 2 (maximum projects to recommend)
 *
 * ═══════════════════════════════════════════════════════════════════
 * Solution Method: Simplex Tableau Algorithm (Dantzig, 1947)
 *
 *   Step 1 — Standard Form:
 *     Add a slack variable sⱼ for each ≤ constraint:
 *       xᵢ + sₙ₊ᵢ = 1       (for each project bound)
 *       Σᵢ xᵢ + s_last = K  (for budget constraint)
 *
 *   Step 2 — Initial BFS:
 *     All xᵢ = 0 (non-basic), all sⱼ = bⱼ (basic, feasible)
 *
 *   Step 3 — Iterate until optimal:
 *     a) Optimality check: if all reduced costs ĉⱼ ≥ 0 → STOP (optimal)
 *     b) Entering variable: most negative ĉⱼ  (Dantzig's rule)
 *     c) Leaving variable:  min-ratio test → min{ bᵢ / aᵢⱼ | aᵢⱼ > 0 }
 *     d) Pivot: elementary row operations to make entering column a unit vector
 *
 * Reference: Lecture slides Weeks 2–3, Optimization Techniques (NMU, 2026)
 * ═══════════════════════════════════════════════════════════════════
 */

import { ProjectIdea } from '../gemini';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Budget constraint K — at most this many projects are recommended */
export const MAX_PROJECTS = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

/** One iteration of the Simplex algorithm */
export interface SimplexPivotStep {
    /** Iteration number (1-indexed) */
    iteration: number;
    /** Name of the variable entering the basis (e.g. "x₁") */
    enteringVar: string;
    /** Name of the variable leaving the basis (e.g. "s₃") */
    leavingVar: string;
    /** The pivot element value */
    pivotElement: number;
    /** Objective value Z after this pivot */
    objectiveValue: number;
    /** Current basis variable names (length = m constraints) */
    basisVars: string[];
    /** Min-ratio values shown during leaving-variable selection */
    ratioTest: Array<{ basisVar: string; ratio: string }>;
}

/** Per-project selection step (kept for UI backward-compat) */
export interface OptimizationStep {
    project: ProjectIdea;
    newCoursesCovered: string[];
    totalCoveredSoFar: number;
    /** LP relaxation value xᵢ for this project (0–1) */
    lpValue: number;
    /** Simplex iteration at which this project entered the basis */
    simplexIteration?: number;
}

/** Full result returned from the optimizer */
export interface OptimizationResult {
    selectedProjects: ProjectIdea[];
    coveredCourses: string[];
    uncoveredCourses: string[];
    coveragePercentage: number;
    steps: OptimizationStep[];
    /** Every Simplex pivot iteration (for educational display) */
    simplexPivots: SimplexPivotStep[];
    /** Final LP objective value Z* */
    lpObjectiveValue: number;
    /** LP relaxation solution vector x* (one value per project, 0–1) */
    lpSolution: number[];
}

// ─── Unicode subscript helpers ────────────────────────────────────────────────

const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
function sub(n: number): string {
    return String(n).split('').map(d => SUB[+d]).join('');
}

// ─── Simplex Tableau Solver ───────────────────────────────────────────────────

/**
 * Solves a maximization LP in standard form using the Simplex method.
 *
 * Input:
 *   c  – objective coefficients (length n)
 *   A  – constraint matrix  (m × n), all ≤ constraints
 *   b  – RHS vector         (length m), all b ≥ 0
 *
 * Standard form (after adding m slack variables):
 *   max cᵀx   s.t. Ax + Is = b,  x ≥ 0, s ≥ 0
 *
 * Tableau layout: (m+1) rows × (n + m + 1) cols
 *   Rows 0..m-1 : constraint rows
 *   Row m       : objective row  (stores –cᵀ, updated to store reduced costs)
 *   Last column : RHS  (b)
 */
function solveSimplex(
    c: number[],
    A: number[][],
    b: number[],
    varNames: string[]      // names for the n original decision variables
): {
    solution: number[];
    objectiveValue: number;
    pivotSteps: Omit<SimplexPivotStep, 'iteration'>[];
    basisHistory: number[][];   // basisIndices at each iteration
} {
    const m = A.length;         // number of constraints
    const n = c.length;         // number of decision variables
    const total = n + m;        // decision vars + slack vars

    // Slack names: s₀, s₁, …
    const slackNames: string[] = Array.from({ length: m }, (_, i) => `s${sub(i)}`);
    const allNames = [...varNames, ...slackNames];

    // ── Build initial Simplex tableau ──────────────────────────────────────────
    //   Rows 0..m-1: [A | I_m | b]
    //   Row m:       [-c | 0_m | 0]   (objective, negated for maximization)

    const T: number[][] = [];

    for (let i = 0; i < m; i++) {
        const row = Array(total + 1).fill(0);
        for (let j = 0; j < n; j++) row[j] = A[i][j];
        row[n + i] = 1;      // slack variable coefficient
        row[total] = b[i];   // RHS
        T.push(row);
    }

    // Objective row: reduced costs are -c (we want to find negatives to improve)
    const objRow = Array(total + 1).fill(0);
    for (let j = 0; j < n; j++) objRow[j] = -c[j];
    T.push(objRow);

    // Initial basis: slack variables s₀, s₁, …, s_{m-1}
    const basisIdx: number[] = Array.from({ length: m }, (_, i) => n + i);

    const pivotSteps: Omit<SimplexPivotStep, 'iteration'>[] = [];
    const basisHistory: number[][] = [basisIdx.slice()];
    const RHS = total; // index of the RHS column
    const MAX_ITER = 100;

    // ── Simplex iterations ─────────────────────────────────────────────────────

    for (let iter = 0; iter < MAX_ITER; iter++) {
        // ① Optimality check: find the most negative reduced cost ĉⱼ
        let enteringCol = -1;
        let mostNeg = -1e-9;
        for (let j = 0; j < total; j++) {
            if (T[m][j] < mostNeg) {
                mostNeg = T[m][j];
                enteringCol = j;
            }
        }
        if (enteringCol === -1) break; // All ĉⱼ ≥ 0 → optimal

        // ② Min-ratio test: leaving variable
        let leavingRow = -1;
        let minRatio = Infinity;
        const ratioTest: Array<{ basisVar: string; ratio: string }> = [];

        for (let i = 0; i < m; i++) {
            const aij = T[i][enteringCol];
            if (aij > 1e-9) {
                const ratio = T[i][RHS] / aij;
                ratioTest.push({ basisVar: allNames[basisIdx[i]], ratio: ratio.toFixed(4) });
                if (ratio < minRatio) {
                    minRatio = ratio;
                    leavingRow = i;
                }
            } else {
                ratioTest.push({ basisVar: allNames[basisIdx[i]], ratio: '–' });
            }
        }

        if (leavingRow === -1) break; // Unbounded (cannot happen with our bounded LP)

        const pivotElem = T[leavingRow][enteringCol];
        const currentZ = T[m][RHS]; // Z at current BFS (before pivot)

        // Record the pivot step
        pivotSteps.push({
            enteringVar: allNames[enteringCol],
            leavingVar: allNames[basisIdx[leavingRow]],
            pivotElement: pivotElem,
            objectiveValue: currentZ,
            basisVars: basisIdx.map(bi => allNames[bi]),
            ratioTest,
        });

        // ③ Pivot: make T[leavingRow][enteringCol] = 1, zeros elsewhere in column
        // Scale pivot row
        const pivotRowScale = T[leavingRow][enteringCol];
        for (let j = 0; j <= RHS; j++) T[leavingRow][j] /= pivotRowScale;

        // Eliminate all other rows (including objective row m)
        for (let i = 0; i <= m; i++) {
            if (i === leavingRow) continue;
            const factor = T[i][enteringCol];
            if (Math.abs(factor) < 1e-12) continue;
            for (let j = 0; j <= RHS; j++) T[i][j] -= factor * T[leavingRow][j];
        }

        // Update basis
        basisIdx[leavingRow] = enteringCol;
        basisHistory.push(basisIdx.slice());
    }

    // ── Extract solution ───────────────────────────────────────────────────────
    const x = Array(n).fill(0);
    for (let i = 0; i < m; i++) {
        if (basisIdx[i] < n) {
            x[basisIdx[i]] = Math.max(0, T[i][RHS]);
        }
    }

    return {
        solution: x,
        objectiveValue: T[m][RHS],   // Z*
        pivotSteps,
        basisHistory,
    };
}

// ─── Public optimizer ─────────────────────────────────────────────────────────

/**
 * Selects the optimal subset of projects by solving a Linear Program using
 * the Simplex method — directly implementing the Optimization Techniques
 * course content (Weeks 2–3).
 */
export function optimizeProjectSelection(
    projects: ProjectIdea[],
    targetCourses: string[]
): OptimizationResult {

    // Edge cases
    if (projects.length === 0 || targetCourses.length === 0) {
        return {
            selectedProjects: [],
            coveredCourses: [],
            uncoveredCourses: [...targetCourses],
            coveragePercentage: 0,
            steps: [],
            simplexPivots: [],
            lpObjectiveValue: 0,
            lpSolution: [],
        };
    }

    const n = projects.length;

    // ── LP objective: cᵢ = number of target courses covered by project i ───────
    const c: number[] = projects.map(p =>
        p.courses.filter(pc =>
            targetCourses.some(tc => tc.toLowerCase().trim() === pc.toLowerCase().trim())
        ).length
    );

    // ── LP constraints: Ax ≤ b ────────────────────────────────────────────────
    //   Row i  (i=0..n-1):  xᵢ ≤ 1             (project-bound constraints)
    //   Row n:              x₀ + x₁ + … ≤ K    (budget constraint)

    const A: number[][] = [];

    // Project-bound rows: identity-like
    for (let i = 0; i < n; i++) {
        const row = Array(n).fill(0);
        row[i] = 1;
        A.push(row);
    }
    // Budget row
    A.push(Array(n).fill(1));

    const b: number[] = [...Array(n).fill(1), MAX_PROJECTS];

    // ── Variable names for display ─────────────────────────────────────────────
    const varNames: string[] = projects.map((_, i) => `x${sub(i + 1)}`);

    // ── Solve LP with Simplex ──────────────────────────────────────────────────
    const { solution, objectiveValue, pivotSteps, basisHistory } =
        solveSimplex(c, A, b, varNames);

    // ── Annotate pivot steps with iteration numbers ───────────────────────────
    const simplexPivots: SimplexPivotStep[] = pivotSteps.map((step, i) => ({
        iteration: i + 1,
        ...step,
    }));

    // ── Round LP relaxation to integer selection ───────────────────────────────
    //   Projects are selected in decreasing LP-value order until budget K is met.
    const ranked = projects
        .map((p, i) => ({ project: p, lpValue: solution[i] ?? 0, index: i }))
        .sort((a, b) => b.lpValue - a.lpValue);

    const uncoveredSet = new Set(targetCourses.map(c => c.toLowerCase().trim()));
    const selected: ProjectIdea[] = [];
    const steps: OptimizationStep[] = [];

    for (const { project, lpValue, index } of ranked) {
        if (selected.length >= MAX_PROJECTS) break;
        if (lpValue < 1e-6) continue; // LP says don't select this project

        const newCourses = project.courses.filter(pc =>
            [...uncoveredSet].some(uc => uc === pc.toLowerCase().trim())
        );

        if (newCourses.length === 0 && selected.length > 0) continue;

        selected.push(project);
        const matchedTarget = targetCourses.filter(tc =>
            newCourses.some(nc => nc.toLowerCase().trim() === tc.toLowerCase().trim())
        );
        matchedTarget.forEach(tc => uncoveredSet.delete(tc.toLowerCase().trim()));

        // Find iteration when this variable entered the basis
        const varIdx = index;
        const pivotIter = basisHistory.findIndex(basis => basis.includes(varIdx));

        steps.push({
            project,
            newCoursesCovered: matchedTarget,
            totalCoveredSoFar: targetCourses.length - uncoveredSet.size,
            lpValue,
            simplexIteration: pivotIter >= 0 ? pivotIter : undefined,
        });
    }

    const coveredCourses = targetCourses.filter(
        tc => !uncoveredSet.has(tc.toLowerCase().trim())
    );

    return {
        selectedProjects: selected,
        coveredCourses,
        uncoveredCourses: [...uncoveredSet].map(lc =>
            targetCourses.find(tc => tc.toLowerCase().trim() === lc) ?? lc
        ),
        coveragePercentage:
            targetCourses.length > 0
                ? Math.round((coveredCourses.length / targetCourses.length) * 100)
                : 0,
        steps,
        simplexPivots,
        lpObjectiveValue: objectiveValue,
        lpSolution: solution,
    };
}
