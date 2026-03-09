# Use Case Diagrams

## Course: Systems Design and Analysis

### Primary Actors

1. **Student** — Primary user of the platform
2. **Gemini AI** — External AI service for idea/plan generation
3. **Knowledge Base** — Internal rule engine

---

### Use Case 1: Generate Project Ideas

```
Student ──────────────────────────────────────┐
  │                                           │
  ├─► UC1: Select Target Courses              │
  │                                           │
  ├─► UC2: Select Interests/Topics            │
  │                                           │
  ├─► UC3: Select Technical Skills            │
  │     │                                     │
  │     ├─► UC3a: Upload CV (extends UC3)     │
  │     │     └─► ML: Extract skills from PDF │
  │     │                                     │
  │     └─► UC3b: View Skill Domains          │
  │           └─► NN: Classify skill domain   │
  │                                           │
  ├─► UC4: Generate Ideas                     │
  │     ├─► KB: Run inference engine           │
  │     └─► Gemini: Generate project ideas    │
  │                                           │
  ├─► UC5: Optimize Project Selection         │
  │     └─► Optimizer: Greedy set cover       │
  │                                           │
  └─► UC6: Generate Implementation Plan       │
        └─► Gemini: Stream detailed plan      │
                                              │
──────────────────────────────────────────────┘
```

### Use Case 2: Export Plan

```
Student
  │
  └─► UC7: Export Plan as PDF
        └─► html2pdf: Convert markdown to PDF
```

### Use Case 3: Language Toggle

```
Student
  │
  └─► UC8: Switch Language (EN ↔ AR)
        └─► i18n: Update all translations
        └─► RTL: Toggle document direction
```

---

### Use Case Descriptions

| UC  | Name | Actor | Precondition | Postcondition |
|-----|------|-------|-------------|---------------|
| UC1 | Select Courses | Student | On Generator page | ≥1 course selected |
| UC2 | Select Interests | Student | UC1 complete | ≥1 interest selected |
| UC3 | Select Skills | Student | UC2 complete | ≥1 skill selected |
| UC3a| Upload CV | Student | On step 3 | Skills auto-populated |
| UC3b| View Domains | Student | On step 3 | Domain badges visible |
| UC4 | Generate Ideas | Student | UC1-UC3 complete | 3 project ideas shown |
| UC5 | Optimize | Student | UC4 complete | Optimal projects highlighted |
| UC6 | Generate Plan | Student | Idea selected | Streamed plan displayed |
| UC7 | Export PDF | Student | Plan generated | PDF downloaded |
| UC8 | Switch Language | Student | Any page | UI translated |
