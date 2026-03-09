import { GoogleGenAI, Type } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Missing GEMINI_API_KEY – add it to .env.local');
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

export interface ProjectIdea {
  id: string;
  title: string;
  description: string;
  courses: string[];
}

// Wrap any promise with a hard timeout so loading never hangs forever
function withTimeout<T>(promise: Promise<T>, ms = 25000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out after 25 seconds. Please try again.')), ms)
    )
  ]);
}

// Models to try in order — each has a separate free-tier quota
const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

// Try each model once, fail fast — no waiting between models
async function tryModels<T>(fn: (model: string) => Promise<T>): Promise<T> {
  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      console.log(`[Gemini] Trying model: ${model}`);
      return await fn(model);
    } catch (err: any) {
      const msg = err?.message || String(err);
      errors.push(`${model}: ${msg.slice(0, 120)}`);
      console.warn(`[Gemini] ${model} failed:`, msg.slice(0, 120));
      // Continue to next model
    }
  }

  // All models failed — throw a meaningful error immediately
  const allErrors = errors.join('\n');
  if (allErrors.includes('429') || allErrors.includes('RESOURCE_EXHAUSTED') || allErrors.includes('quota')) {
    throw new Error(
      'API quota exceeded on all available models. Please wait 1 minute then try again.\n' +
      'You can also get a fresh key at https://aistudio.google.com/apikey'
    );
  }
  if (allErrors.includes('API_KEY_INVALID') || allErrors.includes('invalid') || allErrors.includes('INVALID_ARGUMENT')) {
    throw new Error('Invalid API key. Please check GEMINI_API_KEY in your .env.local file.');
  }
  throw new Error(`Generation failed. Details: ${errors[0] || 'Unknown error'}`);
}

const MODEL = 'gemini-2.0-flash';

export const generateIdeas = async (
  courses: string[],
  interests: string,
  strengths: string,
  lang: 'en' | 'ar',
  kbContext: string = ''
): Promise<ProjectIdea[]> => {
  const ai = getAI();
  const languageInstruction = lang === 'ar'
    ? 'You MUST respond entirely in Egyptian Arabic.'
    : 'You MUST respond entirely in English.';

  const prompt = `You are an expert academic advisor for NMU AI students.
Generate exactly 3 innovative, challenging, and practical project ideas based on:
Target Courses: ${courses.join(', ')}
Student Interests: ${interests}
Technical Strengths: ${strengths}
${kbContext}

The ideas should not be superficial. They must be suitable for university-level engineering students.
${languageInstruction}`;

  const result = await withTimeout(
    tryModels(async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'A unique short identifier' },
                title: { type: Type.STRING, description: 'Catchy project title' },
                description: { type: Type.STRING, description: 'A solid 2-3 sentence description of the project' },
                courses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Which of the target courses this applies to',
                },
              },
              required: ['id', 'title', 'description', 'courses'],
            },
          },
        },
      });
      const text = response.text?.trim() || '[]';
      return JSON.parse(text);
    }),
    25000
  );

  return result;
};

export const generatePlanStream = async (
  idea: ProjectIdea,
  lang: 'en' | 'ar',
  onChunk: (text: string) => void
) => {
  const ai = getAI();
  const languageInstruction = lang === 'ar'
    ? 'You MUST respond entirely in Egyptian Arabic.'
    : 'You MUST respond entirely in English.';

  const prompt = `You are an expert academic advisor for NMU AI students.
Create a comprehensive, step-by-step implementation plan for the following project idea:
Title: ${idea.title}
Description: ${idea.description}
Relevant Courses: ${idea.courses.join(', ')}

The plan MUST include:
1. System Architecture & Tech Stack: Recommend specific frameworks, libraries, and cloud services.
2. Step-by-Step Milestones: Break the project down into logical phases (e.g., Phase 1: Data Gathering, Phase 2: Model Architecture, Phase 3: Cloud Deployment).
3. Course Integration: Explicitly state how the project fulfills the requirements of the relevant courses.
4. Potential Challenges & Solutions: Identify likely technical hurdles and how to overcome them.

Format your response beautifully using Markdown.
${languageInstruction}`;

  const responseStream = await withTimeout(
    tryModels(async (model) =>
      ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {},
      })
    ),
    25000
  );

  for await (const chunk of responseStream) {
    onChunk(chunk.text);
  }
};
