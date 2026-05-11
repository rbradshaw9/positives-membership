# Simple Course Commerce + Course Delivery System

## Product positioning

This is **not** a full LMS.

This is a lightweight **Course Commerce + Course Delivery System** for a membership platform.

The goal is to let both logged-in members and outside visitors:

1. View available courses.
2. Purchase individual courses.
3. Create or use an account during checkout.
4. Access purchased courses inside the platform.
5. Move through structured course content.
6. Track simple progress.
7. Resume where they left off.

Do **not** build this like an academic LMS, compliance training system, certification platform, or quiz/assignment engine.

---

# 1. What we are building

## Core user flow

```text
Course Catalog
  → Course Sales Page
    → Checkout
      → Account / Enrollment
        → My Courses Dashboard
          → Course Player
            → Lessons / Videos / Downloads / Completion Progress
```

## Core features

| Feature | Description |
|---|---|
| Course catalog | Public page showing available courses |
| Course sales page | Public course detail page with curriculum preview and purchase CTA |
| Course purchase | Visitors and members can buy individual courses |
| Account creation/login | Non-members can create an account during purchase |
| Course access control | Only enrolled/purchased users can access course content |
| Student dashboard | Logged-in users can see their purchased/enrolled courses |
| Course player | Clean lesson-viewing interface |
| Course structure | Courses contain modules/sections and lessons |
| Lesson content | Lessons can include video, audio, text, downloads, and embeds |
| Basic progress tracking | Mark lessons complete and track course progress |
| Resume learning | User can continue from last unfinished lesson |
| Admin course builder | Admin can create/edit courses, modules, and lessons |
| Admin enrollment management | Admin can manually grant or revoke access |
| Order/access integration | Successful purchase unlocks the purchased course |

---

# 2. What we are not building

Do **not** build these features right now:

| Feature | Status |
|---|---|
| Certificates | Not needed |
| Instructors | Not needed |
| Drip content | Not needed yet |
| Prerequisites | Not needed |
| Assignments | Not needed |
| Quizzes | Not needed |
| Assessments | Not needed |
| Grading | Not needed |
| Academic transcripts | Not needed |
| SCORM/xAPI | Not needed |
| Cohorts | Not needed yet |
| Course discussions/community | Not needed yet |
| Advanced reporting | Not needed yet |
| Gamification | Not needed |
| Badges | Not needed |
| Compliance renewals | Not needed |

Important: do **not** overbuild this into a complex LMS. We need a clean, reliable course purchase and delivery system.

---

# 3. Core data model

Use a structured data model. Do **not** build this as random protected pages with embedded videos.

## Required entities

```text
Course
Module
Lesson
CourseEnrollment
LessonProgress
CourseProduct
Order / Purchase
Download / Resource
```

## Entity relationships

```text
Course
  has many Modules

Module
  belongs to Course
  has many Lessons

Lesson
  belongs to Module
  belongs to Course

User
  has many CourseEnrollments

CourseEnrollment
  belongs to User
  belongs to Course
  created when user purchases course or admin grants access

LessonProgress
  belongs to User
  belongs to Lesson
  tracks completion and last viewed state

CourseProduct
  connects a purchasable product/Stripe price/WooCommerce product to a Course
```

---

# 4. Course model

Each course should have:

| Field | Description |
|---|---|
| `id` | Unique course ID |
| `title` | Course name |
| `slug` | Public URL slug |
| `short_description` | Brief catalog summary |
| `description` | Full course sales-page description |
| `featured_image` | Course thumbnail/hero image |
| `promo_video_url` | Optional sales-page trailer |
| `status` | Draft, published, archived |
| `visibility` | Public, private, hidden |
| `price` | Display price if sold directly |
| `currency` | USD, etc. |
| `access_type` | Free, paid, membership-included, manual |
| `product_id` | Connected product/payment item |
| `estimated_duration` | Optional, e.g. “2 hours” |
| `lesson_count` | Computed from lessons |
| `module_count` | Computed from modules |
| `sort_order` | For catalog ordering |
| `category` | Optional |
| `tags` | Optional |
| `what_you_get` | Bullet list for sales page |
| `who_its_for` | Optional sales-page section |
| `published_at` | Publish date |
| `created_at` | Created timestamp |
| `updated_at` | Updated timestamp |

---

# 5. Module model

Modules are sections inside a course.

Example:

