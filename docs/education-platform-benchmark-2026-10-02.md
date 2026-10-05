# Education Platform Benchmark for the Student Performance System

**Date:** 2 October 2026  
**Products reviewed:** Zeraki, PowerSchool, Arbor Education, ManageBac+, and Toddle  
**Focus:** product processes, workflow design, curriculum and assessment architecture, analytics, parent experience, integrations, and lessons for Kenya CBC plus Cambridge/international curricula.

## The short answer

Yes. Zeraki is a meaningful Kenyan reference point, especially for local operations, mobile access, SMS, M-Pesa-linked fees, and Kenya-focused learning content. It is not a complete design model for the product we are building because the public evidence does not establish a deep CBC evidence or international-curriculum engine.

The strongest benchmark is a combination of products:

- **Zeraki** shows how to localize for Kenyan school realities and reduce operational friction.
- **PowerSchool** shows how to build a broad student-information platform around a central student record, connected modules, role/row security, and an integration ecosystem.
- **Arbor** shows how to make the teacher’s daily lesson dashboard the centre of operational work.
- **ManageBac+** shows how a curriculum-first product connects planning, classes, tasks, rubrics, portfolios, reports, and parent visibility.
- **Toddle** shows how to make learner evidence, multimodal portfolios, configurable standards, and teacher-reviewed assessment central to the learning experience.

Our opportunity is not to copy one of them. It is to combine Zeraki’s Kenya-first practicality with the curriculum and evidence depth of ManageBac/Toddle, the operational discipline of Arbor, and the security/integration model of PowerSchool.

## 1. What Zeraki appears to have designed well

Zeraki publicly presents three connected products: **Analytics**, **Learning**, and **Finance**. Analytics covers student records, attendance, assessment-result entry, academic reports, parent SMS, and spreadsheet/PDF exports. Learning provides videos, quizzes, assignments, progress monitoring, and teacher/parent/student access. Finance covers fees, receipts, pledges, expenses, fee statements, cashbooks, trial balances, and SMS reminders. [1] [2] [3]

The important design decision is **modular separation with a shared school context**. A school can think in terms of administration, learning, and finance rather than one overwhelming application. This is a good model for our navigation and packaging.

Zeraki also demonstrates practical localization. Its public material describes a Kenyan phone prefix, Swahili among its language choices, KICD-approved content, SMS communication, and a documented M-Pesa payment flow that produces confirmation, receipts, and balance updates. [4] [5] [6] [7]

That suggests several Kenya-first product principles for us:

1. **Mobile must be a primary workflow**, not only a responsive version of desktop.
2. **SMS remains important** for parents who do not use a school portal every day.
3. **M-Pesa and fee reconciliation should be treated as a connected operational workflow**, not just a payment button.
4. **Local terminology, phone formats, curriculum labels, and school processes should be built into setup.**
5. **Reports and sharing need to work through familiar channels**, including downloadable documents and potentially WhatsApp/email sharing.

The limitation is equally important. The public Zeraki sources emphasize videos, quizzes, marks, graphs, reports, and conventional academic workflows. They do not establish a detailed CBC mapping to strands, sub-strands, competencies, values, learner evidence, portfolios, or KNEC assessment workflows. They also do not publicly establish Cambridge, IB, or other international-curriculum support. Zeraki is therefore a strong **local operations benchmark**, but not sufficient as the curriculum-engine benchmark. [8] [9]

## 2. Product processes worth borrowing

### A. A guided implementation process, not a blank application

PowerSchool publicly describes implementation as a planned project with goals, a project manager, milestones, configuration, data transfer, and staff training. Arbor describes migration checks, readiness audits, training, go-live preparation, and a Customer Success handover. Toddle describes a school walkthrough, a named educator support contact, migration help, SIS/SSO specialists, training, and staged rollout. [10] [11] [12]

The lesson is that school software is not successful merely because the screens exist. The product must guide a school through a sequence:

1. Create the school and academic year.
2. Import or create staff, students, parents, classes, and subjects.
3. Configure curriculum and grading.
4. Link teachers to classes and subjects.
5. Configure timetable, attendance, assessment periods, and report templates.
6. Test with a small cohort.
7. Publish the first operational cycle.
8. Review data quality and train staff.

