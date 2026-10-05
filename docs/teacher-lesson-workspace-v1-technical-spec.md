# Teacher Lesson Workspace v1 — Technical Specification

**Date:** 2 October 2026  
**Route:** `/dashboard/teacher/lesson/[timetableEntryId]`  
**Status:** Implementation-ready design draft  
**Primary users:** Teachers; supporting roles include school administrators, curriculum coordinators, and moderators

## 1. Scope

Teacher Lesson Workspace v1 connects an existing timetable entry to:

1. Teacher/class authorization.
2. Class curriculum assignment and curriculum focus.
3. Open assessment plans for the academic period.
4. Inline attendance.
5. Learner-level evidence capture.
6. Draft save and submit-for-review lifecycle.
7. Completion summaries and safe error/retry states.

V1 intentionally does **not** introduce a second lesson-planning system, a new gradebook, a full offline database, or automated grading. It reuses the current Prisma entities and adds only the missing lesson-level linkage and reliability fields.

## 2. Existing data model to reuse

The current schema already provides most of the domain model:

```text
AcademicYear / AcademicPeriod
  └─ TimetableEntry
       ├─ Class
       ├─ Teacher
       └─ Subject

ClassCurriculumAssignment
  ├─ CurriculumOffering / OfferingGrade
  ├─ CurriculumVersion
  └─ AssessmentPlan
       ├─ AssessmentNodeLink → CurriculumNode / LearningOutcome
       ├─ AssessmentComponent
       ├─ Rubric / GradeScale
       └─ AssessmentEvidence → Student
            └─ RubricCriterionScore
```

Relevant existing models:

- `TimetableEntry`: school, year, period, class, teacher, subject, day, time, room, notes.
- `TeacherClass`: teacher-to-class and optional subject linkage.
- `ClassCurriculumAssignment`: class, offering, offering grade, year, period, status.
- `SubjectCurriculumLink`: subject-to-curriculum-node mapping.
- `CurriculumNode`, `LearningOutcome`, `Competency`, `Value`.
- `AssessmentPlan`: period, lifecycle, grade scale, rubric, publication mode, class assignment.
- `AssessmentNodeLink`: assessment-to-node/outcome relationship.
- `AssessmentEvidence`: learner evidence, outcome, competency, rubric, status, audit fields.
- Existing attendance models and authorization helpers.

## 3. Schema changes

### 3.1 Required v1 additions

#### A. Add a stable timetable-to-assignment link

The current `TimetableEntry` identifies class and subject, but it does not explicitly identify which curriculum assignment supplies the lesson’s curriculum context. Add an optional foreign key:

```prisma
model TimetableEntry {
  id                    String   @id @default(cuid())
  schoolId              String
  school                School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  academicYearId        String
  academicYear          AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  periodId              String?
  period                AcademicPeriod? @relation(fields: [periodId], references: [id], onDelete: SetNull)
  classId               String
  class                 Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  teacherId             String
  teacher               User     @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subjectId             String
  subject               Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  curriculumAssignmentId String?
  curriculumAssignment  ClassCurriculumAssignment? @relation(fields: [curriculumAssignmentId], references: [id], onDelete: SetNull)
  day                   TimetableDay
  startTime             String
  endTime               String
  room                  String?
  notes                 String?  @db.Text
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([curriculumAssignmentId])
}
```

**Validation when creating/updating a timetable entry:**

- Assignment belongs to the same school.
- Assignment belongs to the same class.
- Assignment belongs to the same academic year.
- Assignment is `ACTIVE` or `DRAFT` according to administrator policy.
- The subject is linked to at least one relevant curriculum node when the school requires subject mapping.

Existing entries may remain null. The workspace loader should resolve a fallback assignment by school + class + academic year + period when the explicit link is absent, but should return a `curriculumContextStatus: "ambiguous"` warning if more than one valid assignment exists.

#### B. Add lesson workspace draft state

V1 can initially use `AssessmentEvidence.status = DRAFT` as the durable draft state. To support safe autosave and a future unscheduled lesson workflow, add a small session model rather than storing a second copy of evidence:

