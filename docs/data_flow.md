# Data Flow Description

## Course: Systems Design and Analysis

### Overview

This document describes how data flows through the NMU AI Advisor platform, from student input to AI-generated output.

---

### Flow 1: Project Idea Generation (Main Flow)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌───────────────┐
│ Step 1:  │     │ Step 2:  │     │ Step 3:  │     │ Processing    │
│ Select   │────►│ Select   │────►│ Select   │────►│               │
│ Courses  │     │ Interests│     │ Skills   │     │ ┌───────────┐ │
│          │     │          │     │          │     │ │ KB Engine │ │
│ string[] │     │ string[] │     │ string[] │     │ └─────┬─────┘ │
└──────────┘     └──────────┘     └──────────┘     │       │       │
                                                    │       ▼       │
                                                    │ KB Context    │
                                                    │ (string)      │
                                                    │       │       │
                                                    │       ▼       │
                                                    │ ┌───────────┐ │
                                                    │ │ Gemini    │ │
                                                    │ │ API Call  │ │
                                                    │ └─────┬─────┘ │
                                                    │       │       │
                                                    └───────│───────┘
                                                            │
                                                            ▼
                                                    ┌───────────────┐
                                                    │  Step 4:      │
                                                    │  3 Project    │
                                                    │  Ideas        │
                                                    │  (JSON Array) │
                                                    └───────────────┘
```

### Data Structures

**Input to Gemini:**
```json
{
  "courses": ["Knowledge Based Systems", "Machine Learning"],
  "interests": "Healthcare & Medicine, Education & EdTech",
  "strengths": "Python, TensorFlow, React",
  "kbContext": "[Knowledge Base Recommendations] Recommended Domains: ..."
}
```

**Output from Gemini:**
```json
[
  {
    "id": "proj-1",
    "title": "AI-Powered Medical Diagnosis Assistant",
    "description": "A system that uses...",
    "courses": ["Machine Learning", "Knowledge Based Systems"]
  }
]
```

---

### Flow 2: CV Skill Extraction (ML Module)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ PDF File │────►│ Text Extract │────►│ Preprocess   │────►│ Keyword      │
│ (upload) │     │ (PDF.js)     │     │ (normalize,  │     │ Matching     │
│          │     │              │     │  clean)      │     │ (scoring)    │
└──────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                   │
                                                                   ▼
                                                           ┌──────────────┐
                                                           │ Detected     │
                                                           │ Skills[]     │
                                                           │ + Confidence │
                                                           └──────────────┘
```

---

### Flow 3: Skill Domain Classification (NN Module)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Skill ID │────►│ One-Hot      │────►│ Dense Layer  │────►│ Dense Layer  │
│ (string) │     │ Encoding     │     │ (ReLU)       │     │ (Softmax)    │
│          │     │ [0,0,1,0..]  │     │ 75→16        │     │ 16→5         │
└──────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                   │
                                                                   ▼
                                                           ┌──────────────┐
                                                           │ Domain       │
                                                           │ Probabilities│
                                                           │ [0.1, 0.8...│]
                                                           └──────────────┘
```

---

### Flow 4: Project Optimization

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Generated    │     │ Target       │     │ Greedy       │
│ Projects[]   │────►│ Courses[]    │────►│ Set Cover    │
│ (with their  │     │              │     │ Algorithm    │
│  courses)    │     │              │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ Optimal      │
                                          │ Project Set  │
                                          │ + Coverage % │
                                          └──────────────┘
```

---

### State Management

All state is managed client-side using React `useState` hooks with `localStorage` persistence:

| Key | Data | Persistence |
|-----|------|-------------|
| `nmu_ai_courses` | Selected courses | localStorage |
| `nmu_ai_topics` | Selected interests | localStorage |
| `nmu_ai_skills` | Selected skills | localStorage |
| `nmu_ai_ideas` | Generated ideas | localStorage |
