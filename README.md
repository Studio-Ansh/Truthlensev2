# Truthlens Verify 🔍

An advanced, multi-modal neural verification platform engineered to analyze visual authenticity, detect deepfakes, trace cryptographic lineage logs, and verify factual claims in real-time. Powered by custom PyTorch forensics pipelines, Google Firestore, and state-of-the-art GenAI models (Gemini 3.5 Flash).

---

## 🗂️ MASTER CODEBASE SETS INDEX

To make this complex multi-modal platform extremely clean and easy to navigate, the codebase is strictly organized into **four logical sets** directly within the file explorer. Refer to this index to locate and manage components:

```
📦 Repository Root
 ├── 📝 README.md                           <-- Master Index & Documentation (Top Level)
 │
 ├── 🎨 [SET 1] FRONTEND (SET_1_FRONTEND/)
 │    └── src/
 │         ├── App.tsx                      <-- Primary View Controller, Theme Layout & Routing (Single Main File)
 │         ├── main.tsx                     <-- Vite entrypoint & render mount
 │         ├── index.css                    <-- Tailwind CSS v4 variables & custom animations
 │         ├── components/                  <-- Interactive HUD Widgets & Visualizers
 │         │    ├── TelemetryPlayground.tsx
 │         │    ├── LoginScreen.tsx
 │         │    ├── InteractivePhysicsLogo.tsx
 │         │    ├── BackgroundGraphics.tsx
 │         │    ├── AIPipelineGraph.tsx
 │         │    └── ThreeQuestionCards.tsx
 │         └── lib/
 │              ├── api.ts                  <-- Frontend API proxy caller
 │              └── firebase.ts             <-- Client-side Firebase/Firestore initializer
 │
 ├── ⚙️ [SET 2] BACKEND (SET_2_BACKEND/)
 │    ├── server.ts                         <-- Centralized API Router, Heuristic Engines & File Ingress (Single File)
 │    ├── train.py                          <-- Neural network training harness
 │    ├── evaluate.py                       <-- Pipeline validation metrics harness
 │    ├── data/                             <-- Curated datasets and scanner archives
 │    ├── image_model/                      <-- Image forensic CNN pipeline files
 │    ├── video_model/                      <-- Video deepfake detection pipeline files
 │    ├── models/                           <-- PyTorch model weight file registries
 │    ├── firebase.json                     <-- Firebase emulator and resource configurations
 │    ├── firestore.rules                   <-- Firestore read/write collection security rules
 │    ├── DRAFT_firestore.rules             <-- Draft security rule reference
 │    ├── firebase-blueprint.json           <-- Security and schema specifications
 │    └── firebase-applet-config.json       <-- Applet database connection credentials
 │
 ├── 🚀 [SET 3] DEPLOYMENT CONFIGURATIONS (At Root)
 │    ├── package.json                      <-- Build manifest, dependency list, and scripts
 │    ├── tsconfig.json                     <-- TypeScript compiler configurations
 │    ├── vite.config.ts                    <-- Frontend asset compilation configurations
 │    └── vercel.json                       <-- Serverless deployment and route redirect rules
 │
 └── 🐙 [SET 4] GIT & ENVIRONMENT IGNORES (At Root)
      ├── .gitignore                        <-- Global Git ignore criteria
      └── .vercelignore                     <-- Production build file exclusion filters
```

### Detailed Sets Overview:

1. **🎨 Frontend Set** (`SET_1_FRONTEND/`):
   All UI elements, custom interactive physics animations, and forensic metrics graphs are written in modular React 19 + Tailwind CSS.
   * *Central Command*: `SET_1_FRONTEND/src/App.tsx` controls the overall HUD view-manager, state machine, and section-by-section layout logic.

2. **⚙️ Backend Set** (`SET_2_BACKEND/`):
   Consolidated into a robust Express server. Handles file ingestion buffers, runs local python forensics subprocesses, and securely proxies request pipelines to the Gemini 3.5 Flash API. This folder also houses all backend Firebase database connection secrets, security rulesets, and blueprints.
   * *Central Command*: All backend logic resides cleanly within `SET_2_BACKEND/server.ts` for simple, offline-capable code execution.

3. **🚀 Deployment Set** (Project Root):
   Manages production bundling (compiling backend code to a self-contained `dist/server.cjs` with `esbuild` and bundling the frontend static assets via `vite build`), environment routing, and Firebase integration.

4. **🐙 Git / Ignore Set** (Project Root):
   Defines standard exclusions to prevent heavy ML weight files (`*.pt`, model checkpoints) and sensitive local environment files (`.env`) from leaking into public repository hosts or deployment instances.

---

## 🌟 Core System Capabilities