```prisma
model LessonWorkspaceSession {
  id                  String   @id @default(cuid())
  schoolId            String
  school              School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  timetableEntryId    String
  timetableEntry      TimetableEntry @relation(fields: [timetableEntryId], references: [id], onDelete: Cascade)
  teacherId           String
  teacher             User     @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  assessmentPlanId    String?
  assessmentPlan      AssessmentPlan? @relation(fields: [assessmentPlanId], references: [id], onDelete: SetNull)
  state               LessonWorkspaceState @default(OPEN)
  lastClientRevision  Int      @default(0)
  lastSavedAt         DateTime @default(now())
  submittedAt         DateTime?
  closedAt            DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([timetableEntryId, teacherId])
  @@index([schoolId, teacherId, state])
}

enum LessonWorkspaceState {
  OPEN
  SUBMITTED
  RETURNED
  CLOSED
}
```

This session is a workflow pointer and sync record. It does not replace `AssessmentEvidence` or `Attendance` records.

#### C. Add lesson-level curriculum focus links

V1 may use `AssessmentNodeLink` as the authoritative focus when a plan is attached. For lessons with no assessment plan, add an optional focus model so teachers can record the intended outcome without creating an assessment immediately:

```prisma
model LessonFocus {
  id                  String   @id @default(cuid())
  schoolId            String
  school              School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  timetableEntryId    String
  timetableEntry      TimetableEntry @relation(fields: [timetableEntryId], references: [id], onDelete: Cascade)
  curriculumNodeId    String?
  curriculumNode      CurriculumNode? @relation(fields: [curriculumNodeId], references: [id], onDelete: SetNull)
  learningOutcomeId   String?
  learningOutcome     LearningOutcome? @relation(fields: [learningOutcomeId], references: [id], onDelete: SetNull)
  competencyId        String?
  competency          Competency? @relation(fields: [competencyId], references: [id], onDelete: SetNull)
  valueId             String?
  value               Value? @relation(fields: [valueId], references: [id], onDelete: SetNull)
  note                String?  @db.Text
  sequence            Int      @default(0)
  createdById         String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([timetableEntryId, sequence])
  @@index([schoolId, learningOutcomeId])
}
```

If the team wants the smallest first migration, defer `LessonFocus` and require an open assessment plan for evidence capture. The preferred product behavior is to support focus-first teaching, so `LessonFocus` is recommended.

### 3.2 Recommended reliability fields

Add optimistic-concurrency metadata to mutable workflow records:

```prisma
// Add to AssessmentEvidence and optionally Attendance records
revision Int @default(0)
```

Every update supplies `expectedRevision`. If it does not match, return `409 REVISION_CONFLICT` with the latest server record. The client must preserve the teacher’s unsent form values and offer “Review latest” rather than silently overwriting another change.

### 3.3 Migration and backfill

1. Add nullable `curriculumAssignmentId` to `TimetableEntry`.
2. Backfill where exactly one active assignment matches class + academic year + period and the subject mapping is compatible.
3. Leave ambiguous entries null and surface them in the administrator timetable validation report.
4. Add `LessonWorkspaceSession`.
5. Add `LessonFocus` if focus-first behavior is included in v1.
6. Add indexes and Prisma relations.
7. Run `prisma format`, `prisma validate`, `prisma generate`, TypeScript, and migration tests.

## 4. Authorization model

### 4.1 Roles

| Role | Read workspace | Take attendance | Capture evidence | Submit | Review/publish |
|---|---:|---:|---:|---:|---:|
| Teacher assigned to class/subject | Yes | Yes | Yes | Yes | No |
| Teacher assigned to class, subject not restricted | Yes | Yes | Policy-dependent | Policy-dependent | No |
| School administrator | Yes | Policy-dependent | Policy-dependent | No/override | Yes |
| Curriculum coordinator | Yes | No | No | No | Yes, if configured |
| Super administrator | Support/audit only | Explicit grant | Explicit grant | Explicit grant | Explicit grant |
| Parent/learner | Published-only view | No | No | No | No |

### 4.2 Required authorization checks

For every workspace read or mutation:

1. Authenticate the session.
2. Resolve the user’s school; never trust a client-provided `schoolId`.
3. Load the timetable entry by `id` and `schoolId`.
4. For teachers, require `teacherId = session.user.id` or a permitted substitute relationship.
5. Verify `TeacherClass` for the class; if subject-specific, verify the subject assignment.
6. Verify all learner IDs belong to the class and school.
7. Verify curriculum nodes/outcomes belong to the timetable’s curriculum assignment/version.
8. Verify assessment plans belong to the same class assignment and academic period.
9. Apply evidence lifecycle authorization before returning internal fields.
10. Create an audit event for submission, return, review, publish, void, and bulk changes.

