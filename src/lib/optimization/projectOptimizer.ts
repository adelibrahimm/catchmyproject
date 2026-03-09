/**
 * Optimization Techniques — Project Selection Optimizer
 * 
 * This module implements a Normal Equation (closed-form solution) approach
 * to find the optimal subset of projects that cover the most courses.
 * 
 * Algorithm: Normal Equation (Closed-Form Solution)
 * - Models each project as a binary feature vector (1 if covers course, 0 if not)
 * - Computes optimal weights using θ = (XᵀX)⁻¹ · Xᵀ · y
 * - Projects with the highest weights are selected as optimal
 * - Time complexity: O(n³) for matrix inversion, but practical for small datasets
 * 
 * This is the simplest Machine Learning optimization technique — 
 * a single direct computation with no iterations required.
 * 
 * Course: Optimization Techniques
 */

import { ProjectIdea } from '../gemini';

// ── Types ──────────────────────────────────────────────────────────

export interface OptimizationResult {
    /** The selected optimal subset of projects */
    selectedProjects: ProjectIdea[];
    /** Courses covered by the selected projects */
    coveredCourses: string[];
    /** Courses that remain uncovered */
    uncoveredCourses: string[];
    /** Coverage percentage (0-100) */
    coveragePercentage: number;
    /** Steps taken by the algorithm (for visualization) */
    steps: OptimizationStep[];
}

export interface OptimizationStep {
    /** The project selected at this step */
    project: ProjectIdea;
    /** New courses covered by this project */
    newCoursesCovered: string[];
    /** Total courses covered after this step */
    totalCoveredSoFar: number;
}

// ── Linear Algebra Utilities ───────────────────────────────────────

/** Transpose a matrix */
function transpose(M: number[][]): number[][] {
    if (M.length === 0) return [];
    const rows = M.length, cols = M[0].length;
    const T: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++)
            T[j][i] = M[i][j];
    return T;
}

/** Multiply two matrices A (m×n) and B (n×p) → C (m×p) */
function matMul(A: number[][], B: number[][]): number[][] {
    const m = A.length, n = B.length, p = B[0].length;
    const C: number[][] = Array.from({ length: m }, () => Array(p).fill(0));
    for (let i = 0; i < m; i++)
        for (let j = 0; j < p; j++)
            for (let k = 0; k < n; k++)
                C[i][j] += A[i][k] * B[k][j];
    return C;
}

/** Multiply a matrix A (m×n) by a vector v (n) → result (m) */
function matVec(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
}

/**
 * Invert a square matrix using Gauss-Jordan elimination.
 * Adds a small regularization term (λI) for numerical stability.
 */
function invertMatrix(M: number[][], lambda = 0.01): number[][] {
    const n = M.length;
    // Create augmented matrix [M + λI | I]
    const aug: number[][] = M.map((row, i) =>
        [...row.map((v, j) => v + (i === j ? lambda : 0)), ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]
    );

    for (let col = 0; col < n; col++) {
        // Partial pivoting
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        const pivot = aug[col][col];
        if (Math.abs(pivot) < 1e-12) continue; // Skip near-zero pivots

        // Scale pivot row
        for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

        // Eliminate column
        for (let row = 0; row < n; row++) {
            if (row === col) continue;
            const factor = aug[row][col];
            for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
        }
    }

    // Extract the inverse from the augmented matrix
    return aug.map(row => row.slice(n));
}

// ── Normal Equation Optimizer ──────────────────────────────────────

/**
 * Finds the optimal subset of projects that covers the maximum
 * number of target courses using the Normal Equation (closed-form solution).
 * 
 * Normal Equation: θ = (XᵀX)⁻¹ · Xᵀ · y
 * 
 * Where:
 * - X = project-course matrix (each row is a project, each column is a course)
 * - y = target vector (all 1s, meaning we want full coverage)
 * - θ = optimal weight for each project (higher = more important)
 * 
 * Projects are then ranked by their computed weight θ and selected
 * greedily until all courses are covered.
 * 
 * @param projects - List of generated project ideas (each with courses[])
 * @param targetCourses - List of courses the student wants to cover
 * @returns OptimizationResult with the optimal project selection
 */
export function optimizeProjectSelection(
    projects: ProjectIdea[],
    targetCourses: string[]
): OptimizationResult {
    if (projects.length === 0 || targetCourses.length === 0) {
        return {
            selectedProjects: [],
            coveredCourses: [],
            uncoveredCourses: [...targetCourses],
            coveragePercentage: 0,
            steps: [],
        };
    }

    // Step 1: Build the feature matrix X (projects × courses)
    // X[i][j] = 1 if project i covers course j, else 0
    const X: number[][] = projects.map(project =>
        targetCourses.map(course =>
            project.courses.some(c =>
                c.toLowerCase().trim() === course.toLowerCase().trim()
            ) ? 1 : 0
        )
    );

    // Step 2: Build the target vector y (all 1s — we want full coverage)
    const y = Array(targetCourses.length).fill(1);

    // Step 3: Compute θ = (XᵀX)⁻¹ · Xᵀ · y (Normal Equation)
    const Xt = transpose(X);         // Xᵀ (courses × projects)
    const XtX = matMul(Xt, X);       // XᵀX (courses × courses)
    const XtX_inv = invertMatrix(XtX); // (XᵀX)⁻¹
    const XtX_inv_Xt = matMul(XtX_inv, Xt); // (XᵀX)⁻¹ · Xᵀ
    const theta = matVec(XtX_inv_Xt, y); // θ = (XᵀX)⁻¹ · Xᵀ · y

    // Step 4: Rank projects by their computed weight θ
    const rankedProjects = projects
        .map((project, i) => ({ project, weight: theta[i] ?? 0, index: i }))
        .sort((a, b) => b.weight - a.weight);

    // Step 5: Select projects greedily by rank until all courses are covered
    const uncovered = new Set(targetCourses);
    const selected: ProjectIdea[] = [];
    const steps: OptimizationStep[] = [];

    for (const { project } of rankedProjects) {
        if (uncovered.size === 0) break;

        const newCourses = project.courses.filter(c =>
            [...uncovered].some(uc => uc.toLowerCase().trim() === c.toLowerCase().trim())
        );

        if (newCourses.length === 0) continue;

        selected.push(project);
        const matchedTarget = targetCourses.filter(tc =>
            newCourses.some(nc => nc.toLowerCase().trim() === tc.toLowerCase().trim())
        );
        matchedTarget.forEach(c => uncovered.delete(c));

        steps.push({
            project,
            newCoursesCovered: matchedTarget,
            totalCoveredSoFar: targetCourses.length - uncovered.size,
        });
    }

    const coveredCourses = targetCourses.filter(c => !uncovered.has(c));

    return {
        selectedProjects: selected,
        coveredCourses,
        uncoveredCourses: [...uncovered],
        coveragePercentage: targetCourses.length > 0
            ? Math.round((coveredCourses.length / targetCourses.length) * 100)
            : 0,
        steps,
    };
}
