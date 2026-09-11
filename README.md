# TrustX — Intelligent Identity. Trusted Verification.

TrustX is an **AI-assisted fake identity document screening platform** designed to help analysts identify documents that may require additional verification.

> **Important:** TrustX provides probabilistic fraud-risk assessment. It is not a legal identity authenticator, government verification service, or a replacement for human review. Use synthetic/demo documents during development and testing.

## 🚀 What TrustX Does

TrustX processes an uploaded identity-document image or PDF through a structured screening workflow:

```text
UPLOAD
   ↓
FILE VALIDATION
   ↓
PREPROCESSING
   ↓
OCR / FIELD EXTRACTION
   ↓
DOCUMENT STRUCTURE CHECK
   ↓
IMAGE FORENSICS
   ↓
QR / BARCODE ANALYSIS
   ↓
FIELD & DATE CONSISTENCY
   ↓
AI RISK ENGINE
   ↓
EXPLAINABLE RISK REPORT
   ↓
MANUAL REVIEW
```

The platform combines OCR signals, image-forensic indicators, structural checks and consistency signals into an explainable **0–100 risk score**.

### Risk levels

| Score | Level |
|---:|---|
| 0–25 | LOW |
| 26–60 | MEDIUM |
| 61–80 | HIGH |
| 81–100 | CRITICAL |

## ✨ Key Features

- Enterprise-style cybersecurity dashboard
- AI-assisted document risk screening
- OCR and extracted-field analysis
- Image-forensic risk signals
- Document structure and consistency validation
- QR/barcode consistency signals
- Explainable risk factors
- PostgreSQL-backed screening records
- Screening history APIs
- Review workflow: approve, reject, escalate and re-verification
- Analytics dashboard APIs
- Report data endpoint
- Audit-log data model
- Role-based access model: `ADMIN`, `ANALYST`, `REVIEWER`, `USER`
- Live Operations Center for reviews, analytics and reports
- Demo-safe deterministic analysis for testing without real identity documents
- Security-focused upload validation and file hashing

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Browser        │
                    │ Next.js / React UI  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Next.js API Layer │
                    │  Screening / Review │
                    │ Analytics / Reports │
                    └──────┬────────┬─────┘
                           │        │
                 ┌─────────▼─┐   ┌──▼────────────┐
                 │ PostgreSQL│   │ Python AI Core│
                 │   Drizzle │   │ FastAPI / CV  │
                 └───────────┘   └───────────────┘