## 5. API endpoints

Use the application’s existing REST route conventions under `app/api`. All JSON responses should use a consistent envelope:

```ts
{ data: T, meta?: { requestId: string; serverTime: string } }
```

Errors:

```ts
{ error: { code: string; message: string; field?: string; details?: unknown } }
```

### 5.1 Load workspace

```http
GET /api/teacher/lesson/:timetableEntryId
```

**Auth:** Teacher assigned to the timetable class/subject; admins/coordinators with workspace-read permission.

**Response shape:**

```ts
type LessonWorkspaceResponse = {
  context: {
    timetableEntry: {
      id: string
      day: TimetableDay
      startTime: string
      endTime: string
      room: string | null
      notes: string | null
    }
    academicYear: { id: string; name: string }
    period: { id: string; name: string; code: string } | null
    class: { id: string; name: string; grade: string }
    subject: { id: string; name: string; code: string }
    teacher: { id: string; name: string }
    curriculum: {
      assignmentId: string | null
      frameworkName: string | null
      version: string | null
      grade: { code: string; displayName: string } | null
      status: "ready" | "missing" | "ambiguous"
    }
  }
  focus: {
    nodes: CurriculumFocusNode[]
    outcomes: LearningOutcomeSummary[]
    competencies: ReferenceItem[]
    values: ReferenceItem[]
    suggestedActivities: string[]
  }
  plans: {
    selected: AssessmentPlanSummary | null
    open: AssessmentPlanSummary[]
    recent: AssessmentPlanSummary[]
  }
  learners: LearnerWorkspaceRow[]
  attendance: { date: string; status: string; savedAt: string | null }
  session: {
    id: string
    state: LessonWorkspaceState
    revision: number
    lastSavedAt: string
  }
  permissions: {
    canTakeAttendance: boolean
    canCreateEvidence: boolean
    canSubmit: boolean
    canViewInternalNotes: boolean
    canReview: boolean
  }
  warnings: WorkspaceWarning[]
}
```

**Important:** Do not return full historical evidence by default. Return per-learner summary counts and the latest relevant published mastery. Load history on demand.

### 5.2 Select an assessment plan

```http
PUT /api/teacher/lesson/:timetableEntryId/plan
```

```ts
{ assessmentPlanId: string | null; expectedRevision: number }
```

Checks that the plan belongs to the same school, class assignment, academic period, and compatible subject/context. Creates or updates `LessonWorkspaceSession.assessmentPlanId`.

### 5.3 Save attendance

```http
PUT /api/teacher/lesson/:timetableEntryId/attendance
```

```ts
type AttendanceInput = {
  date: string // ISO date in school timezone
  records: Array<{
    studentId: string
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
    lateMinutes?: number
    reason?: string
  }>
  expectedRevision?: number
}
```

Requirements:

- Accept partial updates for a single learner or a complete class batch.
- Enforce class membership and school scope.
- Use a transaction for batch updates.
- Return per-row validation errors without discarding valid rows when policy allows.
- Do not couple attendance success to evidence success.

### 5.4 Create or update learner evidence

```http
PUT /api/teacher/lesson/:timetableEntryId/evidence/:studentId
```

```ts
type EvidenceInput = {
  evidenceId?: string
  assessmentPlanId?: string
  componentId?: string
  learningOutcomeId?: string
  competencyId?: string
  rubricId?: string
  evidenceType:
    | "SCORE" | "RUBRIC" | "OBSERVATION" | "PROJECT"
    | "PRACTICAL" | "PRESENTATION" | "SELF_REFLECTION"
    | "PEER_REVIEW" | "PORTFOLIO"
  numericScore?: number | null
  maxScore?: number | null
  masteryLevel?: string | null
  narrative?: string | null
  internalNote?: string | null
  rubricScores?: Array<{
    criterionId: string
    levelId: string
    comment?: string
  }>
  expectedRevision?: number
}
```

Rules:

- `studentId` must be in the timetable class.
- Assessment plan must be `OPEN` for teacher entry.
- Outcome/competency/rubric must belong to the plan or valid class curriculum assignment.
- Internal note is role-restricted and never copied to published snapshots.
- Upsert is keyed by an explicit `evidenceId` when editing; do not use a fragile composite guess.
- Return `201` for create, `200` for update, `409` for revision conflicts.

### 5.5 Attach evidence metadata

```http
POST /api/teacher/lesson/:timetableEntryId/evidence/:studentId/attachments
```

V1 may accept only metadata and a pre-authorized upload token if the existing storage layer is ready. The server must validate:

- Workspace and learner scope.
- MIME type and file size.
- Malware scanning status where available.
- Visibility: internal, learner, parent, or published.

Attachments must be authorized again on download.

### 5.6 Submit lesson evidence

```http
POST /api/teacher/lesson/:timetableEntryId/submit
```

```ts
{
  assessmentPlanId: string
  studentIds?: string[] // omit for all completed learners
  expectedRevision: number
  allowIncomplete?: boolean // only if school policy permits
}
```

Response:

```ts
{
  submittedCount: number
  incompleteCount: number
  warnings: Array<{ studentId: string; reason: string }>
  session: { state: "SUBMITTED"; revision: number; submittedAt: string }
}
```

Default behavior should block submission when required evidence is missing. If incomplete submission is configured, require an explicit confirmation and record the reason.

### 5.7 Load learner detail on demand

```http
GET /api/teacher/lesson/:timetableEntryId/learners/:studentId
```

Returns:

- Learner identity permitted for the teacher.
- Current attendance state.
- Evidence for the selected assessment plan.
- Recent relevant published evidence for the same subject/outcome.
- Mastery summary and evidence provenance.
- Intervention indicators where the teacher has permission.

Do not return unrelated medical, financial, parent-contact, or safeguarding data.

### 5.8 Workspace diagnostics

```http
GET /api/teacher/lesson/:timetableEntryId/diagnostics
```

Returns configuration problems:

- No curriculum assignment.
- Ambiguous curriculum assignment.
- Subject not mapped to curriculum.
- No open assessment plan.
- Timetable teacher not assigned to class.
- Period/year mismatch.
- Students without active curriculum enrollment.

This endpoint is useful for the UI and administrator readiness reports.

### 5.9 Admin repair endpoints

These are not teacher endpoints but make the feature operable:

```http
PATCH /api/timetable/:id/curriculum-assignment
POST  /api/timetable/validate
```

Both require admin permissions and must enforce school scope. `validate` should report clashes and curriculum-context gaps without mutating data.

## 6. Frontend route and component architecture

### 6.1 Route files

Recommended structure:

```text
app/dashboard/teacher/lesson/[timetableEntryId]/
  page.tsx                    # auth guard + initial server shell
  LessonWorkspaceClient.tsx  # client coordinator
  components/
    LessonHeader.tsx
    LessonStatusBar.tsx
    LearningFocusPanel.tsx
    AssessmentPlanPicker.tsx
    AttendancePanel.tsx
    LearnerRoster.tsx
    LearnerRow.tsx
    EvidenceDrawer.tsx
    EvidenceForm.tsx
    RubricCapture.tsx
    EvidenceCompletionBar.tsx
    WorkspaceWarnings.tsx
    WorkspaceMobileNav.tsx
```

The server page should do the initial auth and route-level authorization. The client coordinator owns interaction state and calls the API contracts.

### 6.2 Component wireframe

```text
LessonWorkspaceClient
├── LessonHeader
│   ├── Breadcrumb / back link
│   ├── ClassIdentity
│   ├── LessonMeta
│   └── WorkspacePrimaryAction
├── LessonStatusBar
│   ├── LifecycleChip
│   ├── AttendanceProgress
│   ├── EvidenceProgress
│   └── SyncIndicator
├── WorkspaceShell
│   ├── MainColumn
│   │   ├── WorkspaceMobileNav
│   │   ├── LearningFocusPanel
│   │   │   ├── CurriculumBadge
│   │   │   ├── OutcomeList
│   │   │   ├── CompetencyList
│   │   │   └── AssessmentPlanPicker
│   │   │   ├── AttendancePanel
│   │   │   └── LearnerRoster
│   │   │       └── LearnerRow × N
│   │   └── ReviewAndSubmitBar
│   └── ContextRail
│       ├── LessonDetails
│       ├── EvidenceCompletionBar
│       ├── WorkspaceWarnings
│       └── QuickActions
└── EvidenceDrawer
    ├── LearnerSummary
    ├── EvidenceTypePicker
    ├── AlignmentPicker
    ├── ScoreOrMasteryField
    ├── RubricCapture
    ├── NarrativeFeedback
    ├── InternalNote
    ├── AttachmentPicker
    └── DrawerActions
```