```text
Course: Foundations of Positive Living
  Module 1: Welcome & Orientation
  Module 2: Core Concepts
  Module 3: Daily Practice
```

Each module should have:

| Field | Description |
|---|---|
| `id` | Unique module ID |
| `course_id` | Parent course |
| `title` | Module title |
| `description` | Optional module intro |
| `sort_order` | Controls order inside course |
| `status` | Draft, published, archived |

Modules should be simple. No prerequisites or drip logic right now.

---

# 6. Lesson model

Lessons are the actual content units.

Each lesson should have:

| Field | Description |
|---|---|
| `id` | Unique lesson ID |
| `course_id` | Parent course |
| `module_id` | Parent module |
| `title` | Lesson title |
| `slug` | Lesson URL slug |
| `content` | Rich text lesson content |
| `video_url` | Optional video URL/embed |
| `audio_url` | Optional audio file/embed |
| `download_ids` | Optional resources/downloads |
| `estimated_duration` | Optional, e.g. “8 min” |
| `sort_order` | Controls order inside module |
| `is_preview` | Allows public preview before purchase |
| `status` | Draft, published, archived |
| `created_at` | Created timestamp |
| `updated_at` | Updated timestamp |

A lesson should be able to contain:

| Content type | Required? |
|---|---|
| Text | Yes |
| Video | Optional |
| Audio | Optional |
| Downloads | Optional |
| Embeds | Optional |

Lessons do **not** need quizzes, assignments, comments, certificates, or grading.

---

# 7. Course enrollment model

Enrollment means the user has access to a course.

Each enrollment should have:

| Field | Description |
|---|---|
| `id` | Unique enrollment ID |
| `user_id` | User who has access |
| `course_id` | Course they can access |
| `source` | Purchase, membership, manual, admin comp |
| `order_id` | Purchase/order that granted access, if applicable |
| `status` | Active, canceled, refunded, expired |
| `enrolled_at` | Date access was granted |
| `expires_at` | Optional; null for lifetime access |
| `last_accessed_lesson_id` | Resume point |
| `completed_at` | Optional course completion timestamp |
| `progress_percent` | Computed or cached progress percentage |

Access rule:

```text
A user can view locked course content if they have an active CourseEnrollment for that course.
```

---

# 8. Lesson progress model

Track simple progress only.

Each lesson progress record should have:

| Field | Description |
|---|---|
| `id` | Unique progress ID |
| `user_id` | Student |
| `course_id` | Course |
| `lesson_id` | Lesson |
| `status` | Not started, in progress, completed |
| `started_at` | First viewed timestamp |
| `completed_at` | Completed timestamp |
| `last_viewed_at` | Last viewed timestamp |

Progress behavior:

1. When a user opens a lesson, mark it as `in_progress`.
2. When they click “Mark Complete,” mark it as `completed`.
3. Course progress is calculated as:

```text
completed lessons / total published lessons
```

4. Store the last viewed lesson so the dashboard can show “Continue Course.”
5. Do not build video-percentage tracking unless needed later.

---

# 9. Public course catalog page

## Purpose

A public page where visitors and members can browse courses.

## Layout

```text
Courses

[Optional search/filter bar]

[Course Card]
Image
Course Title
Short description
12 lessons · 2 hours
$97 or Included with Membership
[View Course]

[Course Card]
...
```

## Course card fields

Each card should show:

| Element | Description |
|---|---|
| Image | Course thumbnail |
| Title | Linked course title |
| Short description | 1–2 sentence summary |
| Lesson count | Example: “12 lessons” |
| Duration | Optional |
| Price/access label | “$97,” “Free,” or “Included with membership” |
| Progress | Show only for logged-in enrolled users |
| CTA | View Course, Start Course, Continue, or Buy Now |

## CTA logic

| User state | CTA |
|---|---|
| Logged out, paid course | View Course / Buy Now |
| Logged out, free course | Create Account / Enroll Free |
| Logged in, not enrolled | Buy Now / Enroll |
| Logged in, enrolled, not started | Start Course |
| Logged in, enrolled, in progress | Continue Course |
| Logged in, completed | Review Course |

---

# 10. Public course sales/detail page

## Purpose

This is the page that sells or explains the course.

## Layout

```text
Course Title
Short benefit-driven summary

[Hero image or promo video]

[CTA card]
Price
Access details
[Buy Course] / [Start Course] / [Continue Course]

What you'll learn
- Bullet
- Bullet
- Bullet

Course curriculum
Module 1
  Lesson 1
  Lesson 2
Module 2
  Lesson 3
  Lesson 4

Course description

FAQ, optional
```

