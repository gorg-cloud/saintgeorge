# Sunday School Attendance & Management Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, responsive bilingual (English / Arabic) Sunday School Attendance & Management Web Application with public check-in / 10-field Google Forms registration, 404 assistance, Khuddam group dashboards (Groups 1–10), Master Admin calendar grid, and Excel export.

**Architecture:** Next.js 15 (App Router) + TypeScript + Tailwind CSS with Prisma ORM (supporting PostgreSQL via `DATABASE_URL` and SQLite local fallback), secure JWT session cookies for role-based access (`ADMIN`, `KHADIM`), context-based i18n with full Arabic RTL support, and `xlsx` generation.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma ORM, Lucide React, `xlsx`, `jsonwebtoken`, `bcryptjs`.

## Global Constraints
- Native bilingual toggle (English LTR / Arabic RTL) on all pages.
- 10-field Google Forms style registration with: Full name, DOB, Mother's name, Mother's mobile, Father's mobile, Child's mobile, Address, School name, Grade, Group (1-10), Photo, Notes.
- Support contact number: `+970553071353`.
- 12 Seed Staff Accounts: 2 Admins (`admin1`, `admin2`), 10 Khuddam (`khadem1` to `khadem10` mapped to Group 1 to 10).
- Automated Excel export generating `.xlsx` weekly sheets for groups and master admin.

---

### Task 1: Next.js Project Scaffolding & Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: Base Next.js app structure, Tailwind styling, root layout with font and metadata.

- [ ] **Step 1: Create package.json and install dependencies**
Initialize `package.json` with Next.js, React, Tailwind, Prisma, Lucide, xlsx, jsonwebtoken, and bcryptjs.
- [ ] **Step 2: Configure tsconfig.json, tailwind.config.ts, and postcss.config.mjs**
Configure path aliases `@/*` to `./src/*`, Tailwind color schemes, and RTL support.
- [ ] **Step 3: Create src/app/globals.css and src/app/layout.tsx**
Setup base styles, custom scrollbars, and root layout.
- [ ] **Step 4: Verify build/scaffold**
Run `npm run build` or typecheck to ensure clean scaffolding.
- [ ] **Step 5: Commit**
`git add . && git commit -m "feat: scaffold Next.js project with Tailwind CSS"`

---

### Task 2: Database Layer, Prisma Schema & Seed Script

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`, `prisma/seed.ts`

**Interfaces:**
- Consumes: Environment variables (`DATABASE_URL`).
- Produces: `prisma` client instance, database models (`User`, `Student`, `AttendanceRecord`), and seed data (12 accounts + 40 baseline students).

- [ ] **Step 1: Write prisma/schema.prisma**
Define `User`, `Student`, and `AttendanceRecord` models with all required fields.
- [ ] **Step 2: Create prisma client singleton in src/lib/prisma.ts**
Ensure safe PrismaClient instantiation in Next.js hot-reload environment.
- [ ] **Step 3: Write prisma/seed.ts**
Seed 12 staff accounts (2 admins, 10 khuddam) with passcodes and ~40 realistic baseline students with full contact details and photos across Groups 1–10.
- [ ] **Step 4: Generate Prisma Client & Run Seed**
Execute `npx prisma generate && npx prisma db push && npx tsx prisma/seed.ts`.
- [ ] **Step 5: Commit**
`git add prisma src/lib/prisma.ts && git commit -m "feat: setup Prisma schema, client, and seed script"`

---

### Task 3: Bilingual i18n System & Translation Dictionaries

**Files:**
- Create: `src/lib/i18n/translations.ts`, `src/lib/i18n/context.tsx`

**Interfaces:**
- Produces: `LanguageProvider`, `useLanguage` hook returning `lang` ('en' | 'ar'), `setLang`, `t` dictionary, and `dir` ('ltr' | 'rtl').

- [ ] **Step 1: Write translations dictionary in src/lib/i18n/translations.ts**
Create full English and Arabic dictionaries for: Landing page, Form questions (all 10 fields), 404 assistance, Khadem dashboard, Admin control panel, modals, buttons, and Q&A items.
- [ ] **Step 2: Implement LanguageContext & Hook in src/lib/i18n/context.tsx**
Provide language state, local storage persistence, and RTL direction toggling.
- [ ] **Step 3: Test language hook switching**
Verify that switching language toggles text and RTL/LTR direction correctly.
- [ ] **Step 4: Commit**
`git add src/lib/i18n && git commit -m "feat: implement bilingual i18n engine with Arabic RTL support"`

---

### Task 4: Authentication System & Session Handling

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`, `src/middleware.ts`

