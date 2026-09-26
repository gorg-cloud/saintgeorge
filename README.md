# ⛪ Sunday School Attendance & Management Application (Khodam)

A bilingual (**English / Arabic RTL**) Sunday School attendance and management application built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM**.

---

## 🌟 Key Features

1. **Google Forms-Style Student Check-In & Registration Portal (`/`):**
   - Bilingual toggle (**English LTR / Arabic RTL**) with Arabic typography.
   - **Quick Check-In comes first:** an existing child types their name and attendance is recorded as **PRESENT** for today's session (via `POST /api/checkin`, which never exposes family contact details).
   - **Tolerant name detector:** `src/lib/nameMatch.ts` normalizes Arabic diacritics and letter variants, tolerates small spelling mistakes, and transliterates Latin ↔ Arabic, so `mina maged fakhry` finds `مينا ماجد فخرى`. An unknown name gets the **Name Not Found** screen (`tel:` support + register button) and **never** an invented group; two different children scoring nearly the same name return `409` so the parent is asked for the full name.
   - **Explicit group assignment:** the child's group is never guessed. The form asks for the Sunday School group *or* the school grade (picking a grade pre-selects its group), and `POST /api/students` rejects a submission with neither (`400`).
   - **Full 10-Field Google Forms Registration:**
     - 1. Child's Full Name (`اسم الولد بالكامل`)
     - 2. Sunday School Group / Grade (`المجموعة` or `المرحلة الدراسية` — one is required)
     - 3. Date of Birth (`تاريخ الميلاد`)
     - 3. Mother's Name (`اسم ماما`)
     - 4. Mother's Mobile (`تليفون ماما`)
     - 5. Father's Mobile (`تليفون بابا`)
     - 6. Child's Mobile (`تليفون الولد لو معاه`)
     - 7. Detailed Address (`العنوان بالتفصيل`)
     - 8. School Name (`المدرسه`)
     - 9. Grade / Class (`المرحلة الدراسية`)
     - 10. Assigned Group (`المجموعة` - Group 1 to Group 10)
     - 11. Recent Photo (`صوره حديثه للولد`)
     - 12. Notes & Medical Info (`ملاحظات`)
   - Interactive Q&A / FAQ Accordion for liturgy and class timings.

2. **404 Assistance & Quick Support (`/assistance`):**
   - Supportive fallback banner for new/unmatched students.
   - Click-to-call link for direct assistant support (`+970553071353`).
   - In-line registration form that immediately enrolls and marks attendance.

3. **Staff Login Gateway (`/login`):**
   - Role-based authentication (`ADMIN` vs `KHADIM`).
   - Secure HTTP-only JWT session cookies.

4. **Khuddam Group Dashboards (`/khadem/dashboard`):**
   - Group-locked view (Group 1 through Group 10).
   - Dynamic roster expanding in real time as new students register.
   - One-click **PRESENT** (Green) / **ABSENT** (Red) toggle switch.
   - **`[Get Info]` Modal:** Full family contact details, address, school, and notes.
   - **`[Child Pic]` Modal:** High-resolution student photo viewer.
   - **`[Export Group Excel]`:** Automated `.xlsx` sheet generator with weekly attendance rate.

5. **Master Admin Control Panel (`/admin/dashboard`):**
   - **Global Student Directory:** Search and filter all students across all 10 groups.
   - **Master Attendance Grid:** Cross-date calendar matrix (Groups 1–10, session dates, $\checkmark$ / $\times$ badges).
   - **Master Excel Export:** Multi-sheet workbook with all groups and aggregate statistics.

---

## 👥 Group Assignment Rules

Groups 1–10 each serve one school-grade band (mirroring the seeded rosters). When a child registers
publicly, `src/lib/groups.ts` decides the group in this order:

| Priority | Signal | Example |
|---|---|---|
| 1 | Explicit group chosen on the form | `assignedGroup: "Group 3"` |
| 2 | School grade chosen on the form | `Grade 4` → `Group 1`, `Prep 1` → `Group 7` |
| — | Neither provided | registration is rejected with `400` |

Nothing else is ever guessed — there is no year-of-birth banding and no "least populated group"
fallback, so a child can never land in an arbitrary group.

Grade → group mapping lives in `src/lib/groups.ts` (`GRADES`) and is the single place to change it.
Khuddam and admins can move a child afterwards with the group/grade selectors in the **`[Get Info]`** modal.

---

## 🔒 API Authorization Matrix

| Endpoint | Anonymous | Khadem | Admin |
|---|---|---|---|
| `POST /api/students` (public registration) | ✅ | ✅ | ✅ |
| `POST /api/checkin` (public quick check-in, minimal response) | ✅ | ✅ | ✅ |
| `GET /api/students` (rosters, family contacts) | ❌ 401 | ✅ | ✅ |
| `PUT /api/students` (edit a child) | ❌ 401 | ✅ | ✅ |
| `GET /api/attendance`, `POST /api/attendance/toggle` | ❌ 401 | ✅ | ✅ |
| `GET /api/export/group?group=…` | ❌ 401 | own group only (else 403) | ✅ |
| `GET /api/export/master` | ❌ 401 | ❌ 403 | ✅ |

Guards live in `src/lib/api-auth.ts` (`requireStaff`, `requireAdmin`, `requireGroupAccess`) and are covered by the E2E suite.

---

## 🔑 System Accounts & Seed Blueprint