### 6.3 Visual behavior

- Desktop: two-column workspace; context rail remains visible.
- Tablet: main content plus collapsible context rail.
- Mobile: single-column step tabs: Focus, Learners, Capture, Review.
- Drawer: side panel on desktop, full-screen sheet on mobile.
- Sticky header: class identity and save/submit action remain visible.
- Avoid dense spreadsheet styling; use clear row states, chips, and progressive disclosure.
- Keep touch targets at least 44px.
- Use optimistic UI only for low-risk draft saves; attendance and submit actions show explicit saving states.

## 7. State-management architecture

Use a reducer-driven client state with a server snapshot and a small mutation queue. Do not duplicate every server object in many independent `useState` calls.

### 7.1 State layers

```text
Server snapshot
  └─ workspace data from GET endpoint

Interaction state
  ├─ selected tab
  ├─ selected learner
  ├─ selected plan
  ├─ filters/search
  ├─ drawer state
  └─ validation display

Draft state
  ├─ attendance edits
  ├─ evidence form draft by student/evidence id
  ├─ unsaved attachment metadata
  └─ client revision

Request state
  ├─ loading
  ├─ saving attendance
  ├─ saving evidence
  ├─ submitting
  ├─ retry queue
  └─ last error
```

### 7.2 Suggested types

```ts
type WorkspaceTab = "focus" | "learners" | "capture" | "review"
type LearnerFilter = "all" | "missing" | "draft" | "returned" | "needs_support" | "attendance_exception"

type LessonWorkspaceState = {
  server: LessonWorkspaceResponse | null
  tab: WorkspaceTab
  filter: LearnerFilter
  search: string
  selectedStudentId: string | null
  drawerOpen: boolean
  selectedPlanId: string | null
  attendanceDraft: Record<string, AttendanceDraft>
  evidenceDrafts: Record<string, EvidenceDraft>
  dirtyKeys: Set<string>
  saveState: "idle" | "saving" | "saved" | "error"
  submitState: "idle" | "submitting" | "submitted" | "error"
  error: WorkspaceError | null
  lastActionAt: string | null
}
```

For serializable React state, represent `Set` as `string[]` or use a reducer that reconstructs a Set in selectors.

### 7.3 Reducer events

```ts
type WorkspaceAction =
  | { type: "HYDRATE"; payload: LessonWorkspaceResponse }
  | { type: "SET_TAB"; tab: WorkspaceTab }
  | { type: "SET_FILTER"; filter: LearnerFilter }
  | { type: "SET_SEARCH"; search: string }
  | { type: "SELECT_LEARNER"; studentId: string | null }
  | { type: "SELECT_PLAN"; planId: string | null }
  | { type: "PATCH_ATTENDANCE"; studentId: string; patch: AttendanceDraft }
  | { type: "PATCH_EVIDENCE"; studentId: string; patch: Partial<EvidenceDraft> }
  | { type: "SAVE_STARTED"; operation: "attendance" | "evidence" }
  | { type: "SAVE_SUCCEEDED"; payload: SaveResult }
  | { type: "SAVE_FAILED"; error: WorkspaceError }
  | { type: "SUBMIT_STARTED" }
  | { type: "SUBMIT_SUCCEEDED"; payload: SubmitResult }
  | { type: "SUBMIT_FAILED"; error: WorkspaceError }
  | { type: "CONFLICT_RECEIVED"; latest: unknown; attempted: unknown }
  | { type: "DISMISS_ERROR" }
```

### 7.4 Selectors

Keep derived calculations out of render-heavy components:

- `selectVisibleLearners(state)`.
- `selectAttendanceProgress(state)`.
- `selectEvidenceProgress(state)`.
- `selectLearnerStatus(studentId, state)`.
- `selectIsSubmitReady(state)`.
- `selectWorkspaceWarnings(state)`.
- `selectCanEditEvidence(state, studentId)`.