```

The intended production architecture can be extended with Redis, a background worker and object storage for asynchronous document processing.

## 🧰 Technology Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Lucide React
- SWR

### Backend / Data

- Next.js Route Handlers
- Node.js / TypeScript
- Drizzle ORM
- PostgreSQL
- `pg`

### AI / Computer Vision

- Python
- FastAPI
- OCR pipeline abstraction
- Image-forensics pipeline abstraction
- Deterministic demo risk model
- Designed for future OpenCV, Pillow, NumPy, PyTorch and OCR model integration

## 📁 Project Structure

```text
trustx/
├── app/
│   ├── api/
│   │   ├── analytics/
│   │   ├── dashboard/stats/
│   │   ├── reports/[id]/
│   │   ├── reviews/
│   │   ├── screen/
│   │   └── screenings/
│   └── page.tsx
├── components/
│   ├── trustx-v2.tsx
│   ├── trustx-live-center.tsx
│   └── trustx-live-center.css
├── lib/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── risk-engine.ts
│   └── screening.ts
├── ai-service/
│   ├── main.py
│   └── requirements.txt
├── public/
├── .env.example
├── package.json
└── README.md
```

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/princenayak01/trustx.git
cd trustx
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env.local` from `.env.example` and configure your PostgreSQL connection.

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/trustx
AI_SERVICE_URL=http://localhost:8000
```

Never commit real passwords, API keys, database credentials or production secrets.

### 4. Start the Next.js application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 5. Start the AI service

From the `ai-service` directory:

```bash
cd ai-service
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn main:app --reload --port 8000
```

AI health endpoint:

```text
http://localhost:8000/health
```

## 🗄️ Database

TrustX uses PostgreSQL through Drizzle ORM.

The schema contains core entities for:

- Users and roles
- Refresh tokens
- Documents
- Screenings
- OCR results
- Forensic results
- Validation results
- Risk factors
- Reviews
- Audit logs
- System settings

Before production deployment, add a formal Drizzle migration workflow and apply migrations against the target PostgreSQL database.

## 🔌 API Overview

### Dashboard

```http
GET /api/dashboard/stats
```

Returns aggregate screening statistics.

### Screenings

```http
GET  /api/screenings
POST /api/screenings
```

Create and retrieve screening records.

### Screening execution

```http
POST /api/screen
```

Runs the screening workflow and stores analysis results.

### Screening detail

```http
GET /api/screenings/:id
```

Returns screening, document, OCR, forensic, validation and risk-factor data.

### Reviews

```http
GET  /api/reviews
POST /api/reviews
```

Record and retrieve analyst/reviewer decisions.

### Analytics

```http
GET /api/analytics
```

Returns screening summaries and daily activity data.

### Reports

```http
GET /api/reports/:id
```

Returns structured report data for a screening.

## 🔐 Security Design

TrustX is designed with security-first principles:

- Allowlist-based MIME validation
- File-size limits
- SHA-256 file hashing
- Secure generated storage names
- No sensitive credentials in source code
- RBAC-ready data model
- Audit-log data model
- Safe API error responses
- Human-in-the-loop review
- Privacy-aware document retention design
- Synthetic data for demos

For production, add authentication middleware, authorization checks on every protected route, rate limiting, CSRF protection where applicable, malware scanning, encrypted object storage, secret management, monitoring and formal security testing.

## 🧠 Explainable Risk Engine

TrustX does not intentionally reduce a screening to a black-box `fake/real` answer. It exposes contributing factors such as:

- Image tampering
- Field consistency
- Document structure
- OCR confidence
- QR consistency
- Metadata anomalies

This makes the result easier for a human analyst to investigate and challenge.

## 🧪 Demo & Responsible Use

This project is suitable for:

- College demonstrations
- Hackathons
- Cybersecurity portfolio work
- AI/ML experimentation
- Synthetic-document research
- Full-stack engineering practice

Do **not** upload real identity documents unless you have a lawful, authorized environment with appropriate privacy and security controls.

TrustX does not claim affiliation with Aadhaar, Passport Seva, UIDAI, government agencies, banks, law-enforcement agencies, or any identity-document issuing authority.

## 📊 Judge Demo Flow

A strong demo can follow this sequence:

```text
Login
  ↓
TrustX Dashboard
  ↓
Upload Synthetic Document
  ↓
Screening Starts
  ↓
OCR + Forensics + Validation
  ↓
Risk Score 0–100
  ↓
Explainable Risk Factors
  ↓
Manual Review
  ↓
Approve / Reject / Escalate / Re-verify
  ↓
Audit Trail
  ↓
Analytics
  ↓
Report
```

## 🌐 Deployment

The application can be deployed using a Next.js-compatible hosting platform with a managed PostgreSQL database. The Python AI service should be deployed separately or as part of a containerized architecture.

Recommended production topology:

```text
Frontend
   │
   ▼
Next.js API ───────► PostgreSQL
   │
   ├───────────────► Redis
   │                    │
   │                    ▼
   │                 Worker
   │                    │
   ▼                    ▼
Python AI Service ◄────┘
   │
   ▼
Object Storage
```

## 📌 Project Status

**Current:** Full-stack portfolio / hackathon MVP with a Next.js dashboard, PostgreSQL data layer, screening/risk APIs, review workflow, analytics, reports and a Python AI-service foundation.

**Next production upgrades:**

1. Complete authentication and JWT refresh flow
2. Add database migrations and seed data
3. Connect real OCR models
4. Add OpenCV/Pillow forensic processing
5. Add asynchronous Redis worker pipeline
6. Add encrypted object storage
7. Generate signed PDF reports
8. Add automated tests and CI/CD
9. Add observability and security monitoring
10. Perform a formal security review before handling sensitive data

## 👨‍💻 Author

**Prince Nayak**

- GitHub: https://github.com/princenayak01
- LinkedIn: https://www.linkedin.com/in/prince-nayak-528331243

## 📄 License

This project is intended for educational, portfolio and research use. Add an explicit open-source license before distributing the repository publicly if you want others to reuse the code under defined legal terms.
