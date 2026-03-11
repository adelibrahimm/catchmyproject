/**
 * Machine Learning — CV Skill Extraction Module
 * 
 * This module extracts technical skills from an uploaded CV (PDF file)
 * using browser-side text extraction and keyword matching. It demonstrates
 * ML concepts like text preprocessing, feature extraction, and scoring.
 * 
 * Course: Machine Learning
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { SKILLS } from '../skills';

// Configure PDF.js worker using local import (more reliable than CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ── Types ──────────────────────────────────────────────────────────

export interface CVParseResult {
    /** Skill IDs detected in the CV */
    detectedSkillIds: string[];
    /** Confidence score mapping for each detected skill (0-1) */
    confidenceScores: Record<string, number>;
    /** Raw text extracted from the PDF */
    rawText: string;
    /** Total pages processed */
    pageCount: number;
}

// ── Text Extraction ────────────────────────────────────────────────

/**
 * Extracts text from a PDF file using PDF.js.
 * 
 * @param file - The uploaded PDF File object
 * @returns Extracted text and page count
 */
async function extractTextFromPDF(file: File): Promise<{ text: string; pageCount: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += pageText + '\n';
    }

    return { text: fullText, pageCount: pdf.numPages };
}

// ── Text Preprocessing ────────────────────────────────────────────

/**
 * Preprocesses the raw CV text for skill matching.
 * Normalizes whitespace, converts to lowercase, and removes
 * special characters that aren't part of skill names.
 */
function preprocessText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s.+#\/\-]/g, ' ')  // keep characters common in tech names
        .replace(/\s+/g, ' ')
        .trim();
}

// ── Skill Matching ────────────────────────────────────────────────

/**
 * Matches skills from the SKILLS list against the CV text.
 * Uses keyword matching with context-aware scoring:
 * - Exact match in text = high confidence
 * - Multiple occurrences = higher confidence
 * 
 * @param processedText - Preprocessed CV text
 * @returns Map of skill IDs to confidence scores (0-1)
 */
function matchSkills(processedText: string): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const skill of SKILLS) {
        const searchTerms = [skill.en.toLowerCase()];

        // Add common alternative names/abbreviations
        const aliases: Record<string, string[]> = {
            'cpp': ['c++', 'c plus plus'],
            'csharp': ['c#', 'c sharp'],
            'nodejs': ['node.js', 'node js', 'nodejs'],
            'nextjs': ['next.js', 'next js', 'nextjs'],
            'react_native': ['react native'],
            'scikit': ['scikit-learn', 'sklearn'],
            'github_actions': ['github actions', 'github ci'],
            'ui_ux': ['ui/ux', 'ui ux', 'user interface', 'user experience'],
            'huggingface': ['hugging face', 'huggingface', 'transformers'],
            'fastapi': ['fast api', 'fastapi'],
        };

        if (aliases[skill.id]) {
            searchTerms.push(...aliases[skill.id]);
        }

        let maxOccurrences = 0;
        for (const term of searchTerms) {
            // Count occurrences using word boundary matching
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');
            const matches = processedText.match(regex);
            if (matches) {
                maxOccurrences = Math.max(maxOccurrences, matches.length);
            }
        }

        if (maxOccurrences > 0) {
            // Confidence: scales from 0.5 (1 mention) to 1.0 (5+ mentions)
            scores[skill.id] = Math.min(0.5 + (maxOccurrences * 0.1), 1.0);
        }
    }

    return scores;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Parses a CV PDF file and extracts technical skills.
 * 
 * Pipeline:
 * 1. Extract raw text from PDF
 * 2. Preprocess text (normalize, clean)
 * 3. Match known skills using keyword matching with scoring
 * 4. Return detected skills sorted by confidence
 * 
 * @param file - The uploaded PDF file
 * @returns CVParseResult with detected skills and confidence scores
 */
export async function parseCV(file: File): Promise<CVParseResult> {
    // Step 1: Extract text
    const { text, pageCount } = await extractTextFromPDF(file);

    // Step 2: Preprocess
    const processedText = preprocessText(text);

    // Step 3: Match skills
    const confidenceScores = matchSkills(processedText);

    // Step 4: Sort by confidence and return
    const detectedSkillIds = Object.entries(confidenceScores)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => id);

    return {
        detectedSkillIds,
        confidenceScores,
        rawText: text,
        pageCount,
    };
}