Our current system has most of the underlying capabilities, but the **setup journey is still distributed across separate screens**. We should create a school administrator setup checklist with progress, dependencies, validation, and a “ready for term” status.

### B. The teacher’s daily lesson dashboard

Arbor’s lesson dashboard is a particularly useful reference. From a class or lesson context, a teacher can take attendance, view permitted student context, log behaviour, create or grade assignments, communicate, add interventions, and manage attachments. [13]

This is better than making teachers navigate separately to attendance, assessments, students, evidence, and messages. The teacher starts with **today’s lesson and assigned class**, then performs the relevant actions in one context.

Our teacher experience should evolve toward:

> **Today → class → learners → attendance → lesson/assessment → evidence → feedback/intervention → publish or submit.**

The timetable work already created gives us the correct entry point. The next UI step is to make each timetable lesson open a lesson workspace with contextual attendance, assigned assessment plans, learner evidence, and communication actions.

### C. Curriculum planning connected to assessment and reporting

ManageBac+ and Toddle both make curriculum planning a first-class workflow. ManageBac supports unit plans, standards, tasks, criteria, rubrics, local-grade conversion, report cards, portfolios, and parent/student views. Toddle supports school curriculum maps, yearly plans, units, lessons, custom standards, multimodal assessments, rubrics, gradebook, portfolios, and reports. [14] [15] [16] [17]

The common pattern is not merely “store a curriculum tree.” It is a chain:

> **Curriculum standard → planned learning experience → task/assessment → evidence → rubric/criterion → mastery or grade → report → family view.**

Our curriculum engine already has versioned curriculum trees, offerings, assignments, assessment plans, CBC evidence, mastery analytics, moderation, and parent notifications. The key next step is to make the chain visible to users. Teachers should always understand:

- Which learning outcome or competency is being assessed.
- Which activity or assessment produced the evidence.
- Which rubric or grading scale was applied.
- Whether the evidence is draft, submitted, moderated, or published.
- How the result contributes to the learner’s progress report.

### D. Evidence must support more than numeric marks

Toddle explicitly describes photos, videos, audio, sketches, files, reflections, portfolios, and evidence tagged to standards or learning outcomes. Arbor describes marks with text/file evidence attached to curriculum statements. ManageBac supports portfolios, reflections, evidence, rubrics, and report highlights. [15] [18] [19]

This is especially relevant to CBC. A CBC-compatible platform should not force every learning outcome into a percentage. It should support:

- Observation notes.
- Rubric levels.
- Teacher comments.
- Learner self-reflection.
- Peer feedback where appropriate.
- Uploaded work and media.
- Projects and practical activities.
- Evidence linked to competencies, values, strands, and sub-strands.
- A published summary that is understandable to parents.

We should retain numeric scores where useful, but make **evidence and mastery the primary model** for CBC workflows.

### E. Separate live teacher work from published family results

ManageBac documents a useful visibility distinction: task grades and comments may appear while teachers enter them, but term grades do not appear until they are included in a generated report card. Toddle similarly describes school-controlled sharing of portfolio evidence and per-post visibility. [20] [21]

Our existing moderation lifecycle is the right direction:

> **Draft → Submitted → Reviewed/Moderated → Published.**

This should be applied consistently to assessment results, evidence, mastery statements, report cards, and parent notifications. A parent should not receive a confusing alert for an unreviewed or later-corrected teacher entry.

## 3. How the major products differ

### Zeraki: local operations and access channels

Zeraki’s strongest differentiators are local context, mobile access, SMS, Kenyan learning content, fees, and M-Pesa-related operations. Its public evidence is weaker on deep curriculum configuration, granular permissions, external APIs, and international curricula. [1] [2] [7] [8]

### PowerSchool: broad SIS portfolio and integration model

PowerSchool treats the SIS as the central system of record and connects enrollment, attendance, schedules, grades, assessment, analytics, family access, learning, and payments. Its Analytics & Insights product describes role-based and row-based security, configurable dashboards, drill-downs, student histories, and intervention plans. It also documents APIs, OneRoster, Ed-Fi, SIF, and third-party integrations. [22] [23] [24]