**Interfaces:**
- Produces: `createSessionToken`, `verifySessionToken`, `getCurrentUser`, login/logout endpoints, and route protection middleware.

- [ ] **Step 1: Implement auth utilities in src/lib/auth.ts**
Implement passcode hashing/verification and JWT cookie generation/decoding.
- [ ] **Step 2: Create login, logout, and me API routes**
Verify credentials, issue HTTP-only session cookie, and return user profile with role and assigned group.
- [ ] **Step 3: Implement middleware.ts for route guards**
Protect `/admin/*` (admin only) and `/khadem/*` (khadem & admin only).
- [ ] **Step 4: Test login & auth flow with curl/fetch**
Verify successful login for `admin1` and `khadem1` and rejection of invalid credentials.
- [ ] **Step 5: Commit**
`git add src/lib/auth.ts src/app/api/auth src/middleware.ts && git commit -m "feat: implement role-based authentication and session middleware"`

---

### Task 5: Core API Routes (Students, Attendance & Excel Export)

**Files:**
- Create: `src/app/api/students/route.ts`, `src/app/api/attendance/route.ts`, `src/app/api/attendance/toggle/route.ts`, `src/app/api/export/group/route.ts`, `src/app/api/export/master/route.ts`

**Interfaces:**
- Produces: REST endpoints for student search, 10-field registration, attendance tracking, and `.xlsx` generation.