### 1. Multi-Modal Forensics Pipelines
- **Visual Authentication (Images)**: High-resolution texture and frequency-domain check utilizing a hybrid **EfficientNetB4** & **ViT (Vision Transformer)** neural architecture. Detects generative infills, diffusion boundary anomalies, lighting mismatches, and edge-refraction artifacts.
- **Spatio-Temporal Analysis (Videos)**: Frame-by-frame analysis with a **ResNeXt50-Bi-LSTM** sequence model. Tracks micro-expressions, lip-sync alignment, and temporal jitter to detect modern face-swaps.
- **Acoustic Fingerprinting (Audio)**: Analyzes voice pitch contours, spectral integrity, and phase coherence to flag voice-cloning networks or neural vocoder synthesis.
- **Cognitive Fallback Engine**: Standardized heuristic evaluation filters and rule-based verification when remote API networks or pipeline scripts are disconnected.

### 2. Real-Time Fact & News Verification
- **Aggregated Dataset Scanning**: Cross-references user queries instantly against high-precision curated rumor datasets (`TheNewsAPI`, `Currents`, `Mediastack`, `GNews`, `NewsData`).
- **Semantic Search Grounding**: Leverages Google Search Grounding through Gemini to dynamically parse context integrity and assign reliability ratings.
- **Domain Monitoring**: Dynamically updates risk profiles for newly flagged sources in a centralized host database.

### 3. Verification Log & User Telemetry
- **Cloud-Synced History**: Secure, lightweight user session tracking with persistent verification histories.
- **Durable Storage**: Utilizes Google Cloud Firestore for tracking scanning histories, confidence percentages, threat categories, and generated report links.
- **Authenticity Audit Logs**: Renders full JSON metadata tracing backbones used, confidence tiers, and red flag lists.

### 4. Interactive Immersive User Interface
- **Modern Spatial Design**: A dark, high-contrast visual theme designed for heavy forensics monitoring.
- **AI Pipeline Visualizer**: Renders interactive canvas nodes showing computational layers (Inference Engine, Cognitive Grounding, Neural Decoders).
- **Physics-Informed Aesthetics**: Subtle, high-performance web animations, interactive canvas graphics, and responsive particle effects driven by modern physics math.

---

## 🛠️ Architecture & Tech Stack

### Frontend Layer
- **Framework**: React 19 + TypeScript (strictly typed)
- **Styling**: Tailwind CSS v4 (offering rapid fluid layout engines and deep system styling variables)
- **Motion**: Framer Motion v12 (`motion/react`) for smooth page transitions and responsive user feedback loops
- **Icons**: Lucide React for consistent display indicators

### Backend Layer
- **Runtime**: Node.js + Express + `tsx` for TypeScript execution
- **File Ingress**: Multer (configured with 100MB buffer memory limit)
- **Deep Learning Pipelines**: Local Python3 scripts running PyTorch inference engines to evaluate visual artifacts
- **AI Orchestration**: Official `@google/genai` TypeScript SDK (utilizing Gemini 3.5 Flash for advanced visual forensics and real-time grounding)

### Persistent Services
- **Database**: Cloud Firestore (NoSQL Document database representing user records, monitored domains, and telemetry details)
- **Authentication**: Firebase Auth integration (custom username lookup mappings for smooth onboarding)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Python 3.10+** (if executing native PyTorch verification scripts locally)

### Installation

1. Install project dependencies:
   ```bash
   npm install
   ```

2. (Optional) Install local PyTorch and requirements for physical script analysis:
   ```bash
   pip install -r video_model/requirements.txt
   ```

### Environment Configuration

Configure your environment variables by copying `.env.example` to `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Ensure a compliant `/firebase-applet-config.json` is configured in the root directory:
```json
{
  "projectId": "studio-2293577197-e9247",
  "appId": "1:1086136839374:web:db599e1f8e80564d42b49f",
  "authDomain": "studio-2293577197-e9247.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "studio-2293577197-e9247.firebasestorage.app",
  "messagingSenderId": "1086136839374"
}
```

---

## 💻 Development & Deployment Commands

- **Start Development Server**: Runs the Express backend server on Port `3000` with hot-reloaded dev assets served through Vite:
  ```bash
  npm run dev
  ```

- **Build Production Bundle**: Compiles TypeScript backend files using `esbuild` into a unified CommonJS target `dist/server.cjs` and processes frontend static assets into `dist/`:
  ```bash
  npm run build
  ```

- **Run Production App**: Launches the standalone, compiled server with production environment bindings:
  ```bash
  npm run start
  ```

- **Verify Type Safety & Integrity**: Run the linter to ensure syntax compliance:
  ```bash
  npm run lint
  ```

---

## 🔒 Security & Data Isolation

- **Server-Side API Proxies**: All API credentials and model keys remain isolated on the Express server (`server.ts`). Browser clients communicate solely via clean backend routes (`/api/*`), completely safeguarding system keys from devtools inspector exposure.
- **Firestore Security Rules**: Security guidelines restrict and secure read/write paths, maintaining robust data isolation for individual operators.

---

*Engineered with precision for the Truthlens Open Media Initiative.*
