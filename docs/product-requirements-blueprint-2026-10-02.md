# Student Performance System Product Requirements Blueprint

**Version:** 1.0  
**Date:** 2 October 2026  
**Product direction:** Kenya-first, multi-curriculum school operating and learner-evidence platform  
**Primary curricula:** Kenya CBC and Cambridge/international curricula  
**Audience:** Product, design, engineering, school-operations, and implementation teams

## 1. Product definition

### Product statement

The Student Performance System helps schools run daily operations and turn classroom activity into trustworthy, reviewable learner progress evidence.

It should connect:

> **School setup → class and timetable → lesson → curriculum outcome → assessment → evidence → moderation → mastery → report → family communication.**

### Differentiation

The product should combine four strengths:

- **Kenya-first operations:** mobile-friendly workflows, SMS, M-Pesa-ready fees, local terminology, and CBC reporting needs.
- **Configurable curricula:** CBC, Cambridge, and school-defined frameworks can coexist without hard-coded assumptions.
- **Evidence-led assessment:** observations, rubrics, projects, practicals, reflections, portfolios, and scores can all contribute to learner progress.
- **Permission-aware analytics:** every list, dashboard, export, notification, and report is filtered by tenant and user scope.

### Product principles

1. **Start from the next school action.** Teachers should open today’s lesson, not search through modules.
2. **Configure once, reuse everywhere.** Curriculum outcomes, rubrics, grade scales, report templates, and notification rules should be reusable.
3. **Evidence before conclusions.** Mastery and alerts must show the evidence behind them.
4. **Draft privately, publish deliberately.** Teacher work should not become a family-facing result until the school publishes it.
5. **Kenya-first, not Kenya-only.** Local defaults should be strong, but the core model must remain curriculum-neutral.
6. **Secure by scope.** School, class, learner, subject, and sensitive-record boundaries must be enforced at the API and UI layers.
7. **Support imperfect connectivity.** The highest-frequency teacher actions should tolerate interruptions and recover safely.

## 2. Target users and jobs

### School administrator

Needs to configure the school, academic year, curriculum offerings, classes, teachers, timetable, assessment rules, reports, communications, and integrations. The administrator must know whether the school is ready to start a term and where setup data is incomplete.

### Teacher

Needs to see today’s classes, take attendance, understand the intended learning outcome, record evidence quickly, give feedback, submit work for moderation, and identify learners who need support.

### Curriculum coordinator or headteacher

Needs to approve curriculum versions, review coverage, monitor assessment completion, moderate evidence, compare classes, and understand whether teaching and assessment are aligned.

### Parent or guardian

Needs a trusted, simple view of published learning progress, teacher feedback, selected evidence, attendance, behaviour where permitted, notices, fee status, and actions required for their child.

### Learner

Needs access to tasks, feedback, progress, goals, reflections, portfolio evidence, timetable, and published reports appropriate to age and school policy.

### Super administrator

Needs system-wide school provisioning, support access with strict auditability, curriculum version management, and platform-level configuration without bypassing tenant safeguards silently.

## 3. Product areas and boundaries

### 3.1 School setup

**Purpose:** Move a new school from an empty tenant to a ready-to-run term.

Capabilities:

- School profile and local settings.
- Academic years and periods.
- Classes, grade labels, subjects, learning areas, and streams.
- User creation, bulk student import, parent-child linking, and teacher-class assignments.
- Curriculum offering installation.
- Curriculum-to-class assignment.
- Grade scales, rubrics, report templates, and assessment defaults.
- Timetable setup and clash detection.
- Notification channels and publication rules.
- Readiness checklist, validation errors, and setup completion score.

**Requirement SET-01:** The administrator sees a setup checklist with explicit states: Not started, In progress, Needs attention, Ready, and Complete.

**Requirement SET-02:** Each checklist item links to the exact configuration screen and explains the consequence of leaving it incomplete.

**Requirement SET-03:** A school cannot publish a term report if the required curriculum, grading, class, and publication configuration is incomplete.

### 3.2 School operations

**Purpose:** Run the daily school day.

Capabilities:

- Student directory and enrollment.
- Teacher-class-subject assignments.
- Timetable and teacher views.
- Attendance and late/absence reasons.
- Behaviour and wellbeing notes with restricted visibility.
- Fees, fee structures, payments, balances, receipts, and later M-Pesa reconciliation.
- Announcements, SMS/email notifications, and communication history.
- Operational exports with role and class scope.

**Requirement OPS-01:** A Teacher sees only assigned classes and permitted learners in operational lists and exports.

**Requirement OPS-02:** The school can distinguish routine operational data from restricted safeguarding, medical, financial, and behaviour records.

### 3.3 Curriculum studio

**Purpose:** Manage reusable, versioned curriculum frameworks.

The existing schema already supports `Curriculum`, `CurriculumVersion`, `CurriculumOffering`, `OfferingGrade`, `CurriculumNode`, `LearningOutcome`, `Competency`, `Value`, `Rubric`, and `GradeScale`.

The product must represent:

> **Framework → version → programme/pathway → grade/year → learning area/subject → strand → sub-strand → unit/topic → outcome → competency/value → progression level.**

**Requirement CUR-01:** A curriculum version is immutable after publication except through a new version or controlled revision process.

**Requirement CUR-02:** CBC and Cambridge versions use the same engine but may have different node types, outcome metadata, rubrics, grade scales, and reporting rules.

**Requirement CUR-03:** Every assessable outcome can expose success criteria, suggested activities, linked competencies, linked values, and evidence expectations where configured.

**Requirement CUR-04:** A school can install a curriculum offering for an academic year and assign an exact offering grade to a class. The class grade and curriculum grade must be validated as compatible.

**Requirement CUR-05:** The UI must show the curriculum source, version, effective date, and last update so staff know which framework they are using.

### 3.4 Assessment and learner evidence

**Purpose:** Capture a complete, reviewable picture of learning.

The current data model supports `AssessmentPlan`, `AssessmentComponent`, `AssessmentNodeLink`, `AssessmentEvidence`, `RubricCriterionScore`, grade scales, and moderation states.

Supported evidence types should include:

- Numeric score.
- Rubric level.
- Observation.
- Project.
- Practical.
- Presentation.
- Self-reflection.
- Peer review.
- Portfolio item.

**Requirement ASM-01:** An assessment plan must identify class assignment, academic period, activity type, intended curriculum nodes/outcomes, components, rubric or grade scale, publication mode, and owner.

**Requirement ASM-02:** The plan lifecycle is `DRAFT → OPEN → SUBMITTED → MODERATION → PUBLISHED → LOCKED`, with `RETURNED`, `REJECTED`, and `ARCHIVED` paths where needed.

**Requirement ASM-03:** Teachers can save partial evidence without publishing it.

**Requirement ASM-04:** Evidence must show who captured it, when it was captured, status, reviewer, review reason, and publication version.

**Requirement ASM-05:** Moderators can approve, return, reject, or request changes at plan, learner, or evidence level according to school policy.

**Requirement ASM-06:** Parent notifications are triggered only by configured publication events, not every draft save.

### 3.5 Analytics and interventions

**Purpose:** Turn data into a decision or action.

Analytics must provide:

- School overview for administrators.
- Class mastery and coverage for teachers/coordinators.
- Learner progress over time.
- Evidence completeness and missing-assessment signals.
- Attendance/behaviour context where permitted.
- Curriculum coverage and outcome mastery.
- Intervention queue with owner, action, due date, and outcome.
- Exportable, permission-filtered reports.

**Requirement ANA-01:** Every mastery result links to the evidence and assessment records used to calculate it.

**Requirement ANA-02:** A dashboard signal must have a next action, such as Capture evidence, Review learner, Create intervention, Send feedback, or Contact parent.

**Requirement ANA-03:** Analytics aggregation must apply the same school/class/learner permissions as source APIs.

**Requirement ANA-04:** The system must distinguish a data gap from a low-performance signal. “No evidence” must not be displayed as “Not mastered.”

## 4. Teacher lesson workspace

### 4.1 Purpose

The Teacher Lesson Workspace is the primary daily workflow for classroom staff. It should replace the need to jump among timetable, attendance, assessment plans, student records, and competency analytics for routine work.