## Required sections

| Section | Description |
|---|---|
| Hero | Course title, summary, image/video |
| CTA card | Price/access and action button |
| What you’ll learn | Outcome-focused bullets |
| Curriculum preview | Modules and lesson titles |
| Description | Full course copy |
| Access information | Lifetime access, membership access, etc. |
| FAQ | Optional |

## Curriculum preview behavior

Show all modules and lesson titles publicly, but lock non-preview lessons.

Example:

```text
Module 1: Welcome
✓ Welcome to the Course — Preview
🔒 Getting Started
🔒 Core Concept 1
```

If a lesson is marked as `is_preview = true`, logged-out users can view it.

## CTA behavior

| State | Button |
|---|---|
| Not logged in, not purchased | Buy Course |
| Logged in, not purchased | Buy Course |
| Purchased, not started | Start Course |
| Purchased, in progress | Continue Course |
| Completed | Review Course |
| Membership includes course | Start Course |
| Course unavailable | Join Waitlist / Coming Soon / Not Available |

---

# 11. Checkout and purchase flow

## Purpose

Allow both outside visitors and existing members to purchase courses.

## For logged-out visitors

Flow:

```text
Course Sales Page
  → Buy Course
    → Checkout
      → Create account or login
      → Payment
      → Successful purchase
      → CourseEnrollment created
      → Redirect to course start/dashboard
```

Checkout should collect:

| Field | Required? |
|---|---|
| First name | Yes |
| Last name | Yes |
| Email | Yes |
| Password | Yes, unless using magic link |
| Payment info | Yes for paid courses |

After purchase:

1. Create user account if needed.
2. Create order.
3. Mark order paid.
4. Create CourseEnrollment.
5. Send purchase confirmation email.
6. Send course access email.
7. Redirect to course.

## For logged-in members

Flow:

```text
Course Sales Page
  → Buy Course
    → Checkout with account prefilled
      → Payment
      → CourseEnrollment created
      → Redirect to course
```

Do not force existing users to create a new account.

## Payment integration

Use the platform’s existing payment system if available.

Recommended abstraction:

```text
CourseProduct
  connects Course to payment provider product/price
```

Payment providers could be:

- Stripe Checkout
- WooCommerce product
- Existing platform checkout
- Manual/admin comp

The agent should not hardcode course access directly into Stripe logic. Payment success should trigger a generic “grant course access” function.

Example:

```text
onPaymentSuccess(order):
  for each purchased course product:
    create CourseEnrollment(user, course)
```

---

# 12. Course access rules

Access should be centralized.

A user can access a course if:

```text
User has active CourseEnrollment
OR user has active membership tier that includes course
OR course is free and user is enrolled
OR admin granted manual access
```

Do not scatter access logic throughout templates.

Create a reusable function:

```text
canUserAccessCourse(userId, courseId)
```

Create another function:

```text
canUserAccessLesson(userId, lessonId)
```

Lesson access rules:

| Lesson type | Access rule |
|---|---|
| Preview lesson | Public access allowed |
| Free course lesson | Logged-in enrolled users |
| Paid course lesson | User must have active enrollment |
| Membership-included lesson | User must have membership enrollment/access |
| Draft lesson | Admin only |

---

# 13. Student dashboard / My Courses page

## Purpose

A logged-in user should have one clean place to see their courses.

## Layout

```text
My Courses

Continue Learning
[Course Card]
Course title
Progress: 42%
Last lesson: Lesson 4
[Continue]

All My Courses
[Course Card]
[Course Card]

Completed Courses
[Course Card]
```

## Course card for enrolled user

Show:

| Element | Description |
|---|---|
| Course image | Thumbnail |
| Course title | Linked |
| Progress bar | Percentage complete |
| Completed lessons | Example: “5 of 12 lessons complete” |
| Last viewed lesson | Resume point |
| CTA | Start, Continue, or Review |

## Empty state

If user has no courses:

```text
You don’t have any courses yet.

Browse available courses to get started.
[Browse Courses]
```

---

# 14. Course player page

## Purpose

This is where the student consumes course content.

## Layout

