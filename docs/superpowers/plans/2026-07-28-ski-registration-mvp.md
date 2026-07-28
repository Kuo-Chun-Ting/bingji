# Ski Registration MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Nuxt MVP where students register for ski lessons, teachers record attendance, Google Sheets supplies purchased lesson counts, and local JSON stores lesson state.

**Architecture:** Nuxt 4 serves the Vue UI and typed server API routes. The server reads a public Google Sheet through the Google Sheets API, stores courses and registrations in one local JSON file, and uses signed cookies for student and teacher sessions.

**Tech Stack:** Nuxt 4.5.1, Vue 3, TypeScript, Vitest 4, Lucide Vue Next, Node.js file storage

## Global Constraints

- Google Sheet columns are exactly `姓名`, `電話`, `Email`, `購買堂數`.
- One normalized phone number identifies one student.
- Google Sheet stores student data and purchased lesson counts only.
- Local JSON stores courses, registrations, attendance status, and timestamps.
- Remaining lessons equal purchased lessons minus `attended` registrations.
- Students can create only their own `registered` record.
- Teachers cannot register students and can only change `registered` to `attended`, `absent`, or `cancelled`.
- Teacher password, session secret, Google API key, spreadsheet ID, and sheet range come from private runtime configuration.
- Tests follow `test_{function_name}_when_{condition}_then_{expected_result}` names with Arrange, Act, and Assert sections.
- No database, Apps Script, MCP server, payment, LINE integration, SMS, waiting list, or production persistence.

---

### Task 1: Nuxt Project Foundation

**Files:**
- Create: `package.json`
- Create: `nuxt.config.ts`
- Create: `vitest.config.ts`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `app/app.vue`
- Create: `app/assets/css/main.css`
- Create: `data/db.json`
- Test: `tests/unit/project-config.test.ts`

**Interfaces:**
- Produces: Nuxt application scripts `dev`, `build`, `preview`, `test`, and `typecheck`.
- Produces: private runtime keys `googleSheetsApiKey`, `googleSpreadsheetId`, `googleSheetRange`, `teacherPassword`, `sessionSecret`, and `dataFile`.

- [ ] **Step 1: Write the failing configuration test**

```ts
test('test_runtime_config_when_loaded_then_private_keys_are_declared', async () => {
  // Arrange
  const source = await readFile('nuxt.config.ts', 'utf8')

  // Act
  const requiredKeys = ['googleSheetsApiKey', 'teacherPassword', 'sessionSecret']

  // Assert
  expect(requiredKeys.every(key => source.includes(key))).toBe(true)
})
```

- [ ] **Step 2: Run `npm test -- tests/unit/project-config.test.ts` and verify it fails because the project files do not exist.**
- [ ] **Step 3: Create the minimal Nuxt configuration, scripts, empty application shell, stylesheet, environment example, and initial JSON data.**
- [ ] **Step 4: Run the focused test and verify it passes.**
- [ ] **Step 5: Run `npm install` and commit the project foundation.**

### Task 2: Domain Rules

**Files:**
- Create: `shared/types/domain.ts`
- Create: `server/domain/students.ts`
- Create: `server/domain/lessons.ts`
- Create: `server/domain/registrations.ts`
- Test: `tests/unit/students.test.ts`
- Test: `tests/unit/lessons.test.ts`
- Test: `tests/unit/registrations.test.ts`

**Interfaces:**
- Produces: `normalizePhone(phone: string): string`.
- Produces: `parseStudentRows(rows: unknown[][]): Student[]`.
- Produces: `calculateRemainingLessons(student: Student, registrations: Registration[]): number`.
- Produces: `createRegistration(course: Course, phone: string, registrations: Registration[], now: string): Registration`.
- Produces: `changeRegistrationStatus(registration: Registration, status: AttendanceResult, now: string): Registration`.

