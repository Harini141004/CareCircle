# CareCircle — Multi-Patient Caregiver Coordination Dashboard

CareCircle is a multi-patient healthcare coordination and monitoring platform designed for professional caregivers, healthcare teams, administrators, and family members. It provides real-time medication tracking, vitals & symptom logging, medical appointment checklists, automated threshold alerts, doctor visit report exports, and centralized multi-role user management.

---

## 🌟 Key Features

* **Multi-Patient Switching:** Seamlessly toggle between multiple patients or view an aggregated overview across all assigned care recipients.
* **Medication Tracking & Adherence:** Schedule medications by dosage, frequency, and time of day. Log doses as Taken, Missed, or Skipped with automatic inventory decrements and low-refill alerts.
* **Vitals & Symptom Monitoring:** Track blood pressure, blood glucose, heart rate, temperature, weight, mood, and symptom severity with visual trend graphs. Abnormal readings trigger automated threshold alerts.
* **Appointments & Pre-Visit Checklists:** Manage upcoming medical visits with interactive preparation checklists (e.g., questions for the doctor, required documents).
* **Doctor Visit Report Generation:** One-click aggregate report summarizing 30-day medication adherence scores, vitals averages/ranges, and upcoming appointments.
* **Granular Alerts & Notifications:** In-app alert drawer and transactional email alerts via Resend for missed doses, critical vitals warnings, refill thresholds, and scheduled appointments.
* **Comprehensive Multi-Role User Management (`/admin/users`):**
  * **Admin:** Centralized console to create, view, edit, deactivate/reactivate, and reassign Admins, Caregivers, Patients, and Family Members.
  * **Caregiver (`CARETAKER`):** Complete management of assigned patients, medications, vitals, and logs. Includes verification status workflow (`VERIFIED`, `PENDING`, `REJECTED`).
  * **Patient:** Dependent patient profiles linked to a verified primary caregiver, multiple family members, health history, and emergency contacts.
  * **Family Member (`FAMILY`):** Dedicated portal (`/family/profile`) with relationship badges (Son, Daughter, Spouse, Sibling, Grandchild, Parent, Friend, Other), primary contact indicators, and scoped read-only medical views.
* **Hardened Security:** Signed HS256 JWT sessions using `jose`, rate-limited authentication, strict input validation with Zod, and server-side authorization on every route.

---

