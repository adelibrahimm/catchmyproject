-- ============================================================
-- NMU AI Advisor — Database Schema
-- Course: Advanced Databases
-- ============================================================
-- This schema defines a normalized relational database structure
-- for the NMU AI Advisor platform. It stores students, skills,
-- interests, generated projects, courses, and recommendations.
-- ============================================================

-- ── Students Table ─────────────────────────────────────────

CREATE TABLE students (
    student_id      INT PRIMARY KEY AUTO_INCREMENT,
    university_id   VARCHAR(20) UNIQUE NOT NULL,     -- e.g. "NMU-2024-001"
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    department      VARCHAR(100) DEFAULT 'AI & Computer Science',
    academic_year   INT CHECK (academic_year BETWEEN 1 AND 5),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_students_email (email),
    INDEX idx_students_dept (department)
);

-- ── Skills Table ───────────────────────────────────────────

CREATE TABLE skills (
    skill_id        INT PRIMARY KEY AUTO_INCREMENT,
    skill_key       VARCHAR(50) UNIQUE NOT NULL,     -- e.g. "python", "react"
    name_en         VARCHAR(100) NOT NULL,
    name_ar         VARCHAR(100) NOT NULL,
    category        ENUM('language', 'framework', 'ml_ai', 'database', 'cloud', 'mobile', 'other') NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_skills_key (skill_key),
    INDEX idx_skills_category (category)
);

-- ── Interests Table ────────────────────────────────────────

CREATE TABLE interests (
    interest_id     INT PRIMARY KEY AUTO_INCREMENT,
    interest_key    VARCHAR(50) UNIQUE NOT NULL,      -- e.g. "healthcare", "finance"
    name_en         VARCHAR(100) NOT NULL,
    name_ar         VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_interests_key (interest_key)
);

-- ── Courses Table ──────────────────────────────────────────

CREATE TABLE courses (
    course_id       INT PRIMARY KEY AUTO_INCREMENT,
    course_code     VARCHAR(20) UNIQUE NOT NULL,      -- e.g. "CS401"
    name_en         VARCHAR(100) NOT NULL,
    name_ar         VARCHAR(200) NOT NULL,
    description     TEXT,
    credit_hours    INT DEFAULT 3,
    semester        VARCHAR(20),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_courses_code (course_code)
);

-- ── Student-Skills Junction (Many-to-Many) ─────────────────

CREATE TABLE student_skills (
    student_id      INT NOT NULL,
    skill_id        INT NOT NULL,
    proficiency     ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
    source          ENUM('manual', 'cv_extracted') DEFAULT 'manual',   -- ML module source
    confidence      DECIMAL(3,2) DEFAULT 1.00,                        -- ML confidence score
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (student_id, skill_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id)   REFERENCES skills(skill_id)     ON DELETE CASCADE,

    INDEX idx_ss_skill (skill_id),
    INDEX idx_ss_source (source)
);

-- ── Student-Interests Junction (Many-to-Many) ──────────────

CREATE TABLE student_interests (
    student_id      INT NOT NULL,
    interest_id     INT NOT NULL,
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (student_id, interest_id),
    FOREIGN KEY (student_id)  REFERENCES students(student_id)  ON DELETE CASCADE,
    FOREIGN KEY (interest_id) REFERENCES interests(interest_id) ON DELETE CASCADE
);

-- ── Projects Table ─────────────────────────────────────────

CREATE TABLE projects (
    project_id      INT PRIMARY KEY AUTO_INCREMENT,
    gemini_id       VARCHAR(50),                      -- ID from Gemini response
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    implementation_plan TEXT,                          -- Stored plan markdown
    is_optimal      BOOLEAN DEFAULT FALSE,            -- Optimization result
    generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_projects_gemini (gemini_id)
);

-- ── Project-Courses Junction (Many-to-Many) ────────────────

CREATE TABLE project_courses (
    project_id      INT NOT NULL,
    course_id       INT NOT NULL,

    PRIMARY KEY (project_id, course_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(course_id)   ON DELETE CASCADE,

    INDEX idx_pc_course (course_id)
);

-- ── Recommendations Table (stores full generation sessions) ──

CREATE TABLE recommendations (
    recommendation_id  INT PRIMARY KEY AUTO_INCREMENT,
    student_id         INT NOT NULL,
    session_token      VARCHAR(100),                  -- Groups a single generation session
    kb_context         TEXT,                          -- Knowledge Base inference context
    selected_project_id INT,                          -- Which project the student chose
    optimization_result JSON,                         -- Optimization result data
    language           ENUM('en', 'ar') DEFAULT 'en',
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)         REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (selected_project_id) REFERENCES projects(project_id) ON DELETE SET NULL,

    INDEX idx_rec_student (student_id),
    INDEX idx_rec_session (session_token),
    INDEX idx_rec_created (created_at)
);

-- ── Recommendation-Projects Junction ────────────────────────

CREATE TABLE recommendation_projects (
    recommendation_id  INT NOT NULL,
    project_id         INT NOT NULL,
    rank_order         INT DEFAULT 0,                 -- Order in which ideas were presented

    PRIMARY KEY (recommendation_id, project_id),
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(recommendation_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id)        REFERENCES projects(project_id)               ON DELETE CASCADE
);

-- ── Seed Data: Courses ──────────────────────────────────────

INSERT INTO courses (course_code, name_en, name_ar) VALUES
('CS401', 'Knowledge Based Systems',    'النظم القائمة على المعرفة'),
('CS402', 'Machine Learning',           'تعلم الآلة'),
('CS403', 'Neural Networks',            'الشبكات العصبية'),
('CS404', 'Optimization Techniques',    'تقنيات التحسين'),
('CS405', 'Cloud Computing',            'الحوسبة السحابية'),
('CS406', 'Advanced Databases',         'قواعد البيانات المتقدمة'),
('CS407', 'Systems Design and Analysis','تصميم وتحليل النظم');
