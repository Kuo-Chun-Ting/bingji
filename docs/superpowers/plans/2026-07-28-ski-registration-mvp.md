# Ski Registration Apps Script MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement phone/password login, student registration, teacher attendance, and Google Sheet persistence through the deployed Apps Script API.

**Architecture:** Nuxt remains a static frontend. Apps Script owns authentication, authorization, domain rules, and access to one read-only source Spreadsheet plus one writable operations Spreadsheet.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Vitest 4, Google Apps Script V8, Google Sheets

## Global Constraints

- The source Spreadsheet is read-only and has headers `姓名`, `電話`, `Email`, `購買堂數`.
- The operations Spreadsheet has `accounts`, `courses`, and `registrations` sheets.
- Students and the teacher use one phone/password login form.
- Student passwords are MVP test values stored in `accounts`; teacher credentials are Script Properties.
- Apps Script verifies every protected action and never trusts a frontend phone or role.
- Only `attended` registrations reduce remaining lessons.
- Tests use `test_{function_name}_when_{condition}_then_{expected_result}` with Arrange, Act, and Assert sections.
- Production code follows focused files, clear names, short functions, and no speculative abstractions.

---

### Task 1: Apps Script Domain Rules

**Files:**
- Create: `apps-script/Domain.js`
- Create: `tests/unit/apps-script-domain.test.ts`

**Interfaces:**
- Produces: `normalizePhone(phone)`
- Produces: `parseStudentRows(rows)`
- Produces: `parseAccountRows(rows)`
- Produces: `parseCourseRows(rows)`
- Produces: `parseRegistrationRows(rows)`
- Produces: `calculateRemainingLessons(student, registrations)`
- Produces: `createRegistration(course, phone, registrations, now)`
- Produces: `updateRegistrationStatus(registration, status, now)`

- [ ] **Step 1: Write failing tests for phone normalization and each Sheet row parser.**

```ts
test('test_parseStudentRows_when_headers_and_rows_are_valid_then_returns_students', () => {
  // Arrange
  const rows = [
    ['姓名', '電話', 'Email', '購買堂數'],
    ['王小明', '0912-345-678', 'student@example.com', 4],
  ]

  // Act
  const students = context.parseStudentRows(rows)

  // Assert
  expect(students).toEqual([{
    name: '王小明',
    phone: '0912345678',
    email: 'student@example.com',
    purchasedLessons: 4,
  }])
})
```

- [ ] **Step 2: Run `npm test -- tests/unit/apps-script-domain.test.ts` and verify failure because `Domain.js` is missing.**
- [ ] **Step 3: Implement the smallest normalization and parser functions that pass.**
- [ ] **Step 4: Write and verify failing tests for remaining lessons, duplicate registration, closed courses, and allowed status transitions.**
- [ ] **Step 5: Implement the minimum registration and attendance rules.**
- [ ] **Step 6: Run the focused tests and all existing tests.**

### Task 2: Apps Script Authentication

**Files:**
- Create: `apps-script/Auth.js`
- Create: `tests/unit/apps-script-auth.test.ts`

**Interfaces:**
- Consumes: normalized phones and parsed accounts from Task 1.
- Produces: `authenticateUser(phone, password, teacherCredentials, accounts)`
- Produces: `createSessionToken(session, secret, now)`
- Produces: `verifySessionToken(token, secret, now)`
- Token payload: `{ phone, role, expiresAt }`

- [ ] **Step 1: Write failing tests for teacher login, student login, invalid credentials, valid tokens, tampered tokens, and expired tokens.**
- [ ] **Step 2: Run the focused test and verify the missing behavior causes failure.**
- [ ] **Step 3: Implement authentication and HMAC-signed seven-day tokens using Apps Script `Utilities`.**
- [ ] **Step 4: Run the focused tests and all existing tests.**

### Task 3: Google Sheet Gateway

**Files:**
- Create: `apps-script/Sheets.js`
- Create: `tests/unit/apps-script-sheets.test.ts`