```text
------------------------------------------------
LEFT SIDEBAR
Course title
Progress bar

Module 1
✓ Lesson 1
→ Lesson 2
○ Lesson 3

Module 2
🔒 Lesson 4, if not accessible

MAIN CONTENT
Lesson title

[Video/audio/content]

Downloads/resources

[Mark Complete]

[Previous Lesson] [Next Lesson]
------------------------------------------------
```

## Main lesson area

Should include:

| Element | Description |
|---|---|
| Lesson title | Large heading |
| Video/audio | If provided |
| Text content | Rich text |
| Downloads | Resource list |
| Mark complete button | Updates progress |
| Previous/next navigation | Move through lessons |
| Back to course | Link back to course overview |
| Progress indicator | Course progress percentage |

## Sidebar curriculum

Sidebar should show:

| Element | Behavior |
|---|---|
| Modules | Collapsible or grouped |
| Lessons | Clickable if accessible |
| Completion icons | Completed/current/not started |
| Current lesson | Highlighted |
| Locked lessons | Show lock icon if inaccessible |
| Progress bar | At top |

## Mobile behavior

On mobile:

- Sidebar becomes collapsible drawer.
- Main lesson content comes first.
- “Course contents” button opens lesson list.
- Previous/next buttons are full-width.
- Mark Complete is sticky or prominent.

---

# 15. Admin course list

## Purpose

Admins need to manage courses.

## Layout

```text
Courses
[Add New Course]

Filters:
All | Published | Draft | Archived

Table:
Title | Price/Access | Lessons | Enrollments | Status | Updated
```

## Row actions

```text
Edit | View | Duplicate | Enrollments | Trash
```

## Useful columns

| Column | Description |
|---|---|
| Title | Course name |
| Access | Free, paid, membership, manual |
| Price | If paid |
| Lessons | Number of published lessons |
| Enrollments | Number of enrolled users |
| Status | Published/draft |
| Updated | Last updated date |

---

# 16. Admin course builder

## Purpose

Admins need to create/edit courses without code.

## Layout

```text
Edit Course

Course title
Slug
Short description
Full description
Featured image
Promo video

Course settings
Access type
Price/product
Status
Category/tags

Curriculum builder
Module 1
  Lesson 1
  Lesson 2
[+ Add Lesson]
[+ Add Module]

Sales page sections
What you'll learn
Who this is for
FAQ

[Save / Publish]
```

## Curriculum builder behavior

Required:

- Add module.
- Rename module.
- Delete module.
- Reorder modules.
- Add lesson inside module.
- Rename lesson inline.
- Reorder lessons.
- Move lesson between modules.
- Duplicate lesson.
- Edit lesson.
- Mark lesson as preview.
- Publish/draft individual lessons.

The curriculum builder should be drag-and-drop if possible, but simple up/down ordering is acceptable for V1.

---

# 17. Admin lesson editor

## Purpose

Admins need to edit individual lessons.

## Fields

```text
Lesson title
Slug
Parent course
Parent module
Lesson content
Video URL
Audio URL
Downloads/resources
Estimated duration
Preview lesson toggle
Status
Sort order
```

## Lesson content types

Support:

| Type | Description |
|---|---|
| Rich text | Main lesson body |
| Video URL/embed | Vimeo, YouTube, Bunny, Wistia, etc. |
| Audio URL/file | Audio lesson |
| Downloads | PDFs, worksheets, resources |
| Embed block | Optional |

Do not build quiz/assignment UI.

---

# 18. Admin enrollment management

## Purpose

Admins need to see who has access to each course and manually grant/revoke access.

## Course enrollments page

From a course admin screen:

```text
Enrollments for [Course Name]

Search users...

Table:
Student | Email | Source | Status | Progress | Enrolled Date | Last Activity | Actions
```

## Actions

| Action | Description |
|---|---|
| Add student | Manually grant course access |
| Revoke access | Remove active enrollment |
| Restore access | Reactivate revoked enrollment |
| View progress | See lesson completion |
| Reset progress | Optional |
| Resend access email | Sends course login/access email |

## Manual enrollment flow

```text
[Add Student]
Search existing user by name/email
or create new user by email

Grant access to:
[Course Name]

Send access email?
[ ] Yes

[Grant Access]
```

---

# 19. Emails

Keep emails simple.

## Required emails

| Email | Trigger |
|---|---|
| Purchase confirmation | User buys course |
| Course access email | Enrollment is created |
| Manual access email | Admin grants access |
| Password/account setup email | New outside buyer needs account setup |
| Course completion email | Optional V1/V2 |