The lesson for us is to maintain a strong school-scoped core record while keeping curriculum and assessment services modular. We should also treat integrations and permissions as product features rather than future technical work.

### Arbor: operational context and permissioned workflows

Arbor’s strongest pattern is the context-rich lesson dashboard. It also documents custom curriculum statements, configurable marking scales, evidence attachments, assessment periods, cohort assignment, report libraries, and business-role permissions. Its integration approval flow lets administrators inspect requested data scopes and approve, reject, or revoke access. [13] [25] [26] [27]

The lesson is to make permissions visible and operational. An administrator should be able to see not only that an integration exists, but exactly what it can read, write, update, or delete.

### ManageBac+: curriculum-first international school workflows

ManageBac+ is the clearest benchmark for Cambridge and international curricula. Its public materials explicitly name IB, Cambridge, Pearson/Edexcel, American/AP, and national or school-designed curricula. It supports standards, unit planning, custom criteria, rubrics, local-grade conversion, report templates, portfolios, parent access, and an administrator-managed API with token permissions and rate limits. [14] [28] [29] [30]

The lesson is to treat curriculum as an installed/configurable academic framework, not as a hard-coded collection of subjects. Schools should be able to run CBC and Cambridge within the same tenant without the product mixing their standards or reporting rules.

### Toddle: evidence, portfolios, and family communication

Toddle’s strongest pattern is the connection between planning, assessment, learner evidence, portfolios, reporting, family communication, attendance, behaviour, and timetables. It describes custom standards, multimodal assessment, teacher-reviewed AI grading, per-post visibility, role-based access, and international-curriculum support including Cambridge and IB. [15] [16] [18] [31]

The lesson is to make the learner’s evidence meaningful and reusable. The same evidence can support teacher feedback, learner reflection, mastery analytics, report cards, parent communication, and accreditation or school-quality reviews.

## 4. Recommended product design for our system

### Positioning

The product should be positioned as:

> **A Kenya-first, multi-curriculum school operating and learner-evidence platform for CBC, Cambridge, and international schools.**

This is more specific and defensible than trying to be a generic school ERP. The differentiator should be the connection between daily school operations and trustworthy learner progress evidence.

### Product areas

Keep the product modular in the navigation and in the underlying services:

1. **School setup** — academic years, terms, classes, subjects, users, roles, imports, curriculum installations, report templates, notifications, and integrations.
2. **School operations** — students, teacher assignments, timetable, attendance, behaviour, fees, communications, and events.
3. **Curriculum studio** — CBC, Cambridge, and custom curriculum versions with standards, strands, competencies, outcomes, and progression.
4. **Assessment and evidence** — assessment plans, rubrics, observations, submissions, evidence attachments, grading, moderation, and publication.
5. **Analytics and interventions** — learner mastery, class comparisons, progress trends, missing evidence, attendance/behaviour signals, and intervention tracking.
6. **Family and learner experience** — published reports, learning updates, messages, notifications, attendance, fees, and learner portfolios.
7. **Integrations and governance** — APIs, imports/exports, M-Pesa/SMS/email, audit logs, data retention, role permissions, and consent.

### Curriculum data model

The product should maintain a strict separation between the reusable curriculum framework and a school’s implementation of it:

> **Curriculum framework/version → programme → grade/year → learning area/subject → strand/sub-strand → competency/outcome → progression level → assessment criterion/rubric.**

Then connect implementation records:

> **School offering → class assignment → unit/lesson plan → assessment plan → learner evidence → moderation → mastery/grade → published report.**

This lets the same school offer CBC in one programme and Cambridge in another, or lets a school run national and international programmes side by side.

### Analytics design

Use the analytics patterns seen across PowerSchool, Arbor, ManageBac, and Toddle:

- **Role-specific landing views:** headteacher, administrator, teacher, parent, and learner should not see the same dashboard.
- **Drill-down:** school → grade → class → learning area → learner → evidence.
- **Actionable signals:** every “at risk” or “needs attention” indicator should lead to an intervention, missing-evidence task, feedback action, or parent communication.
- **Explainability:** show which evidence, assessment, attendance pattern, or teacher observation produced a trend.
- **Permission-aware analytics:** dashboards must never aggregate data from classes or learners outside the user’s scope.
- **Human review:** analytics should recommend or highlight; teachers and school leaders should make the final decision.

