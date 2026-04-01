-- =============================================================================
-- supabase/seed.sql
-- Positives platform — realistic test content seed
-- Updated Sprint 11 QA pass: uses current schema (0001–0011b applied).
--
-- Columns present in live DB:
--   id, title, description, type (enum), vimeo_video_id, s3_audio_key,
--   castos_episode_url, transcription, ai_generated_title, ai_generated_description,
--   duration_seconds, published_at, month_theme, tags, is_active,
--   created_at, updated_at, status (enum), publish_date, week_start, month_year,
--   excerpt, source (enum), source_ref, admin_notes, is_today_override,
--   body, reflection_prompt, download_url, youtube_video_id, resource_links (jsonb NOT NULL),
--   search_vector, tier_min (subscription_tier), starts_at, join_url
--
-- NOT NULL columns that need explicit values or must not be overridden with null:
--   title, type, tags (default '{}'), is_active (default false),
--   status (default 'draft'), source (default 'admin'),
--   is_today_override (default false), resource_links (default '[]')
-- =============================================================================

-- Clear existing seeded content so this is idempotent
-- (keeps any data created via admin UI intact only if it differs from seeded rows)
DELETE FROM public.content
WHERE source = 'admin' AND admin_notes LIKE 'seed:%';

-- ─── DAILY AUDIO ─────────────────────────────────────────────────────────────
-- 10 daily_audio items across the last 10 days + today

INSERT INTO public.content (
  type, title, excerpt, description, body, reflection_prompt,
  status, publish_date, duration_seconds,
  castos_episode_url, s3_audio_key,
  tags, resource_links, source, admin_notes, is_active
) VALUES

-- Day -9
(
  'daily_audio',
  'Beginning with Gratitude',
  'A short grounding practice to open your day with what is already good.',
  'Dr. Paul guides a simple 8-minute gratitude scan to anchor your morning.',
  '## What this practice does
Starting the day with a structured gratitude moment lowers cortisol, primes attention for positive inputs, and sets an intentional emotional baseline before the noise begins.

This is not a cheerful exercise — it is a deliberate neurological reset.',
  'What is one thing present in your life right now that you did not create yourself?',
  'published',
  (CURRENT_DATE - INTERVAL '9 days')::date,
  480,
  'https://feeds.castos.com/example/episodes/001-beginning-with-gratitude.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_001', true
),

-- Day -8
(
  'daily_audio',
  'The Pause Before Reacting',
  'Train the gap between stimulus and response.',
  'An 8-minute practice for building the reflex of conscious pause.',
  '## The 3-second door

Between every trigger and every reaction, there is a door. This practice trains your nervous system to find it.

Dr. Paul walks through a slow-breathing anchor technique that creates that pause on demand.',
  'Where in yesterday did you react before you paused? What would have changed with 3 more seconds?',
  'published',
  (CURRENT_DATE - INTERVAL '8 days')::date,
  490,
  'https://feeds.castos.com/example/episodes/002-pause-before-reacting.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_002', true
),

-- Day -7
(
  'daily_audio',
  'Letting Go of the Score',
  'Release the mental ledger you keep of who owes you what.',
  'A grounding practice for releasing resentment and the need to keep score.',
  '## The invisible ledger

Most people carry a running tally — who helped them, who let them down, who still owes them. This ledger is exhausting and usually invisible.

This practice teaches you to notice the ledger and consciously set it down.',
  'What or who are you still keeping score with? Is the tally making you stronger or heavier?',
  'published',
  (CURRENT_DATE - INTERVAL '7 days')::date,
  510,
  'https://feeds.castos.com/example/episodes/003-letting-go-of-score.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_003', true
),

-- Day -6
(
  'daily_audio',
  'Trust the Process, Not the Timeline',
  'Good things grow on their own schedule.',
  'A calming practice for anxiety around timing, outcomes, and not being where you expected.',
  '## Your timeline is not broken

When progress feels invisible, the tendency is to catastrophize. This practice trains a different lens: evidence-gathering for quiet momentum.',
  'Where in your life are you impatient with the timeline? What evidence of movement can you actually see?',
  'published',
  (CURRENT_DATE - INTERVAL '6 days')::date,
  465,
  'https://feeds.castos.com/example/episodes/004-trust-the-process.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_004', true
),

