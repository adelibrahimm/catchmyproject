# Catch My Project

An intelligent platform designed for Computer Science students at New Mansoura University (NMU) to discover innovative, AI-powered graduation project ideas tailored to their coursework, interests, and strengths.

## Features ✨

- **Smart Idea Generation**: Uses advanced AI (Groq + Llama 3) to generate complex, multi-discplinary project ideas.
- **Course Integration**: Tailors projects specifically to NMU courses like: Knowledge Based Systems, Machine Learning, Neural Networks, Cloud Computing, Optimization Techniques, and more.
- **Detailed Step-by-Step Plans**: Streams a comprehensive implementation plan for your chosen project, breaking it down into an architecture design, actionable milestones, and potential challenges.
- **Interactive Timeline**: Generates a 14-day Gantt-style timeline to help your team hit the ground running.
- **Bilingual Support**: Full support for English and Arabic.
- **Responsive UI**: A modern, dark-mode accessible UI built with React, Vite, and Tailwind CSS.

## Tech Stack 🛠

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v7)
- **Animations / Interactions**: Framer Motion, Lucide React
- **AI Integration**: Groq API (`llama-3.3-70b-versatile` endpoint)

## Getting Started 🚀

### Prerequisites
- Node.js (v18 or higher recommended)
- A [Groq API Key](https://console.groq.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/adelibrahimm/catchmyproject.git
   cd catchmyproject
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   The app will be accessible at `http://localhost:3000`.

### Building for Production
To create an optimized production build:
```bash
npm run build
```
This will compile the assets into the `dist/` directory, ready to be deployed.

## Deployment 🌐
This project is configured to be seamlessly deployed on [Vercel](https://vercel.com/).
All client-side routing is handled via the included `vercel.json` file.

## Acknowledgments
Built to assist NMU Computer Science students in conceptualizing world-class graduation projects and standing out to thesis committees.