- [ ] **Step 1: Write failing tests for phone normalization, required headers, duplicate phones, and purchased lesson parsing.**
- [ ] **Step 2: Run the student tests and verify each failure is caused by missing domain behavior.**
- [ ] **Step 3: Implement the smallest student parsing functions that pass.**
- [ ] **Step 4: Write and verify failing tests for remaining lesson calculation.**
- [ ] **Step 5: Implement remaining lesson calculation, counting only `attended` records for the selected phone.**
- [ ] **Step 6: Write and verify failing tests for closed-course registration, duplicate registration, and allowed teacher status transitions.**
- [ ] **Step 7: Implement registration creation and one-way status transitions.**
- [ ] **Step 8: Run all domain tests and commit the domain rules.**

### Task 3: Data Access, Authentication, and Server APIs

**Files:**
- Create: `server/repositories/google-sheets-students.ts`
- Create: `server/repositories/json-database.ts`
- Create: `server/utils/session.ts`
- Create: `server/utils/request-auth.ts`
- Create: `server/services/dashboard.ts`
- Create: `server/api/auth/student.post.ts`
- Create: `server/api/auth/teacher.post.ts`
- Create: `server/api/auth/logout.post.ts`
- Create: `server/api/session.get.ts`
- Create: `server/api/student/dashboard.get.ts`
- Create: `server/api/student/courses/[courseId]/register.post.ts`
- Create: `server/api/teacher/dashboard.get.ts`
- Create: `server/api/teacher/registrations/[registrationId].patch.ts`
- Test: `tests/unit/session.test.ts`
- Test: `tests/unit/dashboard.test.ts`
- Test: `tests/unit/json-database.test.ts`

**Interfaces:**
- Consumes: domain functions from Task 2.
- Produces: signed `ski_session` cookie containing role and optional student phone.
- Produces: `/api/student/dashboard` with student, remaining lessons, courses, and registrations.
- Produces: `/api/teacher/dashboard` with students, courses, registrations, and remaining lessons.

- [ ] **Step 1: Write and verify failing tests for valid, tampered, and expired signed sessions.**
- [ ] **Step 2: Implement HMAC-signed session tokens with Node crypto.**
- [ ] **Step 3: Write and verify failing tests for JSON read, atomic write, and dashboard composition.**
- [ ] **Step 4: Implement the JSON repository and dashboard service.**
- [ ] **Step 5: Implement Google Sheets loading with configuration validation and row parsing.**
- [ ] **Step 6: Implement authentication, dashboard, student registration, and teacher status API routes.**
- [ ] **Step 7: Run all unit tests and commit the server behavior.**

### Task 4: Student and Teacher Interface

**Files:**
- Create: `app/components/AppHeader.vue`
- Create: `app/components/StatusBadge.vue`
- Create: `app/components/CourseCard.vue`
- Create: `app/pages/index.vue`
- Create: `app/pages/student.vue`
- Create: `app/pages/teacher.vue`
- Modify: `app/assets/css/main.css`

**Interfaces:**
- Consumes: server API routes from Task 3.
- Produces: phone login, teacher password login, student registration workflow, and teacher attendance workflow.

- [ ] **Step 1: Build the login page with separate student and teacher forms and accessible error states.**
- [ ] **Step 2: Build the student page with remaining lessons, available courses, registration action, and history.**
- [ ] **Step 3: Build the teacher page grouped by course with attendance status controls.**
- [ ] **Step 4: Add responsive operational styling, Lucide icons, loading states, empty states, and keyboard-visible focus.**
- [ ] **Step 5: Run `npm run typecheck`, fix type errors, and commit the interface.**

### Task 5: Verification and Handoff

**Files:**
- Create: `README.md`

**Interfaces:**
- Documents: Google Cloud setup, public test Sheet format, environment variables, local startup, test commands, and MVP limitations.

- [ ] **Step 1: Write setup instructions using only final configuration and usage information.**
- [ ] **Step 2: Run `npm test` and verify zero failed tests.**
- [ ] **Step 3: Run `npm run typecheck` and verify zero type errors.**
- [ ] **Step 4: Run `npm run build` and verify a successful production build.**
- [ ] **Step 5: Start the local development server and verify the login page loads.**
- [ ] **Step 6: Review the complete diff against the design specification and coding standards.**
- [ ] **Step 7: Commit the verified handoff documentation.**