## 🛠️ Technology Stack

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
* **Language:** TypeScript 5
* **Database & ORM:** [Prisma ORM 7](https://www.prisma.io/) with SQLite (`better-sqlite3`)
* **Styling & UI:** Tailwind CSS v4, [Lucide React](https://lucide.dev/) icons, [Recharts](https://recharts.org/), `react-hook-form` + `@hookform/resolvers/zod`
* **Session & Auth:** [jose](https://github.com/panva/jose) (HS256 JWT signed sessions), bcryptjs
* **Email Service:** [Resend](https://resend.com/)

---

## 📋 Prerequisites

Before setting up the project, ensure you have:
* **Node.js**: v18.18.0 or later (v20+ recommended)
* **npm**: v9+ (or `pnpm` / `yarn`)

---

## 🚀 Getting Started

### 1. Install Dependencies

Clone or extract the repository, then install project dependencies:

```bash
npm install
```

### 2. Configure Environment Variables

Create your local `.env` configuration file from [`.env.example`](file:///e:/Harini/carecircle/.env.example):

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# Database file location
DATABASE_URL="file:./dev.db"

# Mandatory 32+ character secret for signing session cookies
# Generate via: openssl rand -base64 48
SESSION_SECRET="your-secure-session-secret-here-at-least-32-chars-long"

# Enable demo login button on /login (set to "true" for local development)
ENABLE_DEMO_LOGIN="true"

# (Optional) Resend API key for sending live email notifications
RESEND_API_KEY="re_your_api_key_here"
NOTIFICATION_FROM_EMAIL="alerts@yourdomain.com"

# Granular email notification triggers (true / false)
NOTIFY_MISSED_MED="true"
NOTIFY_REFILL_DUE="true"
NOTIFY_VITALS_WARNING="true"
NOTIFY_UPCOMING_APPOINTMENT="true"
```

> [!IMPORTANT]
> `SESSION_SECRET` must be at least 32 characters long. The application will throw an explicit error on startup if this secret is missing or too short.

### 3. Initialize & Seed the Database

Generate the Prisma client and run the database migrations and seed script:

```bash
# Generate the Prisma Client
npx prisma generate

# Apply database migrations
npx prisma migrate dev

# Seed sample admin, caregivers, patients, family members, medications, vitals, and appointments
npm run db:seed
```

### 4. Start the Development Server

```bash
npm run dev
```

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Demo Credentials & Roles

The seed script (`prisma/seed.ts`) populates sample accounts across all roles. Quick-fill buttons are also available directly on the login page:

| Role | Email | Password | Default Home Route | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@carecircle.demo` | `AdminSecret2026!` | `/admin/dashboard` | Full system access, User Management at `/admin/users` |
| **Caregiver** | `caregiver@carecircle.demo` | `password123` | `/dashboard` | Primary caregiver managing Margaret & Leo |
| **Caregiver (2)** | `marcus.care@carecircle.demo` | `password123` | `/dashboard` | Secondary verified caregiver managing Arthur |
| **Family (Son)** | `david.vance@family.demo` | `FamilyCare2026!` | `/family/profile` | Son & Primary Contact of Margaret Vance |
| **Family (Daughter)** | `emily.vance@family.demo` | `FamilyCare2026!` | `/family/profile` | Daughter of Margaret Vance |
| **Family (Spouse)** | `carol.pendelton@family.demo` | `FamilyCare2026!` | `/family/profile` | Spouse & Primary Contact of Arthur Pendelton |

---

## 📁 Project Structure

```
carecircle/
├── prisma/
│   ├── schema.prisma        # Prisma data models (Admin, Caregiver, Patient, FamilyMember, etc.)
│   ├── seed.ts              # Database seeding script
│   └── dev.db               # SQLite database file (ignored in git)
├── scripts/
│   ├── test-session-security.ts # Phase 0 session security test suite
│   ├── test-phase2-api.ts       # Phase 2 admin API & business rules test suite
│   └── test-phase3-ui.ts        # Phase 3 UI & end-to-end integration test suite
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── admin/
│   │   │   ├── dashboard/   # Admin dashboard & caregiver verification queue
│   │   │   └── users/       # Centralized User Management (Admins, Caregivers, Patients, Family)
│   │   ├── family/
│   │   │   └── profile/     # Scoped Family Member portal with relationship badges
│   │   ├── api/             # REST API endpoints
│   │   │   ├── admin/       # Admin user management & patient reassignment endpoints
│   │   │   ├── auth/        # Login, logout, signup, demo-login, me
│   │   │   └── ...          # Patients, medications, appointments, symptoms, alerts
│   │   ├── appointments/    # Medical appointments & checklists page
│   │   ├── dashboard/       # Main caregiver dashboard & metrics overview
│   │   ├── login/           # Authentication page with quick role autofill chips
│   │   ├── medications/     # Medication scheduling & inventory tracking page
│   │   ├── patients/        # Patient profiles & management page
│   │   ├── reports/         # Doctor visit report generation page
│   │   ├── settings/        # Email & alert notification settings
│   │   └── vitals/          # Vitals tracking & historical symptom charts
│   ├── components/          # Reusable UI components
│   │   ├── admin/           # AddUserModal, EditUserModal, ResetPasswordModal, Drawers
│   │   ├── Navbar.tsx       # Dynamic navigation header with role badges
│   │   ├── Sidebar.tsx      # Scoped sidebar navigation with Admin "Users" link
│   │   ├── Toast.tsx        # Toast notification system
│   │   └── AppShell.tsx     # Root client shell with AuthProvider & PatientProvider
│   ├── context/             # React context providers (AuthContext, PatientContext, ThemeContext)
│   ├── lib/                 # Core utilities
│   │   ├── access.ts        # Access control helpers (requireUser, requireRole)
│   │   ├── admin-helpers.ts # Cross-table email uniqueness & API error handler
│   │   ├── auth.ts          # Signed HS256 JWT sessions using jose, bcryptjs password hashing
│   │   ├── patient-scope.ts # Role-based patient filtering & validation
│   │   ├── prisma.ts        # Prisma Client singleton instance
│   │   └── validations/     # Zod input validation schemas for users and relationships
└── .env.example             # Template for environment configuration
```

---

## 🧪 Testing & Code Quality

### 1. Session Security Suite (Phase 0)
Verify that forged base64 cookies, tampered JWTs, wrong secrets, and expired tokens are rejected:
```bash
npx tsx scripts/test-session-security.ts
```

### 2. Admin API & Business Rules Suite (Phase 2)
Verify all 18 API business rules (cross-table unique emails, verified caregiver requirement, last admin protection, primary contact exclusivity, etc.):
```bash
npx tsx scripts/test-phase2-api.ts
```

### 3. UI & Integration Suite (Phase 3)
Verify multi-user relations, JWT generation, password verification, and scoped permissions:
```bash
npx tsx scripts/test-phase3-ui.ts
```

### 4. Static Analysis & Production Build
```bash
# TypeScript verification
npx tsc --noEmit

# ESLint verification
npm run lint

# Production Next.js build
npm run build
```

---

## 🔒 Security Best Practices

1. **Rotate Secrets Regularly:** Generate a new random `SESSION_SECRET` with `openssl rand -base64 48` when deploying to production.
2. **Never Commit Secrets:** `.env`, `.env.local`, and `*.db` are strictly excluded in [`.gitignore`](file:///e:/Harini/carecircle/.gitignore). Always use [`.env.example`](file:///e:/Harini/carecircle/.env.example) as the reference for environment variables.
3. **Role-Based Isolation:** Family members are restricted to read-only views of their linked patient, caregivers access only their assigned patients, and admins manage system-wide settings.