## Purchase confirmation email

```text
Subject: Your course is ready: [Course Name]

Hi [First Name],

Thanks for purchasing [Course Name].

You can access your course here:
[Start Course]

Order summary:
Course: [Course Name]
Amount: [$97]

Need help? Contact us at [support email].
```

## Manual access email

```text
Subject: You now have access to [Course Name]

Hi [First Name],

You’ve been given access to [Course Name].

Start here:
[Course Link]
```

---

# 20. Public/private access behavior

## If logged-out user visits locked lesson

Show:

```text
This lesson is part of [Course Name].

To continue, purchase or log in with an account that has access.

[Buy Course] [Log In]
```

## If logged-in user without access visits locked lesson

Show:

```text
You don’t currently have access to this course.

[Buy Course]
```

## If user has access

Show lesson content.

## If lesson is preview

Show lesson content even if logged out, with CTA:

```text
Enjoying this preview?
[Buy Course]
```

---

# 21. Progress and completion behavior

## Lesson completion

A user manually clicks:

```text
[Mark Complete]
```

After completion:

- Button changes to “Completed.”
- Sidebar updates checkmark.
- Progress bar updates.
- Next lesson CTA becomes prominent.

## Course completion

When all published lessons are completed:

```text
Course complete!
You’ve completed [Course Name].

[Review Course] [Browse More Courses]
```

No certificate required.

## Progress calculation

```text
progress = completed_published_lessons / total_published_lessons
```

Draft lessons should not count.

Preview lessons count only if they are part of the course and the enrolled user completes them.

---

# 22. Course commerce behavior

## Course product model

Each paid course should be connected to a product/payment item.

Fields:

| Field | Description |
|---|---|
| `course_id` | Course being sold |
| `product_id` | Stripe/WooCommerce/internal product ID |
| `price_id` | Stripe price ID if applicable |
| `price` | Display price |
| `currency` | Currency |
| `purchase_type` | One-time, subscription, included |
| `access_duration` | Lifetime or limited |
| `status` | Active/inactive |

## Access after purchase

On successful payment:

```text
1. Find purchased CourseProduct.
2. Find related Course.
3. Create or update CourseEnrollment.
4. Set status to active.
5. Send course access email.
6. Redirect user to course.
```

## Refund/cancellation behavior

If an order is refunded:

- Option A: revoke course access automatically.
- Option B: leave access active and let admin revoke manually.

Make this a setting.

Recommended V1 default:

```text
Refunded course purchase = revoke access.
```

---

# 23. Admin settings

Add a simple course settings page.

## Settings sections

```text
Courses Settings

General
- Course catalog page
- My Courses page
- Default lesson completion behavior
- Require login for free courses

Commerce
- Checkout provider
- Refund behavior
- Default currency

Emails
- Purchase confirmation email
- Course access email
- Manual enrollment email

Display
- Show course progress
- Show lesson count
- Show estimated duration
- Show curriculum preview
```

Keep this simple.

---

# 24. Recommended URLs

Use clean URLs.

```text
/courses
/courses/{course-slug}
/courses/{course-slug}/lessons/{lesson-slug}
/my-courses
/checkout?course={course-id}
/course-purchase/success
```

Optional admin routes:

```text
/admin/courses
/admin/courses/{id}
/admin/courses/{id}/builder
/admin/courses/{id}/enrollments
/admin/lessons/{id}
```

---

# 25. User states to handle

The system needs to handle these user states cleanly:

| User state | Expected behavior |
|---|---|
| Logged out visitor | Can view catalog and course sales pages |
| Logged out visitor buys course | Account is created or login required at checkout |
| Existing member buys course | Purchase attaches to existing account |
| Existing member has included access | Can start course without purchase |
| User bought course | Can access course and lessons |
| User refunded | Access revoked or flagged based on settings |
| Admin manually grants access | User gets enrollment and email |
| Admin revokes access | User loses access |
| User completes lesson | Progress updates |
| User completes course | Course marked complete |

---

# 26. MVP build order

Build in this order.

## Phase 1: Course content structure

1. Course model.
2. Module model.
3. Lesson model.
4. Admin course list.
5. Admin course editor.
6. Curriculum builder.
7. Lesson editor.

## Phase 2: Public course experience

1. Course catalog.
2. Course sales page.
3. Curriculum preview.
4. Course player.
5. Locked/preview lesson behavior.