The roster should render only the visible rows and should not recompute class-wide summaries for each row.

### 7.5 Data-fetching approach

A practical v1 approach for this Next.js app:

- Server page authenticates and renders a loading shell or passes route params.
- Client performs `GET /api/teacher/lesson/:id` with `cache: "no-store"`.
- Use an `AbortController` when changing routes or reloading.
- Keep a `requestId` for every mutation.
- On successful mutation, patch the local snapshot rather than refetching the entire workspace.
- Refetch after submit, conflict, or server-detected validation issue.
- Use `navigator.sendBeacon` only for non-critical telemetry, never for evidence or attendance writes.

### 7.6 Autosave and retry behavior

- Draft evidence saves after an explicit Save action in v1; debounce can be added after the contract is stable.
- Preserve unsaved values in reducer state when a request fails.
- Retry only idempotent PUT operations automatically.
- Never automatically retry submit or publication.
- Display last saved time and “Unsaved changes” state.
- On network loss, keep drafts locally for the current route using a namespaced `sessionStorage` key; clear after confirmed server save.
- Never store attachments or sensitive full learner history in `localStorage`.

### 7.7 Error states

| Error | UI behavior |
|---|---|
| 401 | Redirect to login with a return URL |
| 403 | Show “You are not assigned to this class” and safe back link |
| 404 | Show “Lesson not found” and return to timetable |
| 409 revision conflict | Preserve teacher draft; show latest server version and Review/Keep mine options |
| 422 validation | Highlight field/learner rows and keep all other drafts |
| 429 rate limit | Show retry time and disable repeated bulk actions |
| 500 | Show recoverable error, request ID, and retry; do not clear drafts |
| network offline | Show Offline/Unsaved indicator; keep local draft |

## 8. Testing plan

### Unit tests

- Grade normalization.
- Workspace selectors and reducer transitions.
- Evidence completeness calculation.
- Status transition rules.
- Curriculum compatibility validation.
- Revision conflict handling.

### API tests

- Teacher can load assigned lesson.
- Teacher cannot load another teacher’s lesson.
- Teacher cannot read another school’s timetable entry by ID.
- Teacher cannot submit a locked or published plan.
- Student outside the class is rejected.
- Outcome from another curriculum assignment is rejected.
- Parent receives no draft/submitted/internal evidence.
- Batch attendance transaction preserves valid and rejects invalid rows according to policy.
- Duplicate PUT retries do not create duplicate evidence.

### Playwright flows

1. Teacher opens timetable entry.
2. Teacher sees normalized grade and curriculum context.
3. Teacher records attendance.
4. Teacher selects assessment plan.
5. Teacher records rubric evidence for one learner.
6. Teacher saves and reloads; draft remains.
7. Teacher submits completed evidence.
8. Admin sees the item in moderation.
9. Parent cannot see it before publication.
10. Admin publishes; parent sees only the published snapshot and receives the configured notification.
11. Teacher attempts a foreign/unassigned lesson and is denied.
12. Network/API failure preserves unsaved drafts.

## 9. Delivery sequence

### Slice A — read-only workspace

- Route, auth, workspace loader, context header, curriculum focus, learner roster, open plan picker.
- No mutations except navigation.

### Slice B — attendance and draft evidence

- Inline attendance.
- Evidence drawer for observation, score, and rubric.
- Draft save and retry states.

### Slice C — submit and moderation integration

- Completion validation.
- Submit endpoint.
- Moderation queue linkage.
- Status updates and audit events.

### Slice D — hardening

- Concurrency conflicts.
- Local draft preservation.
- Attachment authorization.
- Full Playwright and role-boundary tests.

## 10. Definition of done for v1

The feature is ready for pilot when:

- The route is reachable from timetable and teacher dashboard.
- A teacher sees correct school, class, grade, subject, period, curriculum, and assessment context.
- Unauthorized access is blocked at the server/API level.
- Attendance can be completed inline.
- Evidence can be created, updated, and saved as draft.
- Rubric and basic observation workflows work.
- Submission enters the existing moderation lifecycle.
- Drafts survive refresh and recoverable API failures.
- Parent/learner visibility remains publication-controlled.
- Audit events exist for submission and later review/publication.
- TypeScript, build, unit, API, and Playwright smoke tests pass.
