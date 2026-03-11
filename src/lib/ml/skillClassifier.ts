/**
 * Neural Networks — Skill Domain Classifier (AIE231)
 *
 * ═══════════════════════════════════════════════════════════════════
 * This module implements a 2-layer Artificial Neural Network that
 * trains entirely in the browser, demonstrating the three lecture topics:
 *
 *   Lecture 1: ANN Architecture
 *     Input (one-hot, n_skills) → Dense(HIDDEN, ReLU) → Dense(5, Softmax)
 *
 *   Lecture 2: Logistic Regression as a Single-Layer NN
 *     The output layer IS a multi-class logistic regression unit.
 *     Softmax + Cross-Entropy Loss = maximum likelihood estimation.
 *
 *   Lecture 3: Gradient Descent
 *     Full mini-batch SGD training loop with backpropagation.
 *     Weight update rule: W ← W − α · ∂L/∂W
 *
 * ═══════════════════════════════════════════════════════════════════
 * Network Architecture:
 *   Layer 1: W1 [HIDDEN × INPUT]  + b1 [HIDDEN]  → ReLU
 *   Layer 2: W2 [OUTPUT × HIDDEN] + b2 [OUTPUT]  → Softmax
 *
 * Training:
 *   Dataset: SKILL_DOMAIN_MAP (~65 labeled skill → domain pairs)
 *   Loss:    Cross-Entropy  L = −Σⱼ yⱼ · log(ŷⱼ + ε)
 *   Optim:   Vanilla Gradient Descent, lr = 0.05, 300 epochs
 *
 * Backpropagation:
 *   δ₂ = ŷ − y                         (Softmax+CE gradient, simplified)
 *   ∂L/∂W2 = δ₂ ⊗ h                   (outer product)
 *   ∂L/∂b2 = δ₂
 *   δ₁ = (W2ᵀ · δ₂) ⊙ relu'(z₁)      (ReLU derivative)
 *   ∂L/∂W1 = δ₁ ⊗ x
 *   ∂L/∂b1 = δ₁
 *
 * Reference: AIE231 Lectures 1–3, Assoc. Prof. Aya M. Al-Zoghby, NMU 2026
 * ═══════════════════════════════════════════════════════════════════
 */

import { SKILLS } from '../skills';

// ─── Constants ────────────────────────────────────────────────────────────────

const HIDDEN_SIZE = 16;
const OUTPUT_SIZE = 5;
const LEARNING_RATE = 0.05;
const EPOCHS = 300;
const EPSILON = 1e-15; // numerical stability for log

// ─── Domain definitions ───────────────────────────────────────────────────────