## Phase 3: User access and progress

1. Enrollment model.
2. Access control.
3. My Courses dashboard.
4. Lesson progress.
5. Mark complete.
6. Continue course behavior.

## Phase 4: Commerce

1. CourseProduct model.
2. Checkout integration.
3. Payment success → enrollment.
4. Purchase confirmation email.
5. Course access email.
6. Refund/revoke behavior.

## Phase 5: Admin management

1. Course enrollment list.
2. Manual grant access.
3. Revoke access.
4. View student progress.
5. Resend access email.

Do not start with quizzes, certificates, drip, or advanced reporting.

---

# 27. Acceptance criteria

Give the agent these exact acceptance tests.

## Course structure

1. Admin can create a course.
2. Admin can add modules to a course.
3. Admin can add lessons inside modules.
4. Admin can reorder modules.
5. Admin can reorder lessons.
6. Admin can mark a lesson as preview.
7. Admin can publish/draft courses and lessons.
8. Draft lessons do not appear to students.

## Public pages

1. Public visitors can view the course catalog.
2. Public visitors can view course sales pages.
3. Course sales page shows course image, description, price, CTA, and curriculum preview.
4. Preview lessons are accessible without purchase.
5. Locked lessons show a purchase/login prompt.

## Purchase/access

1. Logged-out visitor can purchase a course.
2. Checkout creates or connects a user account.
3. Successful payment creates active enrollment.
4. Failed payment does not create enrollment.
5. Existing logged-in user can purchase course without duplicate account.
6. Purchased course appears in My Courses.
7. User can access lessons after purchase.
8. Refunded purchase revokes access if setting is enabled.

## Student dashboard

1. User can see all enrolled courses.
2. Course card shows progress.
3. User can continue from last viewed lesson.
4. Completed courses are marked complete.

## Course player

1. User can navigate between lessons.
2. Sidebar shows modules and lessons.
3. Current lesson is highlighted.
4. Completed lessons show checkmarks.
5. Mark Complete updates progress.
6. Previous/Next buttons work.
7. Mobile layout is usable.

## Admin enrollment

1. Admin can view enrolled users for a course.
2. Admin can manually grant course access.
3. Admin can revoke course access.
4. Admin can resend access email.
5. Admin can view basic student progress.

---

# 28. Common mistakes to avoid

## Mistake 1: Building a full LMS

Do not add unnecessary LMS features. No certificates, quizzes, assignments, instructors, prerequisites, drip, or grading right now.

## Mistake 2: Making courses just protected pages

Courses need structured modules, lessons, enrollments, and progress tracking.

## Mistake 3: No clean access model

Do not check access randomly in templates. Build reusable access functions.

Required:

```text
canUserAccessCourse(userId, courseId)
canUserAccessLesson(userId, lessonId)
```

## Mistake 4: No purchase-to-enrollment connection

Payment success must automatically create course enrollment.

## Mistake 5: No account flow for outside buyers

Outside buyers must be able to purchase and get course access without already being a platform member.

## Mistake 6: No student dashboard

Users need a clear “My Courses” area.

## Mistake 7: No resume behavior

A user should not have to remember where they left off.

## Mistake 8: Overcomplicated admin

The course builder should be simple: course → modules → lessons.

---

# 29. Copy/paste prompt for the IDE agent

