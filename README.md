# Moonwalk
MOONWALK: Model-agnostic Open Negotiated Workflow by Agentic Mediators Looping on Key References and Reviews to Explore Animator-Supervisor Reflection in Pre-Production

**MOONWALK** is an agentic pre-production review system for 2D animation and VFX. It implements IR4IA (Inspiring Reflection for Intention Alignment) across three stages — Intention Reflection, Artwork Reflection, and Feedback Reflection — through a multi-agent MLLM pipeline and a seven-panel web interface.

---

## Repository Structure

```
.
├── environment.yml
├── .gitignore
├── LICENSE
├── README.md
│
├── backend/
│   ├── requirements.txt
│   ├── Dataset/
│   ├── scripts/
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── shared.py
│       ├── .env                  # API keys (see setup below)
│       ├── agents/
│       ├── routes/
│       │   ├── analysis.py
│       │   ├── suggestion.py
│       │   ├── feedback.py
│       │   ├── spec.py
│       │   ├── canvas.py
│       │   └── auth.py
│       ├── prompt/
│       ├── utils/
│       ├── output/
│       └── uploads/              # Created automatically on first run
│
└── web-interface-design/
    ├── app/
    ├── components/
    ├── public/
    ├── .env.local                # API URL (see setup below)
    ├── API.yaml
    ├── package.json
    └── tsconfig.json
```

---

## Prerequisites

- [Conda](https://docs.conda.io/en/latest/) (for the backend environment)
- [Node.js](https://nodejs.org/) v18 or later (for the frontend)
- API keys for **OpenAI**, **Anthropic (Claude)**, and **Google Gemini**

---

## Backend Setup

### 1. Create and activate the Conda environment

From the **repository root**:

```bash
conda env create -f environment.yml
conda activate mw
```

### 2. Configure environment variables

Create `backend/app/.env`:

```properties
FASTAPI_HOST=127.0.0.1
FASTAPI_PORT=5001

ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

APP_URL=http://localhost:3001
```

### 3. Start the backend

```bash
cd backend
conda activate mw
python -m app.main
```

The backend runs at **`http://127.0.0.1:5001`**.  
API documentation: **`http://127.0.0.1:5001/docs`**

---

## Frontend Setup

### 1. Install dependencies

```bash
cd web-interface-design
npm install
```

### 2. Configure the API URL

Create `web-interface-design/.env.local`:

```properties
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
```

### 3. Start the frontend

```bash
cd web-interface-design
npm run dev
```

The frontend runs at **`http://localhost:3001`**.

---

## Running Both Services

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
conda activate mw
python -m app.main
```

**Terminal 2 — Frontend:**
```bash
cd web-interface-design
npm run dev
```

Then open **`http://localhost:3001`** in your browser.

---

## First Use

1. Open `http://localhost:3001` and click **Sign Up** to create an account.  
2. Sign in with your credentials.
3. Navigate through the pipeline panels in order:
   Senior-Artists
   - **C01 Kickoff** — Fill in the project brief and Supervisor Spec to align project contect and creative intention
   - **C02 Reference Hub** — Upload and annotate visual references to set up the creative foundation of project art and design directions
   Junior-Artists
   - **C03 Artist Reflection** — Record and reflect the creative intent before submission
   - **C04 Upload & Analyze** — Upload artworks and run multi-agent analysis for self-reflection
   - **C05 Compare**  — Compare artworks against references
   Senior-Artists
   - **C06 QA** — supervisor/senior artist review artworks/references and annotate on canvas
   - **C07 Governance** — Summarize three-party (Junior-Artists/Senior-Artists/Agents) feedback into a final revision checklist

---

## Notes

- Uploaded files and user data are stored locally under `backend/app/uploads/` and `backend/app/output/`. These directories are created automatically on first run.
- The multi-agent analysis pipeline requires valid API keys for all three providers (OpenAI, Anthropic, Gemini). If a provider is unavailable, the system falls back gracefully and displays a partial result.
- Canvas annotations are burned directly into image pixels and versioned per session, supporting undo.