### Parent experience

Parents should see a curated, published view rather than a raw database:

- Published competency and subject progress.
- Teacher feedback and selected evidence.
- Attendance and behaviour summaries where permitted.
- Upcoming tasks and school notices.
- Fee balances, receipts, and payment status.
- Notifications that explain what changed and what action is needed.
- Multiple linked children with strict child-level isolation.
- SMS fallback for important alerts.

The parent experience should distinguish **new evidence recorded**, **evidence reviewed**, and **report published**. Those events should not all produce the same notification.

### Integrations

The first integration roadmap should prioritize Kenya-specific value over a large catalogue:

1. M-Pesa payment and reconciliation.
2. SMS delivery with delivery status and opt-out controls.
3. Resend/SMTP email with verified sender configuration.
4. CSV/XLSX import with validation and preview.
5. Stable school-scoped API tokens.
6. OneRoster-compatible roster and grade exchange where relevant to international schools.
7. Calendar/timetable export.
8. Future SIS, LMS, assessment, and government/reporting integrations only after a real partner requirement is identified.

Every integration should have explicit scopes and an audit trail, following the permissioned integration pattern documented by Arbor and ManageBac. [27] [30]

## 5. What we should not copy

Do not copy PowerSchool’s portfolio breadth without its implementation and permission discipline. A very large product surface can become difficult for Kenyan schools to configure and support.

Do not assume that a generic custom-curriculum uploader equals CBC support. Arbor, ManageBac, PowerSchool, and Toddle all demonstrate configurable curriculum mechanisms, but public configuration capability is not the same as verified KICD/KNEC mapping. Our product should ship with a maintained CBC mapping and an explicit version history.

Do not expose every teacher-entered value immediately to parents. The moderation and publication lifecycle should remain authoritative.

Do not build a dashboard that only displays charts. Each chart should lead to a decision, intervention, feedback action, or data-quality task.

Do not treat a vendor’s public claims about analytics, AI, adoption, or timelines as independently validated outcomes. The reviewed evidence describes product claims and documented workflows, not measured impact in Kenyan schools.

## 6. Priority roadmap from this benchmark

### First 30 days: make the current product coherent

- Add an administrator setup checklist and readiness score.
- Make the timetable lesson open a teacher lesson workspace.
- Connect lesson context to attendance, assessment plan, evidence, and learner list.
- Finish the moderation-to-publication experience.
- Add visible data-quality states for missing class assignments, missing curriculum mappings, and incomplete report configuration.
- Keep the role-specific dashboards focused on the next action rather than a collection of statistics.

### Days 31–60: strengthen the curriculum and evidence product

- Add explicit CBC strand, sub-strand, competency, value, and outcome relationships where applicable.
- Add Cambridge subject/syllabus structure and configurable grade boundaries.
- Support multimodal evidence metadata and learner reflections.
- Add reusable rubric templates by curriculum and learning area.
- Add report templates that can present both subject results and competency evidence.
- Add analytics drill-down from school to learner with evidence explanations.

### Days 61–90: make it operationally deployable

- Add an onboarding/import wizard with dry-run validation and error correction.
- Add SMS/email notification preferences and delivery logs.
- Implement M-Pesa reconciliation design and payment-provider abstraction.
- Add scoped API tokens and integration audit logs.
- Add automated authorization tests for cross-school, unassigned-class, parent-child, and unpublished-evidence access.
- Pilot with one CBC school and one Cambridge/international school using real workflows before adding more modules.

## Conclusion

Zeraki validates that the market values a practical, mobile, Kenya-aware school platform with analytics, fees, SMS, and learning access. ManageBac+ and Toddle show that curriculum, assessment, evidence, portfolios, and family visibility can be designed as one connected learning workflow. Arbor shows how to make daily lessons the operational centre. PowerSchool shows the value of a strong student record, integration ecosystem, analytics controls, and row-level security.

Our best product direction is therefore clear: **keep the Kenyan operational core, make curriculum configurable but opinionated, make learner evidence the centre of CBC reporting, make teacher work context-driven, and make every insight permission-aware and actionable.**

