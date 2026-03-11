// ─────────────────────────────────────────────────────────────────────────────
// Groq Cloud API client  —  OpenAI-compatible REST endpoint
// Model: llama-3.3-70b-versatile
// Base URL: https://api.groq.com/openai/v1
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const MODEL = 'llama-3.3-70b-versatile';

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('Missing GROQ_API_KEY – add it to .env.local');
  return key;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProjectIdea {
  id: string;
  title: string;
  description: string;
  courses: string[];
  reasoning?: {
    skillMatches: string[];       // which of the student's skills this leverages
    innovationFactor: string;     // what makes it non-trivial / innovative
    problemSolved: string;        // the real-world problem it addresses
  };
}

export interface TimelineDay {
  day: number;          // 1–14
  week: 1 | 2;
  task: string;         // short task name
  deliverable: string;  // what is produced
  course: string;       // primary course tag
  type: 'design' | 'implement' | 'test' | 'deploy' | 'research';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Hard timeout wrapper so a hanging request never freezes the UI */
function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timed out after ${ms / 1000} seconds. Please try again.`)),
        ms
      )
    ),
  ]);
}

/** Classify a fetch error into a user-friendly message */
function humaniseError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('Unauthorized')) {
    return new Error('Invalid API key. Please check GROQ_API_KEY in your .env.local file.');
  }
  if (msg.includes('429') || msg.includes('rate_limit')) {
    return new Error('Rate limit reached. Groq free tier allows ~30 requests/min. Please wait a moment and try again.');
  }
  if (msg.includes('timed out')) return err as Error;
  return new Error(`Generation failed: ${msg.slice(0, 200)}`);
}

/** Make a Groq chat-completions request */
async function groqRequest(body: object): Promise<Response> {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  return res;
}

// ─── Course-Specific Guidance ─────────────────────────────────────────────────

/**
 * Returns domain-specific instructions injected into the AI prompt
 * based on which courses the student selected.
 */
function getCourseGuidance(courses: string[]): string {
  const guidance: string[] = [];
  const c = courses.join(' ').toLowerCase();

  if (c.includes('neural') || c.includes('nn')) {
    guidance.push('- Neural Networks selected: strongly bias ideas toward deep learning architectures (CNNs, RNNs, Transformers, GANs, autoencoders). At least one idea MUST involve training a model.');
  }
  if (c.includes('machine learning') || c.includes('ml')) {
    guidance.push('- Machine Learning selected: include ideas using classification, regression, clustering, or reinforcement learning with real datasets (Kaggle-style problems). Emphasize model evaluation metrics.');
  }
  if (c.includes('knowledge') || c.includes('kbs')) {
    guidance.push('- Knowledge Based Systems selected: include ideas featuring expert systems, ontologies, rule engines, semantic reasoning, or explainable AI (XAI). The system should demonstrate transparent decision-making.');
  }
  if (c.includes('cloud') || c.includes('cc')) {
    guidance.push('- Cloud Computing selected: include ideas using serverless architectures, containerization (Docker/K8s), auto-scaling, or multi-cloud strategies. Emphasize deployment and cost-efficiency.');
  }
  if (c.includes('optim') || c.includes('ot')) {
    guidance.push('- Optimization Techniques selected: include ideas that solve a clear optimization problem — scheduling, routing, resource allocation — using heuristics (GA, PSO, simulated annealing) or exact methods (LP, ILP).');
  }
  if (c.includes('database') || c.includes('ad')) {
    guidance.push('- Advanced Databases selected: include ideas that go beyond relational SQL — graph databases (Neo4j), time-series DBs (InfluxDB), vector databases for embeddings, or distributed NoSQL systems.');
  }
  if (c.includes('systems design') || c.includes('sda')) {
    guidance.push('- Systems Design & Analysis selected: include ideas with clear system diagrams, scalability concerns, event-driven architecture, microservices decomposition, or real-time data pipelines.');
  }

  if (guidance.length === 0) return '';
  return `\nCOURSE-SPECIFIC REQUIREMENTS — you MUST follow these:\n${guidance.join('\n')}`;
}

// ─── Parse ideas defensively ──────────────────────────────────────────────────

function parseIdeasJson(raw: string): ProjectIdea[] {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed as ProjectIdea[];
  const inner =
    parsed.ideas ?? parsed.projects ?? parsed.data ?? parsed.results ?? Object.values(parsed)[0];
  if (Array.isArray(inner)) return inner as ProjectIdea[];
  throw new Error('Unexpected JSON shape from model');
}

// ─── generateIdeas ────────────────────────────────────────────────────────────

/**
 * Generate 3 innovative project ideas using llama-3.3-70b-versatile.
 * Uses JSON mode for reliable structured output.
 * Auto-retries once if the JSON cannot be parsed.
 */
export const generateIdeas = async (
  courses: string[],
  interests: string,
  strengths: string,
  lang: 'en' | 'ar',
  kbContext: string = ''
): Promise<ProjectIdea[]> => {
  const languageInstruction = 'You MUST respond entirely in English.';
  const courseGuidance = getCourseGuidance(courses);

  const systemPrompt = `${languageInstruction}

You are an elite academic advisor at New Mansoura University (NMU), specializing in AI & Computer Science graduation projects.

YOUR MISSION: Generate exactly 3 innovative, challenging, and technically deep project ideas that would impress a thesis committee.

REASONING APPROACH — think step-by-step before answering:
1. First, identify the intersection between the student's courses, interests, and strengths.
2. Then, brainstorm ideas that combine AT LEAST TWO academic domains in a non-obvious, creative way.
3. For each idea, ensure it has real-world impact and technical depth — NOT surface-level CRUD apps.
4. Each idea must be feasible for a semester-long project by a team of 2-4 students.
${courseGuidance}
TARGET COURSES at NMU include: Knowledge Based Systems, Cloud Computing, Optimization, Neural Networks, Advanced Databases, Machine Learning, and Systems Design.

QUALITY BAR — each idea should be at the level of:
- "An intelligent load distribution system using predictive ML to reduce carbon emissions in data centers" (Cloud + ML + Optimization)
- "A federated learning framework for medical diagnosis that preserves patient privacy" (Neural Networks + Systems Design + Knowledge Based)

Return ONLY a valid JSON object with a key "ideas" containing an array of 3 objects.
Each object must have:
- id: short unique string
- title: string
- description: 2-3 sentences explaining the technical approach
- courses: array of relevant course names
- reasoning: object with:
  - skillMatches: array of 2-4 student skills this idea directly uses
  - innovationFactor: one sentence on what makes this non-trivial
  - problemSolved: one sentence on the real-world problem it solves
No markdown, no extra text — pure JSON only.`;

  const userPrompt = `Target Courses: ${courses.join(', ')}
Student Interests: ${interests}
Technical Strengths: ${strengths}
${kbContext ? `\nAdditional Context:\n${kbContext}` : ''}

Generate exactly 3 innovative project ideas as JSON.`;

  const makeRequest = async (extraPrefix = '') => {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt + extraPrefix },
    ];
    const res = await withTimeout(
      groqRequest({
        model: MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2048,
      })
    );
    const data = await res.json();
    return (data.choices?.[0]?.message?.content?.trim() ?? '[]') as string;
  };

  let raw = '';
  try {
    raw = await makeRequest();
  } catch (err) {
    throw humaniseError(err);
  }

  // First parse attempt
  try {
    return parseIdeasJson(raw);
  } catch {
    // ── Auto-retry once with a corrective note ──
    try {
      raw = await makeRequest(
        '\n\n[IMPORTANT] Your previous response was not valid JSON. Return ONLY the JSON object with the "ideas" key. No markdown, no explanations.'
      );
      return parseIdeasJson(raw);
    } catch {
      throw new Error(`Could not parse AI response after retry. Raw: ${raw.slice(0, 300)}`);
    }
  }
};

// ─── generateIdeasStream ──────────────────────────────────────────────────────

/**
 * Stream project ideas one-by-one as they're generated.
 * Calls `onIdea` each time a complete idea JSON object is parsed from the stream.
 */
export const generateIdeasStream = async (
  courses: string[],
  interests: string,
  strengths: string,
  lang: 'en' | 'ar',
  kbContext: string = '',
  onIdea: (idea: ProjectIdea, index: number) => void
): Promise<void> => {
  const languageInstruction = 'You MUST respond entirely in English.';
  const courseGuidance = getCourseGuidance(courses);

  const systemPrompt = `${languageInstruction}

You are an elite academic advisor at New Mansoura University (NMU), specializing in AI & Computer Science graduation projects.

Generate exactly 3 innovative project ideas. Output a JSON array of exactly 3 objects.
${courseGuidance}
Each object MUST have: id (string), title (string), description (2-3 sentences), courses (string[]), reasoning ({skillMatches: string[], innovationFactor: string, problemSolved: string}).
Output ONLY a raw JSON array. No markdown, no wrapper keys, no extra text. Start directly with [ and end with ].`;

  const userPrompt = `Target Courses: ${courses.join(', ')}
Student Interests: ${interests}
Technical Strengths: ${strengths}
${kbContext ? `\nAdditional Context:\n${kbContext}` : ''}

Generate exactly 3 innovative project ideas as a JSON array.`;

  let res: Response;
  try {
    res = await withTimeout(
      groqRequest({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      })
    );
  } catch (err) {
    throw humaniseError(err);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream available.');

  const decoder = new TextDecoder();
  let buffer = '';        // SSE line buffer
  let json = '';          // accumulated JSON text
  let ideaIndex = 0;
  let braceDepth = 0;
  let inString = false;
  let escape = false;
  let objectStart = -1;

  const tryParseIdea = (candidate: string): ProjectIdea | null => {
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.title === 'string') return obj as ProjectIdea;
    } catch { /* not ready yet */ }
    return null;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const chunk = JSON.parse(trimmed.slice(6));
        const text: string = chunk.choices?.[0]?.delta?.content ?? '';
        if (!text) continue;

        json += text;

        // Walk through new characters tracking JSON depth
        for (let ci = json.length - text.length; ci < json.length; ci++) {
          const ch = json[ci];

          if (escape) { escape = false; continue; }
          if (ch === '\\' && inString) { escape = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;

          if (ch === '{') {
            if (braceDepth === 0) objectStart = ci;
            braceDepth++;
          } else if (ch === '}') {
            braceDepth--;
            if (braceDepth === 0 && objectStart !== -1 && ideaIndex < 3) {
              const candidate = json.slice(objectStart, ci + 1);
              const idea = tryParseIdea(candidate);
              if (idea) {
                if (!idea.id) idea.id = `idea-${ideaIndex}`;
                onIdea(idea, ideaIndex);
                ideaIndex++;
              }
              objectStart = -1;
            }
          }
        }
      } catch { /* malformed SSE line — skip */ }
    }
  }

  // If streaming didn't yield 3 ideas (e.g. model output a single JSON object),
  // try to parse the full accumulated JSON as fallback
  if (ideaIndex < 3) {
    try {
      const parsed = JSON.parse(json);
      const arr: ProjectIdea[] = Array.isArray(parsed)
        ? parsed
        : (parsed.ideas ?? parsed.projects ?? Object.values(parsed)[0] as ProjectIdea[] ?? []);
      for (let i = ideaIndex; i < arr.length && i < 3; i++) {
        onIdea(arr[i], i);
      }
    } catch { /* give up silently */ }
  }
};

// ─── generatePlanStream ───────────────────────────────────────────────────────

/**
 * Stream a comprehensive implementation plan using llama-3.3-70b-versatile.
 */
export const generatePlanStream = async (
  idea: ProjectIdea,
  lang: 'en' | 'ar',
  onChunk: (text: string) => void
): Promise<void> => {
  const languageInstruction = 'You MUST respond entirely in English.';

  const systemPrompt = `${languageInstruction}

You are an elite academic advisor at New Mansoura University (NMU), specializing in AI & CS graduation projects.

REASONING APPROACH — think deeply and step-by-step:
1. Analyse the project idea from multiple angles: technical feasibility, academic merit, innovation factor.
2. Design a realistic architecture using industry-standard tools and frameworks.
3. Break the project into actionable phases that a student team can follow week-by-week.
4. Anticipate technical challenges and provide concrete solutions, not generic advice.

Your implementation plans should be at the quality level of a senior engineer's technical design document.
Do NOT wrap your response in a markdown code block (i.e. do not use \`\`\`markdown at the start). Start immediately with the text.`;

  const userPrompt = `Create a comprehensive, step-by-step implementation plan for the following project:

Title: ${idea.title}
Description: ${idea.description}
Relevant Courses: ${idea.courses.join(', ')}

The plan MUST include these sections:

## 1. System Architecture & Tech Stack
- Recommend specific frameworks, libraries, cloud services, and databases.
- Include an architecture overview (describe components and data flow).

## 2. Step-by-Step Milestones
- Break the project into 4-6 logical phases (e.g., Phase 1: Data gathering & preprocessing, Phase 2: Model architecture & training, Phase 3: Backend API, Phase 4: Frontend & integration, Phase 5: Testing & deployment).
- Each phase should have clear deliverables and estimated duration.

## 3. Course Integration
- Explicitly state how this project fulfils each relevant course requirement.
- Map specific project components to course learning outcomes.

## 4. Potential Challenges & Solutions
- Identify 3-5 technical hurdles and provide concrete mitigation strategies.

## 5. Innovation & Impact
- Explain what makes this project stand out from typical student projects.
- Describe potential real-world applications.

Format the response in clear, rich Markdown with headers, bullet points, and code snippets where helpful.`;

  let res: Response;
  try {
    res = await withTimeout(
      groqRequest({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      60000 // plans can be long — give 60 s
    );
  } catch (err) {
    throw humaniseError(err);
  }

  // Process the SSE stream (OpenAI-compatible format)
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream available.');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta;
        if (delta?.content) {
          onChunk(delta.content);
        }
      } catch {
        // Malformed SSE line — skip silently
      }
    }
  }
};

