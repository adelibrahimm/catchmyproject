import { ProjectIdea } from './gemini';
import { HistoryEntry } from '../pages/History';

export interface SimilarityWarning {
    ideaTitle: string;
    matchTitle: string;
    score: number; // 0-1
    isFromHistory: boolean;
}

/** Tokenise a string into a normalised set of meaningful words */
function tokenise(text: string): Set<string> {
    const STOP = new Set([
        'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'that', 'this',
        'is', 'are', 'be', 'using', 'use', 'based', 'system', 'project', 'application',
    ]);
    return new Set(
        text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP.has(w))
    );
}

/** Jaccard similarity between two token sets */
function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    const intersection = [...a].filter(t => b.has(t)).length;
    const union = new Set([...a, ...b]).size;
    return intersection / union;
}

const THRESHOLD = 0.30; // ideas sharing ≥30% keyword overlap are flagged

/**
 * Detect ideas that are suspiciously similar to each other or to past history.
 * @param newIdeas  - freshly generated ideas
 * @param history   - saved history entries (may be empty)
 */
export function detectSimilarities(
    newIdeas: ProjectIdea[],
    history: HistoryEntry[]
): SimilarityWarning[] {
    const warnings: SimilarityWarning[] = [];

    // Build token sets for each new idea (title + description)
    const newTokens = newIdeas.map(idea =>
        tokenise(idea.title + ' ' + idea.description)
    );

    // 1) New ideas vs each other
    for (let i = 0; i < newIdeas.length; i++) {
        for (let j = i + 1; j < newIdeas.length; j++) {
            const score = jaccard(newTokens[i], newTokens[j]);
            if (score >= THRESHOLD) {
                warnings.push({
                    ideaTitle: newIdeas[i].title,
                    matchTitle: newIdeas[j].title,
                    score,
                    isFromHistory: false,
                });
            }
        }
    }

    // 2) New ideas vs history (last 10 sessions to keep it fast)
    const historyIdeas = history
        .slice(0, 10)
        .flatMap(entry => entry.ideas);

    for (let i = 0; i < newIdeas.length; i++) {
        for (const hist of historyIdeas) {
            const histTokens = tokenise(hist.title + ' ' + hist.description);
            const score = jaccard(newTokens[i], histTokens);
            if (score >= THRESHOLD) {
                warnings.push({
                    ideaTitle: newIdeas[i].title,
                    matchTitle: hist.title,
                    score,
                    isFromHistory: true,
                });
                break; // one history-match per new idea is enough
            }
        }
    }

    return warnings;
}