## References

[1]: https://www.zeraki.app/zeraki-analytics "Zeraki Analytics product page"
[2]: https://www.zeraki.app/zeraki-learning "Zeraki Learning product page"
[3]: https://www.zeraki.app/zeraki-finance "Zeraki Finance product page"
[4]: https://analytics.zeraki.app/ "Zeraki Analytics sign-in page"
[5]: https://www.zeraki.app/_files/ugd/3288de_28f1c34930af453e9a9cb0e88bc106de.pdf "Zeraki Finance M-Pesa payment handout"
[6]: https://play.google.com/store/apps/details?id=ke.co.litemore.zanalytics&hl=en_US "Zeraki Analytics Android listing"
[7]: https://play.google.com/store/apps/details?id=co.ke.litemore.android.lda&hl=en_US "Zeraki Learning Android listing"
[8]: https://kicd.ac.ke/wp-content/uploads/2017/10/CURRICULUMFRAMEWORK.pdf "KICD Basic Education Curriculum Framework"
[9]: https://www.facebook.com/ZerakiApp/posts/cbc-bila-pressure-thats-the-zeraki-way-new-syllabus-new-expectations-new-learnin/1371470181670823/ "Zeraki official CBC content announcement"
[10]: https://www.powerschool.com/services/deployment/ "PowerSchool implementation and deployment"
[11]: https://arbor-education.com/moving-to-arbor/ "Arbor onboarding and migration"
[12]: https://www.toddleapp.com/faqs/ "Toddle onboarding, migration, training, and support"
[13]: https://support.arbor-education.com/hc/en-us/articles/203808082-Managing-my-class-from-the-Lesson-Dashboard-Overview "Arbor Lesson Dashboard"
[14]: https://www.managebac.com/multicurricula/feature/curriculum "ManageBac curriculum planning and analytics"
[15]: https://www.toddleapp.com/product/curriculum-planning/ "Toddle curriculum planning"
[16]: https://www.managebac.com/multicurricula/feature/assessment-reporting "ManageBac assessment and reporting"
[17]: https://www.toddleapp.com/product/assessments-gradebook/ "Toddle assessments and gradebook"
[18]: https://www.toddleapp.com/product/student-portfolios/ "Toddle student portfolios"
[19]: https://support.arbor-education.com/hc/en-us/articles/115002666014-Entering-marks-and-evidence-in-Curriculum-Tracking "Arbor marks and evidence"
[20]: https://help.managebac.com/hc/en-us/articles/360019111251-Navigating-ManageBac-as-a-Parent "ManageBac parent navigation and visibility"
[21]: https://www.toddleapp.com/product/communications-hub/ "Toddle communications hub"
[22]: https://www.powerschool.com/products/student-information/sis/ "PowerSchool SIS"
[23]: https://www.powerschool.com/products/analytics-and-insights/ "PowerSchool Analytics and Insights"
[24]: https://docs.powerschool.com/SGYH/system-administrators/schoology-sis-integrations-enterprise-only/sis-integrations-with-oneroster "PowerSchool OneRoster integration guidance"
[25]: https://support.arbor-education.com/hc/en-us/articles/360002702677-Setting-up-a-Custom-Curriculum-Tracking-Assessment "Arbor custom curriculum tracking"
[26]: https://support.arbor-education.com/hc/en-us/articles/28249998578973-Built-in-Arbor-Reports-Available-in-the-Report-Library "Arbor report library"
[27]: https://support.arbor-education.com/hc/en-us/articles/360009421273-Setting-up-and-managing-third-party-API-integrations-in-Arbor "Arbor third-party API permissions"
[28]: https://www.managebac.com/multicurricula "ManageBac multi-curricula schools"
[29]: https://help.managebac.com/hc/en-us/articles/360018226931-Enabling-ManageBac-Public-API-for-Integrations "ManageBac public API permissions"
[30]: https://help.managebac.com/hc/en-us/articles/360018224971-Managing-User-Permissions-Security "ManageBac user permissions and security"
[31]: https://www.toddleapp.com/privacy-center/ "Toddle privacy and security controls"
