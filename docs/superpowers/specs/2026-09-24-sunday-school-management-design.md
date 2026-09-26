# Sunday School Attendance & Management Application Design Specification

## 1. Overview & Architecture

The Sunday School Attendance & Management Application is a bilingual (English / Arabic) web platform built for Sunday school students, parents, Khuddam (servants/group leaders), and church administrators.

### Core Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling & UI:** Tailwind CSS + Lucide Icons + Google Forms-style card aesthetic
- **Database & ORM:** Prisma ORM supporting PostgreSQL (via `DATABASE_URL` for Supabase / Neon DB deployment) with automatic local SQLite fallback for offline development
- **Authentication:** Signed session cookies (role-based: `ADMIN` vs `KHADIM`)
- **Export Engine:** `xlsx` library for automated weekly attendance Excel generation
- **Language Support:** Complete bilingual toggle (English LTR / Arabic RTL) across all screens

---

## 2. Pages & User Experiences

### 2.1 Public Student/Parent Portal (`/`)
- **Aesthetic:** Clean, Google Forms inspired card design with header banner ("Billboard for Sadam" / Sunday School).
- **Language Toggle:** One-click toggle between English and Arabic with full RTL styling and Arabic typography.
- **Two Integrated Modes:**
  1. **Quick Check-In Mode:** Existing students search by name or select grade to immediately mark attendance **PRESENT** for today's session.
  2. **Comprehensive Google Forms Registration Mode:** Full 10-field child registration form:
     - Full name of child / اسم الولد بالكامل (`fullName`)
     - Date of birth / تاريخ الميلاد (`dob`)
     - Mother's Name / اسم ماما (`motherName`)
     - Mother's mob / تليفون ماما (`motherPhone`)
     - Father's mob / تليفون بابا (`fatherPhone`)
     - Child mob (if available) / تليفون الولد لو معاه (`childPhone`)
     - Detailed address / العنوان بالتفصيل (`address`)
     - School name / المدرسه (`schoolName`)
     - Sunday School Grade / Form (`formGrade`)
     - Assigned Group (`assignedGroup`: Group 1 through Group 10)
     - New photo for child / صوره حديثه للولد (`photoUrl` or image upload)
     - Notes / ملاحظات (`notes`)
- **Information / FAQ Widget:** Collapsible Q&A block answering common questions regarding arrival times, bus routes, class locations, and Sunday liturgy timing.

### 2.2 404 Assistance & Help Page (`/assistance`)
- Displayed when a child is not found during quick lookup.
- Banner: *"Sorry, we couldn't find your name. Don't worry! If you need help and/or you are new, contact support at +970553071353"*.
- Click-to-call button for `+970553071353`.
- Direct link / in-line registration form to enroll immediately and mark attendance as **PRESENT**.

### 2.3 Staff Login Gateway (`/login`)
- Clean authentication card for staff and admins.
- Accepts Username and Passcode (e.g. `khadem1`–`khadem10`, `admin1`, `admin2`).
- Automatically directs Khuddam to their assigned group dashboard and Admins to the master control panel.

### 2.4 Khuddam Group Dashboard (`/khadem/dashboard`)
- **Access Control:** Khadem is locked to their assigned group (Group 1 through 10).
- **Header:** *"WELCOME TO SUNDAY SCHOOL — Your Assistant IS [Khadem Name]"* with phone contact.
- **Roster Controls:**
  - Real-time list of all children in the group (starts with ~4 baseline, dynamically grows when new children register).
  - Status toggle buttons: **PRESENT** (Green) vs **ABSENT** (Red) with immediate optimistic UI update.
  - **`[Get Info]` Modal:** Pop-up displaying full profile: Mother's name & phone, Father's phone, Child's phone, Address, School, DOB, and Notes.
  - **`[Child Pic]` Modal:** High-resolution student photo display with zoom/fallback avatar.
  - **`[Export Excel]` Button:** Generates `.xlsx` spreadsheet for the group with current session dates and attendance records.

### 2.5 Master Admin Control Panel (`/admin/dashboard`)
- **Access Control:** Global access across all 10 groups.
- **Views:**
  1. **Global Student Directory:** Searchable, filterable table of all students across all 10 groups with edit/view modals and full family info.
  2. **Master Attendance Grid:** Matrix view with rows as all students (grouped by Group 1–10) and columns as session dates (e.g., `1/12`, `9/5`, `9/11`, `9/24`). Shows checkmarks ($\checkmark$) for Present and crosses ($\times$) for Absent.
  3. **Global Excel Export:** Generates combined master attendance workbook for the whole Sunday school.

---

## 3. Data Schema & Models

### `User`
- `id` (String / Int, PK)
- `username` (String, Unique: e.g. `admin1`, `khadem1`)
- `passcode` (String, hashed)
- `role` (Enum: `ADMIN`, `KHADIM`)
- `assignedGroup` (String, nullable: `Group 1` to `Group 10`)
- `assistantName` (String, nullable: e.g. "Khadem Mina")
- `assistantPhone` (String, nullable: e.g. "+970553071353")

### `Student`
- `id` (String / Int, PK)
- `fullName` (String)
- `dob` (String / Date, nullable)
- `motherName` (String, nullable)
- `motherPhone` (String, nullable)
- `fatherPhone` (String, nullable)
- `childPhone` (String, nullable)
- `address` (String, nullable)
- `schoolName` (String, nullable)
- `formGrade` (String)
- `assignedGroup` (String: `Group 1` to `Group 10`)
- `photoUrl` (String, nullable)
- `notes` (String, nullable)
- `createdAt` (DateTime)

### `AttendanceRecord`
- `id` (String / Int, PK)
- `studentId` (Foreign Key -> Student)
- `sessionDate` (String / Date: `YYYY-MM-DD`)
- `status` (Enum: `PRESENT`, `ABSENT`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

---

## 4. API Endpoints

- `POST /api/auth/login`: Authenticates staff/admin, sets secure HTTP-only cookie.
- `POST /api/auth/logout`: Clears session cookie.
- `GET /api/auth/me`: Returns current user session info.
- `GET /api/students`: Returns list of students (filtered by group for Khadem, all for Admin). Auth: staff session required.
- `POST /api/students`: Creates new student, resolves the group from the chosen group or school grade (nothing is guessed — neither means `400`) and creates today's attendance as `PRESENT`. Public by design.
- `POST /api/checkin`: Public quick check-in. Resolves the name fuzzily (`src/lib/nameMatch.ts`: Arabic diacritics/letter variants, typos, Latin↔Arabic transliteration), marks today's session `PRESENT` and returns only the student's name, group and grade — never contact details or photos. An unknown name answers `404` for the assistance screen and two near-tied names answer `409`; an invented group is never returned.
- `GET /api/attendance`: Retrieves attendance records by date and/or group. Auth: staff session required.
- `POST /api/attendance/toggle`: Upserts attendance status for a student on a specific date. Auth: staff session required.
- `GET /api/export/group?group=Group+1`: Generates and downloads group Excel file. Auth: staff session; Khuddam are limited to their own group.
- `GET /api/export/master`: Generates and downloads master school Excel file. Auth: admin only.

---

## 5. Seed Data Blueprint
- 2 Admin accounts: `admin1` (`admin_pass1`), `admin2` (`admin_pass2`)
- 10 Khuddam accounts: `khadem1` (`kpass1`) to `khadem10` (`kpass10`), mapped to Group 1–10
- Baseline students (40 total, 4 per group) with realistic bilingual sample data and photos.
