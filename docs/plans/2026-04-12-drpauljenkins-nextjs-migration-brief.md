# drpauljenkins.com Next.js Migration Brief

## Purpose
This brief frames the likely best path for rebuilding `drpauljenkins.com` as a modern `Next.js` site on `Vercel`.

## Why This Matters
`drpauljenkins.com` is part of the broader legacy stack currently tied to:
- Liquid Web
- WordPress
- ClickFunnels
- Infusionsoft / Keap
- WordPress plugin dependencies around forms, membership, events, and courses

Rebuilding it cleanly can reduce legacy dependence over time, but it should not become a giant 1:1 WordPress migration.

## Recommended Strategy
- do not clone everything
- rebuild the highest-value public pages first
- keep the public brand cleaner and simpler than the old site
- leave low-value legacy pages, archives, and funnel sprawl for later decisions

## Recommended Phase 1 Scope
Rebuild first:
- homepage
- speaking / book Dr. Paul page
- products and services overview
- contact page
- testimonials / success stories page
- shared header, footer, navigation, and SEO foundation

## Recommended Phase 2 Scope
Decide later:
- whether the blog stays on WordPress temporarily
- whether selected blog content should be pulled via WP API
- which legacy funnel pages are worth rebuilding
- whether podcast / webinar pages should be simplified or rebuilt

## What Not To Do First
- do not do a 1:1 WordPress rebuild
- do not rebuild every blog/archive/resource page
- do not preserve weak information architecture just because it exists today
- do not let old plugin behavior dictate the new site structure

## Relationship To Positives
The site should work alongside Positives, not compete with it.

Good role for `drpauljenkins.com`:
- public brand site
- speaking site
- selected public offers and lead capture
- top-of-funnel credibility and authority

Less ideal role:
- trying to remain the full home of legacy membership infrastructure

## Recommended Discussion Questions
- What is the real job of drpauljenkins.com going forward?
- Which current pages still matter?
- Which pages are mainly legacy leftovers?
- Should the blog remain on WordPress for a while?
- Which funnels belong on Vercel first?

## Success Definition
- clearer public brand site
- faster and cleaner than the WordPress version
- easier to maintain
- less dependence on Liquid Web and old plugin sprawl
- supports the broader platform simplification strategy