export const DOMAINS = [
    { id: 'ai', en: 'Artificial Intelligence', ar: 'الذكاء الاصطناعي', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
    { id: 'web', en: 'Web Development', ar: 'تطوير الويب', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
    { id: 'cloud', en: 'Cloud & DevOps', ar: 'السحابة والعمليات', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
    { id: 'data', en: 'Data Science', ar: 'علم البيانات', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
    { id: 'db', en: 'Databases', ar: 'قواعد البيانات', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
] as const;

// ─── Labeled training dataset ─────────────────────────────────────────────────
// domain: 0=AI  1=Web  2=Cloud  3=DataScience  4=Databases

const SKILL_DOMAIN_MAP: Record<string, number> = {
    // AI & ML
    python: 0, tensorflow: 0, pytorch: 0, keras: 0, scikit: 0,
    opencv: 0, huggingface: 0, nltk: 0, spacy: 0, r: 0, matlab: 0,
    cpp: 0, robotics: 0,
    // Web Development
    javascript: 1, typescript: 1, react: 1, angular: 1, vue: 1,
    nextjs: 1, nodejs: 1, express: 1, django: 1, flask: 1,
    fastapi: 1, spring: 1, laravel: 1, php: 1, ruby: 1,
    flutter: 1, react_native: 1, dart: 1, swift: 1, kotlin: 1,
    android: 1, ios: 1, figma: 1, ui_ux: 1, java: 1, csharp: 1,
    unity: 1, unreal: 1,
    // Cloud & DevOps
    aws: 2, gcp: 2, azure: 2, docker: 2, kubernetes: 2,
    linux: 2, git: 2, github_actions: 2, go: 2, rust: 2,
    blockchain: 2, solidity: 2, iot: 2, cybersecurity: 2,
    // Data Science
    pandas: 3, numpy: 3,
    // Databases
    sql: 4, mysql: 4, postgresql: 4, mongodb: 4, redis: 4,
    firebase: 4, supabase: 4, elasticsearch: 4,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingResult {
    /** Loss value recorded every 10 epochs */
    lossHistory: number[];
    /** Training accuracy 0–1 */
    accuracy: number;
    /** Total wall-clock time in milliseconds */
    trainTimeMs: number;
    /** Number of training examples */
    datasetSize: number;
    /** Final epoch count */
    epochs: number;
    /** Trained weight matrices (kept for classification) */
    weights: NetworkWeights;
}

interface NetworkWeights {
    W1: number[][];  // [HIDDEN_SIZE × INPUT_SIZE]
    b1: number[];    // [HIDDEN_SIZE]
    W2: number[][];  // [OUTPUT_SIZE × HIDDEN_SIZE]
    b2: number[];    // [OUTPUT_SIZE]
}

// ─── Seeded pseudo-random (deterministic but non-trivial looking) ─────────────

function makePRNG(seed: number) {
    let s = seed >>> 0;
    return () => {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        return ((s >>> 0) / 0xFFFFFFFF) * 2 - 1; // uniform [-1, 1]
    };
}

// ─── Xavier (Glorot) weight initialisation ───────────────────────────────────

function xavierMatrix(rows: number, cols: number, rng: () => number): number[][] {
    const scale = Math.sqrt(2.0 / (rows + cols));
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => rng() * scale)
    );
}

// ─── Activation functions ─────────────────────────────────────────────────────

function relu(x: number): number { return x > 0 ? x : 0; }
function reluDeriv(x: number): number { return x > 0 ? 1 : 0; }

function softmax(z: number[]): number[] {
    const maxZ = Math.max(...z);
    const exps = z.map(v => Math.exp(v - maxZ));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(v => v / sum);
}

// ─── Matrix-vector operations ─────────────────────────────────────────────────

/** y[i] = Σⱼ W[i][j] · x[j] + b[i] */
function affine(W: number[][], x: number[], b: number[]): number[] {
    return W.map((row, i) => b[i] + row.reduce((s, w, j) => s + w * x[j], 0));
}

/** cross-entropy loss for one sample */
function crossEntropy(y: number[], yhat: number[]): number {
    return -y.reduce((s, yi, i) => s + yi * Math.log(yhat[i] + EPSILON), 0);
}

// ─── Training data builder ────────────────────────────────────────────────────

function buildDataset(): Array<{ x: number[]; y: number[]; skillIdx: number }> {
    const INPUT_SIZE = SKILLS.length;
    const data: Array<{ x: number[]; y: number[]; skillIdx: number }> = [];
    SKILLS.forEach((skill, si) => {
        const domainIdx = SKILL_DOMAIN_MAP[skill.id];
        if (domainIdx === undefined) return; // skip unknown skills
        const x = Array(INPUT_SIZE).fill(0);
        x[si] = 1.0;
        const y = Array(OUTPUT_SIZE).fill(0);
        y[domainIdx] = 1.0;
        data.push({ x, y, skillIdx: si });
    });
    return data;
}

// ─── Main training function ───────────────────────────────────────────────────

/**
 * Trains the 2-layer ANN using Gradient Descent + Backpropagation.
 *
 * Runs synchronously (completes in < 50 ms for this dataset size).
 * Results are cached in `cachedResult` so training only happens once per session.
 */
export function trainNetwork(): TrainingResult {
    const t0 = performance.now();
    const rng = makePRNG(0xDEADBEEF);
    const INPUT_SIZE = SKILLS.length;

    // ── Xavier weight initialisation ──────────────────────────────────────────
    const W1 = xavierMatrix(HIDDEN_SIZE, INPUT_SIZE, rng);
    const b1 = Array(HIDDEN_SIZE).fill(0.0);
    const W2 = xavierMatrix(OUTPUT_SIZE, HIDDEN_SIZE, rng);
    const b2 = Array(OUTPUT_SIZE).fill(0.0);

    const dataset = buildDataset();
    const lossHistory: number[] = [];

    // ── Training loop ──────────────────────────────────────────────────────────
    for (let epoch = 0; epoch < EPOCHS; epoch++) {
        let epochLoss = 0;

        for (const { x, y } of dataset) {
            // ── Forward pass ──────────────────────────────────────────────────────
            const z1 = affine(W1, x, b1);          // pre-activation [HIDDEN]
            const h = z1.map(relu);               // hidden layer    [HIDDEN]
            const z2 = affine(W2, h, b2);          // pre-activation [OUTPUT]
            const yhat = softmax(z2);                // output probs    [OUTPUT]

            epochLoss += crossEntropy(y, yhat);

            // ── Backward pass ─────────────────────────────────────────────────────

            // Output layer gradient: δ₂ = ŷ − y  (Softmax + CE simplification)
            const d2 = yhat.map((v, i) => v - y[i]);  // [OUTPUT]

            // Hidden layer gradient: δ₁ = (W2ᵀ · d2) ⊙ relu'(z1)
            const dh = Array(HIDDEN_SIZE).fill(0);
            for (let o = 0; o < OUTPUT_SIZE; o++) {
                for (let hh = 0; hh < HIDDEN_SIZE; hh++) {
                    dh[hh] += W2[o][hh] * d2[o];
                }
            }
            const d1 = dh.map((v, hh) => v * reluDeriv(z1[hh])); // [HIDDEN]

            // ── Gradient Descent weight update: W ← W − lr · ∂L/∂W ───────────────

            // Update W2, b2
            for (let o = 0; o < OUTPUT_SIZE; o++) {
                b2[o] -= LEARNING_RATE * d2[o];
                for (let hh = 0; hh < HIDDEN_SIZE; hh++) {
                    W2[o][hh] -= LEARNING_RATE * d2[o] * h[hh];
                }
            }

            // Update W1, b1
            for (let hh = 0; hh < HIDDEN_SIZE; hh++) {
                b1[hh] -= LEARNING_RATE * d1[hh];
                for (let ii = 0; ii < INPUT_SIZE; ii++) {
                    W1[hh][ii] -= LEARNING_RATE * d1[hh] * x[ii];
                }
            }
        }

        // Record loss every 10 epochs
        if (epoch % 10 === 0 || epoch === EPOCHS - 1) {
            lossHistory.push(epochLoss / dataset.length);
        }
    }

    // ── Compute final accuracy ─────────────────────────────────────────────────
    let correct = 0;
    for (const { x, y } of dataset) {
        const z1 = affine(W1, x, b1);
        const h = z1.map(relu);
        const z2 = affine(W2, h, b2);
        const yhat = softmax(z2);
        const pred = yhat.indexOf(Math.max(...yhat));
        const truth = y.indexOf(1);
        if (pred === truth) correct++;
    }

    const trainTimeMs = performance.now() - t0;

    return {
        lossHistory,
        accuracy: correct / dataset.length,
        trainTimeMs,
        datasetSize: dataset.length,
        epochs: EPOCHS,
        weights: { W1, b1, W2, b2 },
    };
}

// ─── Module-level singleton (train once per session) ─────────────────────────

let cachedResult: TrainingResult | null = null;

export function getTrainingResult(): TrainingResult {
    if (!cachedResult) cachedResult = trainNetwork();
    return cachedResult;
}

// ─── Inference (forward pass with trained weights) ────────────────────────────

/**
 * Classifies a skill into a domain using the trained network.
 * Returns the softmax probability distribution over DOMAINS.
 */
export function classifySkill(skillId: string): number[] {
    const { weights: { W1, b1, W2, b2 } } = getTrainingResult();
    const INPUT_SIZE = SKILLS.length;

    const input = Array(INPUT_SIZE).fill(0);
    const skillIdx = SKILLS.findIndex(s => s.id === skillId);
    if (skillIdx === -1) return Array(OUTPUT_SIZE).fill(1 / OUTPUT_SIZE);
    input[skillIdx] = 1.0;

    const z1 = affine(W1, input, b1);
    const h = z1.map(relu);
    const z2 = affine(W2, h, b2);
    return softmax(z2);
}