| Role | Username | Passcode | Assigned Group | Contact Assistant |
|---|---|---|---|---|
| **Admin** | `admin1` | `admin_pass1` | All Groups | Super Admin 1 |
| **Admin** | `admin2` | `admin_pass2` | All Groups | Super Admin 2 |
| **Khadem** | `khadem1` | `kpass1` | Group 1 | خادم جورج ميخائيل (+970553071353) |
| **Khadem** | `khadem2` | `kpass2` | Group 2 | خادم مينا سمير (+970553071354) |
| **Khadem** | `khadem3` | `kpass3` | Group 3 | خادم بيتر عادل (+970553071355) |
| **Khadem** | `khadem4` | `kpass4` | Group 4 | خادم يوسف مجدي (+970553071356) |
| **Khadem** | `khadem5` | `kpass5` | Group 5 | خادم كيرلس ناصر (+970553071357) |
| **Khadem** | `khadem6` | `kpass6` | Group 6 | خادم مارك عماد (+970553071358) |
| **Khadem** | `khadem7` | `kpass7` | Group 7 | خادم فادي وجيه (+970553071359) |
| **Khadem** | `khadem8` | `kpass8` | Group 8 | خادم أنطونيوس هاني (+970553071360) |
| **Khadem** | `khadem9` | `kpass9` | Group 9 | خادم مايكل رؤوف (+970553071361) |
| **Khadem** | `khadem10` | `kpass10` | Group 10 | خادم دانيال رفعت (+970553071362) |

---

## 🚀 Quick Start & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"  # Supabase / Neon PostgreSQL
JWT_SECRET="khodam-sunday-school-secret-key-2026-super-secure"
NEXT_PUBLIC_SUPPORT_PHONE="+970553071353"
```

### 3. Initialize Database & Seed
```bash
npm run db:push
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run E2E Test Suite
```bash
npm run test:e2e
```

The suite covers authentication, the 10-field registration + auto-attendance, group assignment
rules, API authorization guards, Excel generation and public check-in privacy. It removes the
students it creates, so it can be run repeatedly without polluting the roster.

---


---

## 🚀 First Deploy (one-time setup)

### 1. Create a Supabase PostgreSQL database

1. Go to **[supabase.com](https://supabase.com)** → **New Project**
2. Name it `saintgeorge` (or anything), set a **database password** (write it down)
3. Pick a region close to you / your students, keep the **Free** plan
4. Wait ~2 minutes for the project to be ready
5. In the project, go to **Settings → Database → Connection string**
6. Copy the **"Transaction SQL"** string — it looks like:

   ```
   postgresql://postgres:[your-password]@db.[project-id].supabase.co:5432/postgres?sslmode=require
   ```

### 2. Add environment variables in Vercel

In your Vercel project → **Settings → Environment Variables → Add**:

| Name | Value | Scope |
|---|---|---|
| `DATABASE_URL` | the Supabase connection string from step 1 | Production + Preview |
| `JWT_SECRET` | a long random string (e.g. `sk-` + 32 hex chars) | Production + Preview |
| `NEXT_PUBLIC_SUPPORT_PHONE` | `+970553071353` (optional — already hardcoded in the app UI) | Production + Preview |

### 3. Create the tables + admin account (run ONCE from your machine)

On **your own machine**, create a `.env` file in the project root with:

```env
DATABASE_URL="postgresql://postgres:[your-password]@db.[project-id].supabase.co:5432/postgres?sslmode=require"
JWT_SECRET="sk-your-random-secret-here"
NEXT_PUBLIC_SUPPORT_PHONE="+970553071353"
```

Then run:

```bash
npm run db:push
npm run db:seed
```

- `db:push` creates all the tables in your Supabase Postgres (safe to re-run — no-op if they already exist)
- `db:seed` inserts the admin account **and nothing else** (clean slate: no groups, no children)

> **Important:** `db:seed` does a full clean-slate wipe each time it runs (it deletes all groups, children and attendance records before inserting). Only run it when you want a fresh start — **not** as a recurring deploy step. The admin account persists across deploys once created.

### 4. Sign in

Open **saintgeorge.vercel.app** → click **Staff Gateway** → sign in with:

| | |
|---|---|
| **Username** | `grade5boys` |
| **Password** | `saintgeorge` |

You'll land on the empty admin dashboard. From there:
- Add Khodam groups in the **Groups** tab (the group takes the Khodam's name)
- Place children, print the per-group PDF sheet, export Excel, etc.

### Project structure (committed)

- `prisma/schema.prisma` — PostgreSQL schema (User, Group, Student, AttendanceRecord)
- `prisma/seed.ts` — seeds only the admin account (`grade5boys` / `saintgeorge`, bcrypt-hashed)
- `src/` — Next.js app (App Router, TypeScript, Tailwind)
- `scripts/test-e2e.ts` — E2E test suite
- `.env.example` — env var template (never commit `.env`)

### Environment variables (summary)

| Variable | Required? | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | Supabase PostgreSQL connection string |
| `JWT_SECRET` | ✅ Yes (recommended) | Session signing secret — if omitted, the app falls back to a public default (not recommended for production) |
| `NEXT_PUBLIC_SUPPORT_PHONE` | ❌ No | Support phone shown in the UI — already hardcoded, but set here to change it without a redeploy |

Deployment (Vercel & Supabase / Neon PostgreSQL)

1. **Database:** Create a PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. **Switch Prisma Provider:** Update `prisma/schema.prisma` datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. **Environment Variables on Vercel:**
   - `DATABASE_URL`: Your Supabase/Neon PostgreSQL connection string.
   - `JWT_SECRET`: A secure random secret string.
   - `NEXT_PUBLIC_SUPPORT_PHONE`: `+970553071353`
4. **Deploy:** Connect your GitHub repository to Vercel. Automatic builds will run upon every `git push`.
