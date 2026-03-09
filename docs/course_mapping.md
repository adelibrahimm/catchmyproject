# Course Mapping

## How Each Module Maps to a University Course

This document explicitly maps each implemented module in the NMU AI Advisor platform to its corresponding university course.

---

### 1. Knowledge Based Systems

| Item | Details |
|------|---------|
| **Module** | Rule-Based Inference Engine |
| **Files** | `src/lib/knowledgeBase/projectRules.json`, `src/lib/knowledgeBase/ruleEngine.ts` |
| **Concept** | Forward-chaining rule engine that matches facts (student selections) against IF-THEN rules |
| **How it works** | A JSON knowledge base contains rules with conditions (skill + interest) and actions (recommended domain). The inference engine iterates through all rules and fires those whose conditions are met. The aggregated recommendations are injected into the Gemini prompt as additional context. |
| **KBS Concepts Demonstrated** | Knowledge representation (JSON), inference engine (forward chaining), rule matching, fact-action paradigm |

---

### 2. Machine Learning

| Item | Details |
|------|---------|
| **Module** | CV Skill Extraction |
| **Files** | `src/lib/ml/cvParser.ts`, `ml/cv_skill_extractor.ipynb` |
| **Concept** | Text extraction from PDF, text preprocessing, feature extraction, keyword matching with confidence scoring |
| **How it works** | When a student uploads a CV (PDF), the system: (1) extracts raw text using PDF.js, (2) preprocesses the text (normalization, cleaning), (3) matches known skills using keyword/pattern matching with alias support, (4) calculates confidence scores based on frequency. Detected skills auto-populate the selection UI. |
| **ML Concepts Demonstrated** | Text preprocessing pipeline, feature extraction, keyword-based classification, confidence scoring |

---

### 3. Neural Networks

| Item | Details |
|------|---------|
| **Module** | Skill Domain Classifier |
| **Files** | `src/lib/ml/skillClassifier.ts`, `ml/skill_domain_classifier.ipynb` |
| **Concept** | Dense neural network with manual forward pass (no framework needed at runtime) |
| **How it works** | A 2-layer neural network (Input→Dense(16,ReLU)→Dense(5,Softmax)) classifies each skill into one of 5 domains (AI, Web Dev, Cloud, Data Science, Databases). Pre-trained weights are generated based on labeled training data. The forward pass performs actual matrix multiplication and activation functions (ReLU, Softmax) in JavaScript. |
| **NN Concepts Demonstrated** | Network architecture (dense layers), activation functions (ReLU, Softmax), one-hot encoding, forward propagation, weight matrices, classification |

---

### 4. Optimization Techniques

| Item | Details |
|------|---------|
| **Module** | Project Selection Optimizer |
| **Files** | `src/lib/optimization/projectOptimizer.ts` |
| **Concept** | Greedy Set Cover algorithm for minimum project selection |
| **How it works** | Given a list of generated projects (each covering certain courses) and the student's target courses, the algorithm greedily selects the project that covers the most uncovered courses at each step. It repeats until all courses are covered or no more progress can be made. The result shows the optimal subset with coverage percentage. |
| **Optimization Concepts Demonstrated** | Greedy algorithm, set cover problem, objective function (maximize coverage), constraint satisfaction |

---

### 5. Cloud Computing

| Item | Details |
|------|---------|
| **Module** | Cloud Deployment Support |
| **Files** | `Dockerfile`, `docker-compose.yml`, `cloud/deploy.md` |
| **Concept** | Containerization and cloud deployment |
| **How it works** | The project includes a multi-stage Dockerfile (Node.js build + Nginx serve), Docker Compose configuration for local testing, and deployment guides for Vercel, Netlify, and Google Cloud Run. Environment variables (GEMINI_API_KEY) are injected at build time. |
| **Cloud Concepts Demonstrated** | Containerization (Docker), multi-stage builds, environment configuration, static site deployment, CI/CD readiness |

---

### 6. Advanced Databases

| Item | Details |
|------|---------|
| **Module** | Relational Database Schema |
| **Files** | `database/schema.sql` |
| **Concept** | Normalized relational database design |
| **How it works** | A comprehensive SQL schema with 10 tables: Students, Skills, Interests, Courses, Projects, StudentSkills, StudentInterests, ProjectCourses, Recommendations, and RecommendationProjects. Features proper normalization, indexed columns, foreign keys, junction tables for many-to-many relationships, and seed data. |
| **DB Concepts Demonstrated** | Normalization (3NF), indexing, foreign keys, junction tables, referential integrity, ENUM types, auto-increment, cascading deletes |

---

### 7. Systems Design and Analysis

| Item | Details |
|------|---------|
| **Module** | System Documentation |
| **Files** | `docs/system_architecture.md`, `docs/use_cases.md`, `docs/data_flow.md`, `docs/course_mapping.md` |
| **Concept** | System documentation and analysis |
| **How it works** | Comprehensive documentation including system architecture diagrams, use case diagrams with actor descriptions, data flow diagrams for all modules, and this course mapping document. |
| **SDA Concepts Demonstrated** | System architecture diagrams, use case modeling, data flow diagrams, component analysis, requirements traceability |

---

## Summary Matrix

| Course | Module | Integration Point | Runtime |
|--------|--------|--------------------|---------|
| Knowledge Based Systems | Rule Engine | Before Gemini call | Browser |
| Machine Learning | CV Parser | Step 3 (Upload) | Browser |
| Neural Networks | Skill Classifier | Step 3 (Badges) | Browser |
| Optimization Techniques | Project Optimizer | Step 4 (Results) | Browser |
| Cloud Computing | Docker + Deploy | Infrastructure | Build/Deploy |
| Advanced Databases | SQL Schema | Design Artifact | N/A |
| Systems Design & Analysis | Documentation | Documentation | N/A |