```text
Build a simple Course Commerce + Course Delivery system for our membership platform.

This is not a full LMS. Do not build certificates, instructors, quizzes, assessments, assignments, prerequisites, drip content, gradebooks, SCORM, gamification, or complex academic features.

The goal is to let both logged-in members and outside visitors purchase individual courses and access them inside the platform.

Core user flow:
Course Catalog → Course Sales Page → Checkout → Account/Enrollment → My Courses Dashboard → Course Player → Lesson Progress

Required entities:
- Course
- Module
- Lesson
- CourseEnrollment
- LessonProgress
- CourseProduct
- Order/Purchase connection
- Download/Resource

Course:
- title, slug, short description, full description, featured image, promo video, status, visibility, price, currency, access type, product/payment ID, estimated duration, category/tags, what-you-get bullets, sort order.

Module:
- course_id, title, description, sort_order, status.

Lesson:
- course_id, module_id, title, slug, rich text content, video URL, audio URL, downloads/resources, estimated duration, sort_order, is_preview, status.

Enrollment:
- user_id, course_id, source, order_id, status, enrolled_at, expires_at, last_accessed_lesson_id, completed_at, progress_percent.

LessonProgress:
- user_id, course_id, lesson_id, status, started_at, completed_at, last_viewed_at.

Required public pages:
1. Course catalog page
   - Course cards with image, title, short description, lesson count, duration, price/access label, and CTA.
   - CTA changes based on user state: View Course, Buy Now, Start Course, Continue Course, Review Course.

2. Course sales page
   - Hero area with title, summary, image/video.
   - CTA card with price and action.
   - What you’ll learn.
   - Curriculum preview.
   - Full course description.
   - Optional FAQ.
   - Preview lessons visible publicly.
   - Locked lessons show purchase/login prompt.

3. Checkout flow
   - Logged-out visitors can buy and create account.
   - Logged-in members can buy without duplicate account.
   - Successful payment creates CourseEnrollment.
   - Failed payment does not create CourseEnrollment.
   - After purchase, redirect to course or My Courses.

4. My Courses dashboard
   - Shows enrolled courses.
   - Progress bar.
   - Last viewed lesson.
   - Continue button.
   - Completed course state.
   - Empty state linking to course catalog.

5. Course player
   - Sidebar with modules/lessons.
   - Current lesson highlighted.
   - Completed lessons checked.
   - Main content area for video/audio/text/downloads.
   - Mark Complete button.
   - Previous/Next navigation.
   - Mobile responsive with collapsible curriculum.

Required admin pages:
1. Course list
   - Columns: title, access type, price, lesson count, enrollments, status, updated date.
   - Row actions: edit, view, duplicate, enrollments, trash.

2. Course editor/builder
   - Course title, slug, short description, full description, image, promo video.
   - Access settings: free, paid, membership-included, manual.
   - Product/payment connection.
   - Curriculum builder with modules and lessons.
   - Add/reorder/rename/delete modules.
   - Add/reorder/rename/duplicate/edit lessons.
   - Mark lesson as preview.
   - Publish/draft lessons.

3. Lesson editor
   - Lesson title, content, video URL, audio URL, downloads, estimated duration, preview toggle, status, parent module/course.

4. Enrollment management
   - View students enrolled in each course.
   - Manually grant access.
   - Revoke access.
   - View progress.
   - Resend access email.

Required access functions:
- canUserAccessCourse(userId, courseId)
- canUserAccessLesson(userId, lessonId)

Access rules:
- User can access course if they have active CourseEnrollment.
- User can access course if their active membership tier includes it.
- User can access preview lessons without purchase.
- Draft lessons are admin-only.
- Locked lessons show login/purchase prompt.

Progress:
- Opening a lesson marks it in progress.
- Clicking Mark Complete marks lesson complete.
- Course progress = completed published lessons / total published lessons.
- Store last viewed lesson for resume behavior.
- Course completes when all published lessons are complete.
- No certificate required.

Commerce:
- Each paid course connects to a CourseProduct/payment item.
- On payment success, create enrollment.
- On failed payment, do not create enrollment.
- On refund, revoke access if refund behavior setting is enabled.
- Do not hardcode Stripe logic into course access. Use a generic grantCourseAccess function after payment success.

Emails:
- Purchase confirmation email.
- Course access email.
- Manual enrollment email.
- Account setup email for new buyers.

Settings:
- Course catalog page.
- My Courses page.
- Checkout provider.
- Refund behavior.
- Default currency.
- Email settings.
- Display settings for progress, duration, lesson count, curriculum preview.

Acceptance tests:
- Admin can create course, modules, and lessons.
- Admin can reorder modules and lessons.
- Admin can mark a lesson as preview.
- Public visitors can view catalog and sales pages.
- Preview lessons are accessible without purchase.
- Locked lessons require purchase/login.
- Logged-out visitor can purchase and get account/course access.
- Logged-in member can purchase without duplicate account.
- Successful payment creates enrollment.
- Failed payment does not create enrollment.
- Purchased course appears in My Courses.
- User can start, continue, and complete course.
- Mark Complete updates progress.
- Admin can manually grant and revoke access.
- Admin can view enrolled students and basic progress.
```

---

# Final narrowed positioning

The cleanest way to describe this to the agent is:

> Build a lightweight course commerce and delivery system, not a full LMS. It should support paid courses, member access, structured modules/lessons, a student dashboard, lesson progress, and a polished course player. Avoid academic LMS features unless we explicitly add them later.