-- Day -5
(
  'daily_audio',
  'What You Choose to Amplify',
  'What you feed grows. What you ignore shrinks.',
  'A morning attention practice for noticing what you unconsciously amplify.',
  '## The amplification effect

Every thought you return to becomes louder. Every fear you rehearse becomes more real. This is not weakness — it is how brains work.

This practice gives you a tool to catch amplification loops early and redirect.',
  'What worry or frustration have you been feeding repeatedly this week? What would it look like to underfeed it?',
  'published',
  (CURRENT_DATE - INTERVAL '5 days')::date,
  500,
  'https://feeds.castos.com/example/episodes/005-what-you-amplify.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_005', true
),

-- Day -4
(
  'daily_audio',
  'The Difference Between Rest and Escape',
  'Not all downtime restores you.',
  'A 9-minute reflection practice for understanding what genuinely recharges you.',
  '## Rest vs escape

Scrolling is not rest. Numbing is not rest. Rest is deliberate disconnection that leaves you more whole.

This practice helps you identify the difference in your own life — and make more intentional choices with recovery time.',
  'When did you last feel genuinely restored? What were you doing? How can you protect more time for that?',
  'published',
  (CURRENT_DATE - INTERVAL '4 days')::date,
  540,
  'https://feeds.castos.com/example/episodes/006-rest-vs-escape.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_006', true
),

-- Day -3
(
  'daily_audio',
  'Being a Fair Witness to Yourself',
  'Neither self-criticism nor self-excuse — just honest observation.',
  'A mindfulness-rooted practice for seeing yourself clearly without judgment.',
  '## The fair witness

The inner critic is not a fair witness. Neither is the inner defender. A fair witness sees what is, without punishment or excuse.

This practice develops that muscle.',
  'Where have you been unfair to yourself lately — either too harsh or too quick to excuse?',
  'published',
  (CURRENT_DATE - INTERVAL '3 days')::date,
  480,
  'https://feeds.castos.com/example/episodes/007-fair-witness.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_007', true
),

-- Day -2
(
  'daily_audio',
  'Speaking Before You Are Certain',
  'Perfectionism in communication keeps real connection out.',
  'A practice about speaking from your current honest state, not your idealized one.',
  '## Good enough to say

Waiting until you have perfect clarity before sharing is often fear wearing the mask of standards. This practice works on the courage of imperfect expression.',
  'Where are you waiting to be "ready enough" to say something important to someone in your life?',
  'published',
  (CURRENT_DATE - INTERVAL '2 days')::date,
  495,
  'https://feeds.castos.com/example/episodes/008-speaking-before-certain.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_008', true
),

-- Yesterday
(
  'daily_audio',
  'The Small Win You Overlooked',
  'Progress often whispers. You have to listen for it.',
  'A practice for acknowledging genuine progress that your brain tends to discount.',
  '## Your brain discounts the ordinary

Wins that become routine stop feeling like wins. This practice deliberately reverses that — surfacing overlooked progress as real evidence of growth.',
  'What happened in the last 48 hours that you moved past too quickly without crediting yourself?',
  'published',
  (CURRENT_DATE - INTERVAL '1 day')::date,
  470,
  'https://feeds.castos.com/example/episodes/009-small-win.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_009', true
),

-- Today
(
  'daily_audio',
  'Showing Up as You Actually Are',
  'Authenticity is the only sustainable performance.',
  'Today''s grounding practice on dropping the performance and showing up real.',
  '## The performance cost

Playing a curated version of yourself requires constant energy. Authenticity is not just a value — it is physically easier to sustain.

Dr. Paul guides a short practice for settling into who you actually are today, not who you planned to be.',
  'In what relationship or context this week have you been performing rather than present? What would it take to show up more real?',
  'published',
  CURRENT_DATE,
  505,
  'https://feeds.castos.com/example/episodes/010-showing-up-as-you-are.mp3',
  null,
  '{}', '[]', 'admin', 'seed: daily_audio_010', true
),

-- ─── WEEKLY PRINCIPLE ────────────────────────────────────────────────────────
-- 4 weekly_principle items: this week + 3 prior weeks

(
  'weekly_principle',
  'Honest Taking Precedes Honest Giving',
  'Before you can give from abundance, you must honestly acknowledge what you have.',
  'This week''s principle explores the relationship between honest self-awareness and generous action.',
  '## The paradox of giving

Many people try to give from a place of unconscious depletion — and call it generosity. Dr. Paul explores how honest self-accounting creates sustainable giving.

**This week, notice:**
- Where are you giving reactively rather than intentionally?
- What would you need to take stock of before you give more freely?

The most generous people are often the most honest about their own state.',
  'Where this week are you giving from genuine surplus vs from a sense of obligation?',
  'published',
  (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 * INTERVAL '1 day')::date,
  null,
  null, null,
  '{}', '[]', 'admin', 'seed: weekly_principle_001', true
),