**Primary outcome:** A teacher can open a scheduled lesson, understand the intended learning, complete attendance, capture evidence, give feedback, and submit work for review in one focused workspace.

### 4.2 Entry points

The workspace can be opened from:

1. The Teacher dashboard “Today” card.
2. A timetable entry.
3. A class card.
4. An assessment-plan record page.
5. A deep link from a notification or moderation return.
6. A mobile shortcut for the current or next lesson.

Suggested route:

```text
/dashboard/teacher/lesson/[timetableEntryId]
```

For unscheduled work, support a class-context route:

```text
/dashboard/teacher/lesson/new?classId=...&subjectId=...
```

### 4.3 Workspace layout

Use a calm Miro-inspired workspace with a strong context header and a two-column desktop layout that collapses into a step-based mobile layout.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ← Timetable   Tuesday · 09:00–09:40   Class 2 · Mathematics          │
│              Grade 2 · Room B3                 [Save] [Submit]       │
├──────────────────────────────────────────────────────────────────────┤
│ Lesson status: OPEN       24 learners   Evidence 18/24   ● Synced     │
├──────────────────────────────┬───────────────────────────────────────┤
│ MAIN WORKSPACE                │ CONTEXT RAIL                         │
│                              │                                       │
│ 1. Learning focus             │ Lesson details                       │
│ • Strand / sub-strand        │ Teacher, subject, period, room        │
│ • Learning outcome           │ Assigned assessment plan              │
│ • Competencies / values      │ Rubric / grade scale                 │
│ • Success criteria            │ Previous evidence / mastery           │
│                              │                                       │
│ 2. Learner workflow           │ Quick actions                         │
│ [All] [Missing] [Needs help] │ Take attendance                       │
│ Search learners               │ Start assessment                     │
│                              │ View class mastery                   │
│ Learner rows                  │ Message class / parent               │
│ status · score · mastery     │                                       │
│ evidence · note              │                                       │
│                              │                                       │
│ 3. Selected learner drawer    │                                       │
│ rubric / observation / file   │                                       │
│ feedback / save evidence     │                                       │
└──────────────────────────────┴───────────────────────────────────────┘
```

### 4.4 Header requirements

The header must show:

- Back link to timetable or previous context.
- Day and lesson time.
- Class name and normalized grade label.
- Subject and room.
- Academic period.
- Teacher name where relevant.
- Plan status.
- Evidence completion count.
- Sync state and last saved time.
- Primary action: Save draft, Submit for review, or View published result depending on status.

**Acceptance criteria:**

- A teacher can identify class, grade, subject, period, and lesson status without opening another screen.
- The class grade uses the same normalized formatting as the assessment-plan register and evidence-entry header.
- The primary action changes safely with lifecycle state and never offers submission for a locked or published plan.

### 4.5 Learning focus panel

The panel should be populated from the timetable entry’s linked subject and the active class curriculum assignment.

Display:

- Curriculum framework and version, e.g. `Kenya CBC · 2026.1` or `Cambridge Primary · 2026`.
- Learning area and subject.
- Strand/sub-strand or syllabus section.
- One or more linked learning outcomes.
- Linked competencies and values where present.
- Success criteria.
- Suggested activity or lesson note.
- Existing assessment plans for the current period.

Actions:

- Select or attach an existing open assessment plan.
- Create a quick formative activity from the learning outcome.
- Open the curriculum tree for context.
- Mark the lesson as planned or completed, if lesson planning is added later.

**Acceptance criteria:**

- A teacher cannot accidentally record evidence against a curriculum outcome from another school or incompatible curriculum offering.
- The workspace clearly indicates when no outcome or assessment plan is linked and offers a safe next action.

### 4.6 Attendance panel

Attendance should be available inline, but remain a separate committed action from evidence submission.

Capabilities:

- Present, absent, late, excused.
- Mark all present, then correct exceptions.
- Late time and reason where applicable.
- Save attendance without requiring assessment evidence.
- Show unsaved attendance count.
- Respect teacher class assignment and school attendance policy.

Mobile interaction should use large touch targets and a quick exception-first mode: mark all present, then select absent/late learners.

### 4.7 Learner roster and evidence capture

The roster is the primary work surface.

Each row should show:

- Learner name and admission number.
- Attendance state.
- Evidence state: Missing, Draft, Submitted, Returned, Verified, Published.
- Score or mastery label, if recorded.
- Selected rubric level, if applicable.
- Short feedback indicator.
- Support flag or intervention indicator where permitted.

Filters:

- All learners.
- Evidence missing.
- Draft saved.
- Returned for correction.
- Needs support.
- Attendance exception.
- Mastery level.

Bulk actions:

- Mark a common rubric level only when policy allows.
- Apply a common observation tag.
- Mark all present.
- Submit selected completed evidence.
- Export a teacher-only working sheet, subject to permissions.

The system must avoid bulk operations that silently overwrite detailed evidence. Destructive or broad changes require a visible confirmation and an audit event.

### 4.8 Evidence drawer

Selecting a learner opens a side drawer on desktop and a full-screen sheet on mobile.

Drawer sections:

1. **Learner context**
   - Name, class, grade, previous published mastery, and recent relevant evidence.
2. **Evidence type**
   - Score, rubric, observation, practical, project, presentation, reflection, peer review, or portfolio.
3. **Learning alignment**
   - Outcome, competency, value, strand/sub-strand.
4. **Assessment values**
   - Numeric score, maximum score, mastery level, rubric criteria, or grade band.
5. **Narrative feedback**
   - Teacher comment, learner-facing comment, internal note.
6. **Attachments**
   - File/media evidence with type, size, upload status, and access visibility.
7. **Workflow status**
   - Save draft, submit, returned reason, reviewer, reviewed time, publication state.

**Acceptance criteria:**

- A teacher can record a rubric result and narrative feedback without leaving the lesson.
- The teacher sees which outcome and competency the evidence supports.
- Internal notes are never shown to parents or learners.
- A parent-facing comment is separate from an internal moderation note.
- Save failures preserve the local draft and show a retry state.

### 4.9 Moderation and publication states in the workspace

Use status chips with plain-language explanations:

- **Draft:** only the teacher and permitted school staff can see it.
- **Submitted:** teacher has completed the evidence and sent it to the review queue.
- **Returned:** reviewer requested a correction; show the reason prominently.
- **Verified:** reviewer accepted it but it is not yet family-visible.
- **Published:** included in the configured family/learner view and eligible for notifications.
- **Locked:** read-only after the reporting deadline or administrator lock.

The workspace must make it impossible to confuse “saved” with “published.”

### 4.10 Mobile design

The mobile layout should use four tabs or steps:

1. **Focus** — outcome, competency, assessment plan.
2. **Learners** — attendance and evidence completion.
3. **Capture** — selected learner evidence drawer.
4. **Review** — incomplete entries, validation errors, submit action.

Mobile requirements:

- Minimum 44px touch targets.
- Sticky class and learner context.
- Offline-safe draft capture for the current class where feasible.
- No large data tables requiring horizontal scrolling.
- Camera/file capture as a later enhancement, not a prerequisite for the first release.

## 5. Technical design for the workspace

### 5.1 Existing data to reuse

The workspace should reuse the existing models rather than introduce a parallel assessment system:

- `AcademicYear`, `AcademicPeriod`.
- `TimetableEntry`.
- `TeacherClass`.
- `ClassCurriculumAssignment`.
- `CurriculumOffering`, `OfferingGrade`, `CurriculumNode`, `LearningOutcome`.
- `Competency`, `Value`.
- `AssessmentPlan`, `AssessmentComponent`, `AssessmentNodeLink`.
- `Rubric`, `RubricCriterion`, `RubricLevel`.
- `AssessmentEvidence`, `RubricCriterionScore`.
- Existing attendance, notification, audit, and moderation models.

### 5.2 Recommended read contract

Add a server/API read contract conceptually equivalent to:

```text
GET /api/teacher/lesson/:timetableEntryId
```

Response sections:

```text
context:
  timetableEntry
  academicYear
  period
  teacher
  class
  subject
  curriculumAssignment
  curriculumVersion