**Interfaces:**
- Produces: `getAppConfiguration()`
- Produces: `loadStudents()`
- Produces: `loadAccounts()`
- Produces: `loadCourses()`
- Produces: `loadRegistrations()`
- Produces: `appendRegistration(registration)`
- Produces: `replaceRegistration(registration)`

- [ ] **Step 1: Write failing tests with complete SpreadsheetApp and PropertiesService stubs for reading configured sheets.**
- [ ] **Step 2: Verify failure because the gateway is missing.**
- [ ] **Step 3: Implement configuration validation and read functions using the fixed sheet names and headers.**
- [ ] **Step 4: Write failing tests that verify append and replacement write the exact row values.**
- [ ] **Step 5: Implement the two write functions without modifying the source Spreadsheet.**
- [ ] **Step 6: Run the focused tests and all existing tests.**

### Task 4: Apps Script API Actions

**Files:**
- Create: `apps-script/Actions.js`
- Modify: `apps-script/Code.js`
- Modify: `tests/unit/apps-script-web-app.test.ts`
- Create: `tests/unit/apps-script-actions.test.ts`

**Interfaces:**
- Consumes: domain, auth, and Sheet gateway functions.
- Produces actions: `login`, `getStudentDashboard`, `registerCourse`, `getTeacherDashboard`, `updateAttendance`.
- Produces API envelope: `{ ok: true, result }` or `{ ok: false, code }`.

- [ ] **Step 1: Replace the old `NOT_IMPLEMENTED` test with failing request-dispatch tests.**
- [ ] **Step 2: Write failing action tests for login, student ownership, teacher authorization, duplicate registration, and attendance updates.**
- [ ] **Step 3: Verify all new tests fail for missing action behavior.**
- [ ] **Step 4: Implement `doPost(event)` parsing, action dispatch, stable error codes, and JSON output.**
- [ ] **Step 5: Implement dashboard composition and protected actions; wrap registration and attendance writes with `LockService`.**
- [ ] **Step 6: Run focused tests and all Apps Script tests.**

### Task 5: Frontend Authentication and API Integration

**Files:**
- Modify: `shared/types/domain.ts`
- Modify: `app/utils/apps-script-api.ts`
- Create: `app/utils/auth-session.ts`
- Modify: `app/pages/index.vue`
- Modify: `app/pages/student.vue`
- Modify: `app/pages/teacher.vue`
- Modify: `tests/unit/apps-script-api.test.ts`
- Create: `tests/unit/auth-session.test.ts`

**Interfaces:**
- Produces: `login(phone, password)`
- Produces: `getSession()`, `saveSession(session)`, `clearSession()`
- Protected `callAppsScriptAction` requests include the stored token.

- [ ] **Step 1: Write failing API tests for login payloads, protected token payloads, and stable error mapping.**
- [ ] **Step 2: Write failing session tests for save, read, invalid storage, and clear behavior using an injected storage stub.**
- [ ] **Step 3: Implement the minimal API and session utilities.**
- [ ] **Step 4: Replace the connection-only homepage with the unified login form and role-based redirect.**
- [ ] **Step 5: Connect student and teacher pages to stored sessions; redirect missing or wrong-role sessions to login.**
- [ ] **Step 6: Keep failed API operations out of local dashboard state and clear sessions on logout.**
- [ ] **Step 7: Run unit tests and `npm run typecheck`.**

### Task 6: Configuration, Documentation, and Verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Documents exact source and operations Sheet headers.
- Documents the five Script Properties and deployment command.
- Documents local startup and MVP plaintext-password limitation.

- [ ] **Step 1: Update README with only the final Sheet, Script Properties, deployment, and startup steps.**
- [ ] **Step 2: Run `npm test`.**
- [ ] **Step 3: Run `npm run typecheck`.**
- [ ] **Step 4: Run `npm run generate`.**
- [ ] **Step 5: Run `npm run apps:status` and verify only Apps Script source files are tracked.**
- [ ] **Step 6: Run the local frontend and verify login, student registration, and teacher attendance against configured test Sheets.**
- [ ] **Step 7: Review the implementation diff against the design spec and coding standards from fixed point `dedc8d8`.**