(
  'weekly_principle',
  'The Compound Interest of Small Integrity',
  'Every micro-honesty builds the foundation for big trustworthiness.',
  'Small consistent integrity over time builds the infrastructure for your most important relationships.',
  '## Integrity compounds

Trust is not built in grand gestures. It is built in the accumulation of small, unkept promises never made and small, kept ones never celebrated.

This week''s principle examines where your small integrity either builds or erodes your larger relationships.',
  'Where this week did you keep or break a small commitment to yourself or someone else?',
  'published',
  ((CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 * INTERVAL '1 day') - INTERVAL '7 days')::date,
  null,
  null, null,
  '{}', '[]', 'admin', 'seed: weekly_principle_002', true
),

(
  'weekly_principle',
  'Curiosity Over Judgment as a Default Mode',
  'Judgment closes. Curiosity opens.',
  'Training yourself to default to genuine curiosity before evaluation changes everything.',
  '## The judgment reflex

Judgment is fast, efficient, and often wrong. It is the brain''s energy-saving shortcut. Curiosity is slower, more expensive, and almost always more accurate.

This week, practice the discipline of the question before the verdict.',
  'Where this week did you judge quickly when you could have stayed curious longer?',
  'published',
  ((CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 * INTERVAL '1 day') - INTERVAL '14 days')::date,
  null,
  null, null,
  '{}', '[]', 'admin', 'seed: weekly_principle_003', true
),

(
  'weekly_principle',
  'Presence as the Premium Offering',
  'In a world of distraction, full presence is rare and extraordinarily valuable.',
  'What would it mean to offer genuine, undistracted presence to the people who matter most?',
  '## The attention economy

Every conversation competes with dozens of notifications, background anxieties, and mental tabs. The person who can offer full, unhurried presence is exceptional.

This week''s principle is practical: what would it take to offer that quality of attention more often?',
  'Who in your life most deserves your full presence, and when did you last actually give it?',
  'published',
  ((CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7 * INTERVAL '1 day') - INTERVAL '21 days')::date,
  null,
  null, null,
  '{}', '[]', 'admin', 'seed: weekly_principle_004', true
),

-- ─── MONTHLY THEME ───────────────────────────────────────────────────────────
-- 3 monthly_theme items

(
  'monthly_theme',
  'The Foundation of Self-Trust',
  'Trust in yourself is not confidence — it is a track record you build on purpose.',
  'This month''s theme explores what it means to become someone you can rely on — starting with the relationship you have with yourself.',
  '## Month at a glance

Self-trust is not a feeling. It is a body of evidence. This month we examine how to build that evidence deliberately:

**Week 1:** What self-trust actually is (and is not)
**Week 2:** How small commitments build the foundation
**Week 3:** Recovering self-trust after it breaks
**Week 4:** Operating from self-trust in relationships

Each daily practice this month will connect to this theme. Come back to this page to see your progress.',
  'What is one commitment to yourself — small and specific — that you will keep this month?',
  'published',
  TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  null,
  null, null,
  '{}',
  '[{"label": "Dr. Paul on self-trust (article)", "url": "https://example.com/self-trust-article"}, {"label": "Monthly reflection worksheet", "url": "https://example.com/worksheet"}]',
  'admin', 'seed: monthly_theme_001', true
),

(
  'monthly_theme',
  'The Practice of Receiving',
  'Learning to receive help, praise, and love without deflecting is a skill — and a profound one.',
  'Last month explored giving. This month we look at the equally important and often neglected practice of receiving well.',
  '## Why receiving is hard

Most high-functioning people have well-developed giving muscles and underdeveloped receiving muscles. They deflect compliments, refuse help, and privately feel fraudulent when recognized.

This month''s practices directly address that imbalance.

**What changes when you receive well:**
- Others feel genuinely impactful
- You model vulnerability for the people around you
- Your relationships deepen
- Your energy stops leaking through constant outward performance',
  'On a scale of 1–10, how good are you at receiving? What happens in your body when someone offers you genuine appreciation?',
  'published',
  TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'),
  null,
  null, null,
  '{}', '[]', 'admin', 'seed: monthly_theme_002', true
),