focus:
  nodes
  outcomes
  competencies
  values
  suggestedActivities

plans:
  openPlans
  recentPlans
  selectedPlan
  rubric
  gradeScale

learners:
  student
  attendance
  evidenceSummary
  publishedMastery
  interventionSummary

permissions:
  canTakeAttendance
  canCreateEvidence
  canSubmit
  canViewInternalNotes
  canViewSensitiveData

meta:
  lastSyncedAt
  serverTime
```

The exact implementation may use REST conventions already present in the application, but the response should be shaped around the workspace rather than forcing the client to assemble many uncoordinated requests.

### 5.3 Recommended mutation contracts

```text
POST /api/teacher/lesson/:timetableEntryId/attendance
POST /api/teacher/lesson/:timetableEntryId/evidence
PATCH /api/evidence/:id
POST /api/evidence/:id/submit
POST /api/teacher/lesson/:timetableEntryId/submit
```

The mutations must:

- Validate session and role.
- Validate school ownership.
- Validate teacher assignment to the class and subject where subject-specific assignment applies.
- Validate that the learner belongs to the class and school.
- Validate that the outcome belongs to the class curriculum assignment.
- Validate that the assessment plan belongs to the same class assignment and period.
- Enforce lifecycle state transitions.
- Create audit events for submission, return, verification, publication, and voiding.
- Use idempotency or conflict-safe updates for retryable saves.

### 5.4 Query and performance rules

- Load the workspace with a bounded class roster and relevant evidence summary.
- Do not load every historical evidence item by default.
- Load learner history on demand in the drawer.
- Cache curriculum focus data by assignment and version.
- Invalidate only affected learner and class analytics after evidence mutation.
- Avoid N+1 requests when opening a timetable lesson.
- Use `no-store` for sensitive live workspace data unless a server-side cache is explicitly scoped and invalidated.

### 5.5 Security requirements

- All workspace reads and writes are school-scoped.
- Teacher access requires an active `TeacherClass` relationship for the class; subject-level access is checked where applicable.
- Parent and learner routes can access only published records and linked learners.
- Internal notes, safeguarding notes, and moderation comments are not returned to parent/learner clients.
- Attachments require authorization at download time, not only upload time.
- Every publication and moderation action is auditable.
- Rate-limit bulk evidence mutation and file upload endpoints.
- Do not include unnecessary student personal data in client payloads or logs.

## 6. 30/60/90-day implementation roadmap

### Days 0–30: establish the coherent daily workflow

**Goal:** A teacher can open a scheduled lesson, complete attendance, attach an existing assessment plan, capture basic evidence, and submit it safely.

#### Product and design

- Finalize the Teacher Lesson Workspace interaction design.
- Define the status language for draft, submitted, returned, verified, published, and locked.
- Define the CBC and Cambridge context labels shown in the focus panel.
- Define the setup checklist and term-readiness scoring.

#### Engineering

- Create the workspace route and server data loader.
- Join timetable entry, teacher assignment, class curriculum assignment, assessment plan, rubric/grade scale, learners, attendance, and evidence summaries.
- Add class/subject/tenant authorization tests.
- Add inline attendance save.
- Add evidence drawer for score, observation, rubric, and narrative feedback.
- Add save-draft and submit-for-review transitions.
- Connect existing moderation queue to workspace status.
- Add idempotent mutation handling for repeated saves.

#### Acceptance gates

- Teacher opens a lesson from the timetable.
- Teacher sees the correct class grade, subject, period, curriculum version, and outcome.
- Teacher sees only assigned learners.
- Teacher records attendance without leaving the workspace.
- Teacher saves evidence and refreshes without losing it.
- Teacher submits a completed plan and sees it in moderation.
- An unauthorized teacher receives a safe denial or redirect.
- Parent cannot see draft or submitted evidence.

### Days 31–60: make curriculum and evidence genuinely CBC/international ready

**Goal:** The workspace supports the different ways CBC and Cambridge schools plan, assess, and report learning.

#### Curriculum

- Add clearer curriculum version installation and school offering management.
- Add CBC metadata for strand, sub-strand, competency, value, outcome, and suggested evidence type.
- Add Cambridge metadata for programme, subject, syllabus/unit, assessment objective, and grade boundary configuration.
- Add curriculum mapping validation and missing-link warnings.
- Add reusable rubric and grade-scale templates by curriculum version.

#### Evidence and assessment

- Add multimodal evidence metadata and secure attachment workflow.
- Add learner reflection and teacher feedback separation.
- Add project, practical, presentation, self-reflection, peer-review, and portfolio evidence flows.
- Add assessment-plan completion indicators by learner and outcome.
- Add return-for-correction with reviewer reason and teacher response.
- Add report preview for a learner before publication.

#### Analytics

- Add learner evidence timeline.
- Add class mastery by outcome, competency, subject, and assessment period.
- Add missing-evidence versus low-mastery distinction.
- Add intervention queue with owner, due date, action, and outcome.
- Add teacher drill-down from class chart to learner evidence.

#### Acceptance gates

- A CBC assessment can show outcomes and competencies without forcing a numeric score.
- A Cambridge assessment can use a subject-specific scale and grade boundaries.
- One tenant can operate CBC and Cambridge offerings independently.
- A learner report shows evidence provenance.
- Analytics show why a learner is flagged and provide a next action.

### Days 61–90: make the platform deployable at real schools

**Goal:** A school can onboard, operate a term, publish reports, and communicate with families without hidden manual work.

#### Onboarding and operations

- Build the guided school setup wizard.
- Add dry-run CSV/XLSX imports with row-level errors and correction download.
- Add setup validation for teacher assignments, curriculum grades, timetable clashes, periods, and report templates.
- Add term rollover workflow.
- Add timetable conflict resolution and teacher workload visibility.
- Add operational audit history for high-impact changes.

#### Parent and learner experience

- Add published learner progress view with evidence visibility rules.
- Add differentiated alerts: evidence published, report published, intervention/message, fee event.
- Add SMS and email delivery preferences with delivery status.
- Add learner goals, reflections, and portfolio view where school policy permits.

#### Integrations and governance

- Add provider-agnostic payment integration interface, beginning with M-Pesa reconciliation design.
- Add school-scoped API tokens with read/write scopes and expiry/revocation.
- Add integration audit log and data-access review screen.
- Add calendar export and stable report export contracts.
- Complete privacy, retention, consent, and attachment access documentation.

#### Acceptance gates

- A new school can complete setup with a visible readiness score.
- Bulk import errors are understandable and recoverable.
- A full teacher term workflow works from timetable to published report.
- Parents receive only published, linked-learner data.
- School administrators can see who changed, reviewed, published, or exported sensitive records.
- Playwright coverage exists for Admin, Teacher, Parent, and cross-tenant denial paths.

## 7. Success measures

### Adoption and workflow

- At least 80% of teacher attendance sessions start from the timetable or lesson workspace by the pilot’s fourth week.
- A teacher can complete attendance for a 30-learner class in under two minutes after training.
- A teacher can record a basic observation or rubric result in under 30 seconds per learner after the first use.
- Setup checklist completion is measurable by school and academic year.

### Data quality

- Fewer than 2% of active classes have missing teacher or curriculum assignment after term launch.
- Fewer than 1% of published evidence records lack an identifiable outcome, assessment plan, or capture actor where the school’s policy requires them.
- Imports report row-level errors rather than failing with opaque messages.

### Trust and security

- Zero confirmed cross-school data exposures in automated and manual tests.
- 100% of publication, moderation, voiding, and sensitive export actions have audit events.
- Parent views contain only linked learners and published records.
- Analytics signals have an inspectable evidence path.

### Learning and reporting quality

- Teachers and coordinators can identify missing evidence separately from low mastery.
- Reports show both curriculum context and learner evidence where configured.
- A pilot school can run one CBC and one Cambridge reporting cycle without code changes to the core engine.

## 8. Immediate next build slice

The next implementation slice should be the **Teacher Lesson Workspace v1**, not another standalone dashboard.

Recommended order:

1. Add the workspace route and server read contract.
2. Reuse the existing timetable and authorization logic.
3. Render curriculum focus and selected assessment plan.
4. Add inline attendance.
5. Add evidence drawer for observation, score, and rubric.
6. Add draft save and submit-for-review.
7. Add class completion indicators.
8. Add Playwright tests for the Teacher happy path and unauthorized class path.

This slice creates the shared product spine for the next 90 days. It will also expose which schema and API gaps are real before we add more UI surface.