// ─── generateTimeline ─────────────────────────────────────────────────────────

/**
 * Generate a 14-day (2-week) implementation timeline using AI.
 * Returns structured day-by-day task objects for the Gantt chart.
 */
export const generateTimeline = async (
  idea: ProjectIdea,
  plan: string
): Promise<TimelineDay[]> => {
  const systemPrompt = `You are a senior software engineering project manager.
Your task: create a realistic 14-day sprint plan for a student project, assuming students will use AI coding assistants (Copilot, ChatGPT, Cursor) to accelerate development significantly.

Rules:
- Exactly 14 days (Day 1 to Day 14)
- Days 1-7 = Week 1, Days 8-14 = Week 2
- Each day has exactly ONE primary task
- Tasks should be specific and actionable (not generic)
- Deliverables should be concrete artifacts ("working REST API", "trained model with >80% accuracy")
- Task types: "research", "design", "implement", "test", "deploy"
- The "course" field = the primary academic course this day's task maps to (short name, e.g. "ML", "Cloud", "DB", "NN", "KBS", "Optim", "SDA")

Return ONLY valid JSON — an array of exactly 14 objects. No markdown, no extra text.
Each object: { day: number, week: 1|2, task: string, deliverable: string, course: string, type: string }`;

  const userPrompt = `Project: ${idea.title}
Description: ${idea.description}
Courses: ${idea.courses.join(', ')}

Summary of the implementation plan:
${plan.slice(0, 1500)}

Generate a 14-day timeline JSON array.`;

  let raw = '';
  try {
    const res = await withTimeout(
      groqRequest({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 2048,
      }),
      40000
    );
    const data = await res.json();
    raw = data.choices?.[0]?.message?.content?.trim() ?? '[]';
  } catch (err) {
    throw humaniseError(err);
  }

  try {
    const parsed = JSON.parse(raw);
    const arr: TimelineDay[] = Array.isArray(parsed)
      ? parsed
      : (parsed.days ?? parsed.timeline ?? parsed.schedule ?? Object.values(parsed)[0] as TimelineDay[]);
    if (!Array.isArray(arr)) throw new Error('No array found');
    return arr.slice(0, 14);
  } catch {
    throw new Error('Could not parse timeline from AI response.');
  }
};