- [ ] **Step 1: Implement GET and POST in src/app/api/students/route.ts**
Search/list students with group filtering and create new student with full 10 fields + automatic today's `PRESENT` attendance record.
- [ ] **Step 2: Implement src/app/api/attendance/route.ts and src/app/api/attendance/toggle/route.ts**
Retrieve attendance records by date/group and toggle status between `PRESENT` and `ABSENT`.
- [ ] **Step 3: Implement Excel export routes in src/app/api/export/**
Use `xlsx` to format and generate Excel workbooks for group attendance and master school attendance.
- [ ] **Step 4: Test API endpoints**
Verify student creation, attendance toggle, and Excel export binary generation.
- [ ] **Step 5: Commit**
`git add src/app/api && git commit -m "feat: create student, attendance, and Excel export APIs"`

---

### Task 6: Public Portal & Google Forms-Style Check-In / Registration Page

**Files:**
- Create: `src/app/page.tsx`, `src/components/HeaderBar.tsx`, `src/components/CheckInForm.tsx`, `src/components/RegistrationForm.tsx`, `src/components/FAQWidget.tsx`

**Interfaces:**
- Produces: Interactive student check-in portal with language switcher, Google Forms registration card, photo picker, and Q&A block.

- [ ] **Step 1: Build HeaderBar with Language Switcher & Billboard Banner**
Display "Billboard for Sadam" / Sunday School header with language toggle.
- [ ] **Step 2: Build CheckInForm component**
Quick name/grade search with instant match status and auto-attendance.
- [ ] **Step 3: Build Google Forms-Style RegistrationForm component**
Implement the exact 10 fields (Full name, DOB, Mom name & phone, Dad phone, Child phone, Address, School, Grade, Group 1-10, Photo preview, Notes).
- [ ] **Step 4: Build FAQWidget component**
Accordion answering arrival time, class locations, and contact info.
- [ ] **Step 5: Assemble src/app/page.tsx and verify UI**
Test toggling between English and Arabic, quick check-in, and full registration.
- [ ] **Step 6: Commit**
`git add src/app/page.tsx src/components && git commit -m "feat: build Google Forms-style check-in and registration landing page"`

---

### Task 7: 404 Assistance & Support Page

**Files:**
- Create: `src/app/assistance/page.tsx`, `src/app/not-found.tsx`

**Interfaces:**
- Produces: 404 assistance fallback with click-to-call `+970553071353` and instant registration form.

- [ ] **Step 1: Build src/app/assistance/page.tsx**
Create friendly assistance screen with direct phone link, supportive message, and registration form.
- [ ] **Step 2: Build custom not-found.tsx**
Ensure broken URLs gracefully direct users to assistance.
- [ ] **Step 3: Verify navigation to assistance page**
Test click-to-call link and registration fallback.
- [ ] **Step 4: Commit**
`git add src/app/assistance src/app/not-found.tsx && git commit -m "feat: create 404 assistance and support page"`

---

### Task 8: Staff Login Gateway Page

**Files:**
- Create: `src/app/login/page.tsx`, `src/components/LoginForm.tsx`

**Interfaces:**
- Produces: Clean staff login portal directing Khuddam and Admins to their respective views.

- [ ] **Step 1: Build LoginForm component**
Username and passcode input with bilingual labels, loading state, error display, and quick-fill helper for demo/testing.
- [ ] **Step 2: Assemble src/app/login/page.tsx**
Center card styling with church theme and language toggle.
- [ ] **Step 3: Test login redirects**
Verify `khadem1` redirects to `/khadem/dashboard` and `admin1` redirects to `/admin/dashboard`.
- [ ] **Step 4: Commit**
`git add src/app/login src/components/LoginForm.tsx && git commit -m "feat: build staff login gateway page"`

---

### Task 9: Khuddam Group Dashboard (Groups 1–10)

**Files:**
- Create: `src/app/khadem/dashboard/page.tsx`, `src/components/KhademRosterCard.tsx`, `src/components/StudentInfoModal.tsx`, `src/components/StudentPicModal.tsx`

**Interfaces:**
- Consumes: Current user session, group student roster, attendance API.
- Produces: Live group attendance management, Get Info modal, Child Pic modal, and Excel download.

- [ ] **Step 1: Implement Khuddam Dashboard Header & Group Summary**
Display "WELCOME TO SUNDAY SCHOOL — Your Assistant IS [Name]" with contact number and attendance counter.
- [ ] **Step 2: Implement KhademRosterCard with Green/Red status toggles**
Instant PRESENT (Green) / ABSENT (Red) toggle switch with real-time optimistic update.
- [ ] **Step 3: Implement StudentInfoModal with complete 10-field details**
Show mother's name & phone, father's phone, child's phone, detailed address, school, DOB, and notes.
- [ ] **Step 4: Implement StudentPicModal for photo preview**
High-resolution student photo display with image zoom and avatar fallback.
- [ ] **Step 5: Implement Export Excel action**
Trigger weekly group Excel export with the footer message *"ONCE ALL CHILDREN HAVE SUBMITTED, COMP WILL GENERATE EXCEL SHEET"*.
- [ ] **Step 6: Test all Khuddam features**
Verify toggling attendance, opening modals, and downloading Excel.
- [ ] **Step 7: Commit**
`git add src/app/khadem src/components && git commit -m "feat: build Khuddam group dashboard with info modals and Excel export"`

---

### Task 10: Master Admin Control Panel

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`, `src/components/AdminStudentDirectory.tsx`, `src/components/AdminAttendanceMatrix.tsx`

**Interfaces:**
- Consumes: Global students list across all 10 groups, multi-date attendance records.
- Produces: Global student directory, cross-date calendar attendance grid ($\checkmark$/$\times$), and master Excel export.

- [ ] **Step 1: Implement Admin Dashboard Shell & Tab Controls**
Provide tabs for `[Check Children Info]` (Global Directory) and `[Check Attendance]` (Master Grid).
- [ ] **Step 2: Implement AdminStudentDirectory component**
Searchable, filterable table across all 10 groups with view/edit details.
- [ ] **Step 3: Implement AdminAttendanceMatrix component**
Matrix view of all 40+ students grouped by Group 1–10 across session dates with $\checkmark$ (Present) and $\times$ (Absent) indicators.
- [ ] **Step 4: Implement Master Excel Export**
Download comprehensive multi-group Excel sheet.
- [ ] **Step 5: Test Admin controls and verify data consistency**
Verify switching groups, dates, viewing modals, and exporting master report.
- [ ] **Step 6: Commit**
`git add src/app/admin src/components && git commit -m "feat: build Master Admin control panel with attendance matrix and directory"`

---

### Task 11: End-to-End Verification & Automated Testing Suite

**Files:**
- Create: `scripts/test-e2e.ts`, `README.md`

**Interfaces:**
- Produces: End-to-end automated verification script testing all critical workflows: student registration, lookup, attendance toggle, auth permissions, and Excel generation.

- [ ] **Step 1: Write automated end-to-end test script in scripts/test-e2e.ts**
Script that executes API tests:
  - Register new student with all 10 fields -> check DB and today's attendance.
  - Quick lookup existing student -> verify present status.
  - Staff login with khadem and admin accounts -> verify JWT session tokens.
  - Toggle attendance status -> verify database update.
  - Generate group and master Excel sheets -> verify file validity and content.
- [ ] **Step 2: Run test suite**
Execute `npx tsx scripts/test-e2e.ts` and verify all tests pass.
- [ ] **Step 3: Create README.md with setup instructions and credentials guide**
Document system accounts, environment variables, Supabase/Neon deployment, and Vercel deployment guide.
- [ ] **Step 4: Final verification and commit**
`git add scripts/test-e2e.ts README.md && git commit -m "feat: add e2e test suite and comprehensive documentation"`
