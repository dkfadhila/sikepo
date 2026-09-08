# SiKePo — Claim Eligibility Investigation & Overbilling Pattern System

> *Detect Smarter. Protect JKN.*

**SiKePo** is a health-claim audit application that helps BPJS Kesehatan verifiers
catch problematic claims **before funds are disbursed** — not after.

Try it live: **https://sikepo-app.vercel.app** (demo account: `admin` / `admin`)

Built for **BPJS Kesehatan Healthkathon 2026**, themed
*Detect Smarter, Protect JKN — JKN Program Risk Efficiency*.

---

## What is this application?

Every day, healthcare facilities across Indonesia submit thousands of claims to BPJS Kesehatan.
A small fraction of them are problematic: inflated tariffs, services billed but never
delivered, expensive drugs outside the national formulary, even medical resumes copy-pasted
between patients.

Reviewing all of that manually is slow and exhausting. **SiKePo acts as the verifier's
assistant**: it reads every claim file, scores its risk level (0–100), explains *why* a
claim looks suspicious, and recommends what to do — **approve, hold, or reject**.
The final decision always belongs to a human; SiKePo just makes sure nothing slips
through unnoticed.

---

## How it works

Every claim passes through the same four stages in under two seconds:

1. **Claim intake** — The hospital system's submission (diagnosis, medication, billed cost,
   and the INA-CBG tariff ceiling) is recorded as a digital case file.
2. **Rule screening** — The system checks automatically: did the cost spike far above the
   ceiling? Is the length of stay reasonable for this diagnosis? Are there tightly
   restricted drugs with no clinical justification?
3. **AI risk scoring** — An artificial-intelligence model compares the claim against the
   patterns of hundreds of others, then assigns a risk score with its evidence — no black
   box, every reason is readable and auditable.
4. **Verdict recommendation** — Low-risk files are cleared for payment, suspicious ones are
   held for medical-record audit, dangerous ones are rejected and escalated to the
   anti-fraud team. The verifier presses the final button.

And the system learns on the job: every verdict a verifier gives becomes training feedback
for smarter assessments next time.

---

## Fraud patterns detected

| Pattern | In plain language |
|---|---|
| **Upcoding** | Diagnosis "fattened up" to qualify for a more expensive tariff |
| **Phantom billing** | Billing for services that were never actually given to the patient |
| **Overprescription / Inflated bills** | Costly off-formulary drugs with no clinical justification |
| **Cloning** | Medical resumes copy-pasted across different patients for mass claims |

---

## What you can do inside

- **Dashboard** — At-a-glance numbers: total claims, funds prevented from leaking, anomaly
  breakdown, and average risk per hospital.
- **Claim queue** — The case list with risk scores; click any file to see full details,
  audit reasons, and the verdict buttons (Approve / Hold / Reject).
- **Simulation sandbox** — Try auditing an imaginary claim: enter a diagnosis, cost, and
  medication, then watch how the audit engine judges it — without touching real data.
- **Data & trends** — Daily, monthly, and yearly claim trend charts, plus an anomaly
  heatmap across healthcare facilities.
- **Intake simulation** — Feel claims "flowing in" from hospital systems in real time,
  complete with auto-generated SEP numbers.

---

## Who is it for?

- **Branch Verifiers** — screen their regional claim queue and give final verdicts.
- **Anti-Fraud Task Force** — investigate across facilities, without verdict authority.
- **Auditors / Jury Board** — transparent read-only access for evaluation and oversight.

---

## Important note

Everything in this application is **synthetic data for simulation and demo purposes** —
150 imaginary claims from 8 fictional hospitals. Not BPJS Kesehatan operational data, not
real patient data. Built so the system can be seen and tried without touching anything
sensitive.

---

*SiKePo — BPJS Kesehatan Healthkathon 2026 · Prototype*