(
  'monthly_theme',
  'The Architecture of Difficult Conversations',
  'Difficult conversations are not events — they are structures you can learn to build.',
  'Two months ago the theme was self-trust. Three months of foundation. This month closes the loop with the hardest application: saying the true thing to the important person.',
  '## What makes conversations difficult

Not the facts. Not even the emotion. It is the gap between what is true and what feels safe to say.

This month''s practices provide a framework for closing that gap without forcing the conversation — letting it emerge from genuine readiness.',
  'What conversation are you avoiding right now? What is the cost of that avoidance — to the relationship, and to you?',
  'published',
  TO_CHAR(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'),
  null,
  null, null,
  '{}', '[]', 'admin', 'seed: monthly_theme_003', true
),

-- ─── COACHING CALLS ──────────────────────────────────────────────────────────
-- 3 coaching_call items: 2 past replays + 1 upcoming

-- Past replay 1 (with Vimeo replay)
(
  'coaching_call',
  'Building Your Self-Trust Foundation',
  'A deep-dive coaching session on the practical steps to recovering and building self-trust.',
  'In this session, Dr. Paul worked with the group on specific techniques for identifying where self-trust has eroded and how to begin rebuilding it through small, trackable commitments.',
  '## Session summary

**Topics covered:**
- The 3 most common ways self-trust breaks (and they are not what you think)
- The micro-commitment framework: starting smaller than feels meaningful
- How to audit your own integrity cheaply, without shame
- Q&A from the group

**Key takeaway:** Self-trust rebuilds at the pace you prove you can keep promises to yourself. Start embarrassingly small.',
  null,
  'published',
  null,
  3780,
  null, null,
  '{}', '[]', 'admin', 'seed: coaching_call_001', true
),

-- Past replay 2 (with YouTube replay)
(
  'coaching_call',
  'The Art of Receiving Feedback Without Closing',
  'How to hear hard things without defensiveness — a coaching session on the receiving posture.',
  'Dr. Paul led this group session on the neuroscience of threat response in feedback situations, and how to physically and mentally stay open.',
  '## Session summary

**Topics covered:**
- Why the brain treats criticism as physical threat (and what to do about it)
- The 4-second pause technique before responding to hard feedback
- Distinguishing critique from attack — a practical framework
- Role-play exercises from the group

**Key takeaway:** Defensiveness is not a character flaw — it is a survival reflex. You can retrain the reflex.',
  null,
  'published',
  null,
  3600,
  null, null,
  '{}', '[]', 'admin', 'seed: coaching_call_002', true
),

-- Upcoming call (in 5 days)
(
  'coaching_call',
  'Difficult Conversations: The Live Practice Session',
  'Bring a real conversation you''ve been avoiding. We''ll work through it live.',
  'This month''s theme is The Architecture of Difficult Conversations. Come ready to work on something real — Dr. Paul will guide live examples with volunteers from the group.',
  '## What to prepare

Come to this session with:
1. One conversation you have been avoiding for more than 2 weeks
2. Your honest answer to: what is the worst realistic outcome?
3. What you actually want from the conversation (not what you want them to do)

This is a working session, not a lecture. Bring something real.',
  null,
  'published',
  null,
  null,
  null, null,
  '{}', '[]', 'admin', 'seed: coaching_call_003', true
);

-- Update the coaching call replays with video IDs and the upcoming one with starts_at + join_url
-- (Can't set these in the INSERT above cleanly with CTEs, so update after)

UPDATE public.content
SET vimeo_video_id = '824651839',
    tier_min = 'level_3'
WHERE admin_notes = 'seed: coaching_call_001' AND source = 'admin';

UPDATE public.content
SET youtube_video_id = 'dQw4w9WgXcQ',  -- placeholder YouTube ID
    tier_min = 'level_3'
WHERE admin_notes = 'seed: coaching_call_002' AND source = 'admin';

UPDATE public.content
SET
  starts_at = (NOW() + INTERVAL '5 days')::timestamptz,
  join_url = 'https://us02web.zoom.us/j/82345678910?pwd=example_test_link',
  tier_min = 'level_3'
WHERE admin_notes = 'seed: coaching_call_003' AND source = 'admin';

-- Ensure all coaching calls have correct tier gating
UPDATE public.content
SET tier_min = 'level_3'
WHERE type = 'coaching_call' AND source = 'admin' AND admin_notes LIKE 'seed:%';
