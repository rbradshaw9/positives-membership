# Events Pages Design Direction And Phased Implementation Plan

## Purpose

This plan merges the larger Events implementation roadmap with the detailed UI requirements from `docs/plans/events_calendar_ui_design_brief.md`.

The goal is to prevent the Events system from becoming a pile of functional admin forms that need a separate design pass later. Each phase below includes the data/admin/member behavior and the page design requirements that must ship with it.

## Source Documents

- `docs/plans/events_calendar_ui_design_brief.md`
- `docs/decisions/2026-04-16-live-events-and-coaching-launch-model.md`
- Current Events implementation in `/app/(member)/events/*` and `/app/admin/events/*`

## Product Direction

Events should feel similar to The Events Calendar plus Event Tickets, adapted for Positives:

- Member-facing pages are calm, card-based, mobile-first, and conversion-oriented.
- Admin pages are operational, table/form-heavy, and familiar to a WordPress admin user.
- Events are the primary content record.
- Venues and hosts are reusable related content.
- Tickets, RSVPs, orders, attendees, and check-ins are operational records attached to an event.
- Events remain member-only for now.
- Access remains server-side through Supabase membership checks.
- Stripe remains the only payment provider for paid event tickets.

## Non-Negotiable Design Rules

- Do not ship a schema/admin feature without the matching member/admin page design state.
- Do not ship a list page without empty states, loading/error states where applicable, and mobile behavior.
- Do not ship a ticketing feature without inventory, attendee, payment, and confirmation states.
- Do not duplicate host or venue text into events as the main model. Events should reference reusable records.
- Do not make tickets an `event.price` field. Events have ticket types.
- Do not create attendees before RSVP confirmation or successful payment.
- Do not use guessable attendee IDs for QR check-in.
- Do not expose Zoom start/host URLs to members.
- Do not expose private host contact fields.

## Phase 0: Event UI System Foundation

### Outcome

Create reusable UI patterns so every Events page feels cohesive as new functionality ships.

### Member Design Requirements

- Shared event card component for list pages, host pages, venue pages, and related events.
- Shared event status badges:
  - `Online`
  - `In person`
  - `Hybrid`
  - `Free`
  - `Ticket required`
  - `RSVP`
  - `Sold out`
  - `Canceled`
  - `Postponed`
- Shared date/time display that always includes the event timezone.
- Shared empty states:
  - no upcoming events
  - no matching events after filters
  - no host events
  - no venue events
  - event has passed
- Shared action labels:
  - `View Event`
  - `RSVP`
  - `Get Tickets`
  - `Join Event`
  - `Add to Calendar`

### Admin Design Requirements

- Shared admin table/list pattern for events, hosts, venues, tickets, and attendees.
- Shared admin filter toolbar pattern.
- Shared create/edit panel pattern for hosts, venues, tickets, and RSVPs.
- Shared publish/save action pattern.
- Shared danger/action area for archive/delete/cancel actions.

### Acceptance Criteria

- Event cards have a consistent visual style across `/events`, host detail pages, venue detail pages, and related event sections.
- Admin tables use a consistent toolbar, status badge, row action, and empty-state pattern.
- Mobile event cards use full-width touch-friendly CTAs.

## Phase 1: Events Browse And Single Event Page Redesign

### Outcome

Bring the member-facing Events calendar, list, and single event pages up to the design brief before deeper ticketing work expands.

### Routes

- `/events`
- `/events/[id]`

### Events Calendar Page Design

The `/events` page should support two primary views in this phase:

- Month
- List

The page should include:

- Page heading: `Events`
- Search/filter toolbar:
  - keyword search
  - month/date selector
  - event type filter
  - venue/location filter when venue data exists
  - reset/clear filters
- View toggle:
  - Month
  - List
- Previous/current/next navigation:
  - previous month
  - today/current month
  - next month
- Bottom actions:
  - previous events
  - next events
  - add/export calendar link when available

### Month View Design

Desktop:

- Use a traditional 7-column calendar grid.
- Show weekday headers.
- Show day number in the top-left.
- Show compact linked event titles in each day cell.
- Highlight today subtly.
- Mute past days.
- Use `+N more` when a day has more events than fit comfortably.
- Show lightweight hover/focus cards later, but structure the markup so they can be added cleanly.

Mobile:

- Do not shrink the desktop calendar into tiny cells with text.
- Use a compact month grid with event dots/count badges.
- Show selected date events below the grid as cards.
- Keep the filter controls stacked or collapsible.

### List View Design

- Group event cards by date.
- Each event card should show:
  - optional 16:9 image or neutral category placeholder
  - title
  - date/time/timezone
  - venue or online state
  - host summary
  - short excerpt
  - price/status badge
  - primary CTA based on availability
- Use these CTA rules:
  - ticketed and on sale: `Get Tickets`
  - RSVP available: `RSVP`
  - published but no registration required: `View Event`
  - eligible join link available: `Join Event`
  - sold out: `View Event`

### Single Event Page Design

Use the brief's conversion layout:

```text
Header:
Event type/category eyebrow
Event title
Date/time/timezone
Hosted by...
Status badges

Main layout:
Left column, about 65%
- 16:9 hero image or category placeholder
- Event description
- Ticket/RSVP module
- Add to calendar
- Related/upcoming events

Right column, about 35%
- Event details card
- Venue card or online event card
- Host card/list
- Share/action card
```

Mobile:

- Stack into one column.
- Title/date remain visible before long body content.
- Ticket/RSVP module appears before long metadata sections.
- CTAs are full-width.

### Single Event Details Card

The right-side event details card should include:

- Date
- Start/end time
- Timezone
- Cost or registration state
- Event type/category
- Tags later, if added
- Event website, if present
- Add to calendar links
- Status

### Venue Card

The single event page should show:

- linked venue name
- formatted address
- room/stage/event-specific venue notes
- phone/website when available
- parking/accessibility notes when available
- map link
- embedded map later when map configuration is complete

For online events, replace the venue card with an online event card.

### Host Card

For one host:

- show host image/logo if available
- linked host name
- role
- short bio/excerpt
- public contact fields only
- website/social links when available

For multiple hosts:

- show compact linked host cards or rows
- include role and primary host indicator
- avoid showing multiple long bios in the sidebar
- respect contact visibility

### Acceptance Criteria

- `/events` works well on desktop and mobile in both Month and List view.
- List view is grouped by date and uses the shared event card design.
- Month view uses a true 7-column desktop calendar and a mobile compact grid.
- `/events/[id]` uses the two-column desktop layout and single-column mobile layout.
- Single event page includes hero/placeholder, description, registration module, details card, venue/online card, host card/list, and add-to-calendar action.
- Member access remains server-side.

## Phase 2: Hosts And Venues With Designed Pages

### Outcome

Make Hosts and Venues feel like first-class reusable content records, both in admin and member-facing pages.

### Routes

- `/admin/events/hosts`
- `/admin/events/venues`
- `/events/hosts/[slug]`
- `/events/venues/[slug]`

### Host Admin Design

The host admin page should behave like a focused management area:

- Heading: `Hosts`
- Primary action: `Add Host`
- Search by name, email, website, type
- Filters:
  - host type
  - status
  - contact visibility
- Table/card-list columns:
  - Host
  - Type
  - Email
  - Website
  - Upcoming Events
  - Status
  - Actions
- Row actions:
  - Edit
  - View
  - Events
  - Archive

Host editor/drawer should include:

- name
- slug
- type
- bio/rich description
- image/logo
- email
- phone
- website
- social links
- contact visibility
- status

### Venue Admin Design

The venue admin page should behave like a focused management area:

- Heading: `Venues`
- Primary action: `Add Venue`
- Search by name, address, city
- Filters:
  - city/state/country
  - status
  - map enabled
- Table/card-list columns:
  - Venue
  - City
  - State/Region
  - Country
  - Upcoming Events
  - Status
  - Actions
- Row actions:
  - Edit
  - View
  - Events
  - Archive

Venue editor/drawer should include:

- name
- slug
- description
- featured image/media
- address fields
- phone
- website
- latitude/longitude
- show map
- show map link
- accessibility notes
- parking notes
- status

### Event Editor Host/Venue Panels

Host panel:

- searchable existing host selector
- multiple selected hosts
- role selector per host:
  - Host
  - Organizer
  - Speaker
  - Instructor
  - Partner
- primary host flag
- inline create host modal/drawer
- selected host preview

Venue panel:

- searchable existing venue selector
- inline create venue modal/drawer
- selected venue preview with address/contact
- event-specific room/stage field
- event-specific venue notes

### Member Host Page Design

The host detail page should include:

- header with image/logo, host name, type/role, and short bio
- website/social/contact links based on visibility
- left column:
  - about the host
  - upcoming events hosted by this host
- right column:
  - contact details
  - social links
  - optional related host/category area later
- upcoming event cards using the shared event card design
- empty state with `Browse all events`

### Member Venue Page Design

The venue detail page should include:

- 16:9 hero image or neutral venue placeholder
- venue name
- address summary
- actions:
  - `Get Directions`
  - `Venue Website`
- left column:
  - about this venue
  - upcoming events at this venue
- right column:
  - venue details
  - map/map link
  - contact details
  - accessibility/parking notes
- upcoming event cards using the shared event card design
- empty state with `Browse all events`

### Acceptance Criteria

- Admin can create/edit a host with only a name.
- Admin can create/edit a host with full contact, social, image, and visibility fields.
- Admin can create/edit a venue with only a name.
- Admin can create/edit a venue with full address, contact, map, image, and accessibility fields.
- Event editor can attach multiple hosts, set roles, and mark one primary.
- Event editor can select/create a venue and save room/venue notes.
- Member event detail links to host and venue pages.
- Host page lists only upcoming events visible to the member.
- Venue page lists only upcoming events visible to the member.
- Private host contact fields never render publicly.

## Phase 3: RSVP And Attendee UX

### Outcome

Make RSVP a first-class registration flow with attendee records and an operational admin attendee surface.

### Routes

- `/events/[id]`
- `/admin/events/attendees`
- `/admin/events/[id]/attendees`

### RSVP Module Design

The event page RSVP module should be a bordered card after the event description by default:

```text
RSVP
Will you attend?

Going
[ - ] [ 1 ] [ + ]

Your information
Name
Email

[Confirm RSVP]
[Can't go]
```

Rules:

- RSVP never shows payment UI.
- RSVP creates attendee records.
- RSVP supports capacity.
- RSVP supports availability windows.
- RSVP can collect attendee info.
- RSVP supports `Can't go` in a later subphase.
- CTA and errors are inline and calm.

### Attendee Admin Design

Global attendee page:

- Search attendees.
- Filters:
  - event
  - RSVP/ticket type
  - attendee status
  - checked-in status
  - date range
- Summary stats:
  - total attendees
  - checked in
  - not checked in
  - canceled
- Table/card-list columns:
  - Attendee
  - Email
  - Event
  - Ticket/RSVP
  - Order, when applicable
  - Security Code
  - Status
  - Checked In
  - Actions

Per-event attendee page:

- Event title and date summary.
- Summary stats:
  - total
  - checked in
  - remaining
- Actions:
  - print
  - export CSV
  - email attendees later
  - add attendee
- Row actions:
  - view details
  - edit
  - check in
  - reverse check-in
  - resend confirmation
  - cancel

### Attendee Detail Modal

Should show:

- attendee name/email
- event
- RSVP/ticket type
- order when applicable
- security code
- check-in timestamp/user
- custom registration fields later

### Acceptance Criteria

- Member can RSVP when eligible, capacity allows, and window is open.
- RSVP form shows closed/full/passed states correctly.
- RSVP creates attendee records only after confirmation.
- Admin can view all attendees globally.
- Admin can view attendees for one event.
- Admin can manually add attendees.
- Admin can export attendees.
- Admin can manually check in and reverse check-in.
- Duplicate check-in shows a clear already-checked-in state.

## Phase 4: Paid Ticketing And Checkout UX

### Outcome

Extend the existing ticketing model into a more complete Event Tickets-style purchase flow.

### Routes

- `/events/[id]`
- checkout route to be finalized
- order confirmation route to be finalized
- Stripe webhook routes

### Event Page Ticket Module Design

Ticket module appears after event description by default:

```text
Tickets
Select your tickets below.

General Admission
$25.00
Sales end May 13, 2026
[ - ] [ 0 ] [ + ]

VIP Pass
$75.00
12 available
[ - ] [ 0 ] [ + ]

[Get Tickets]
```

Ticket row states:

- on sale
- sold out
- not yet available
- sales ended
- event canceled
- event passed
- low capacity

### Checkout Design

Desktop:

- left column:
  - contact information
  - attendee information
  - payment state or Stripe Checkout handoff
- right column:
  - order summary
  - event title
  - event date/time
  - venue/online state
  - ticket line items
  - fees/taxes later
  - total

Mobile:

- single column
- order summary appears before final submit
- buttons are full-width

### Order Confirmation Design

The success page should include:

- clear success heading
- order number
- confirmation email destination
- event title/date/time/venue
- ticket list with attendee names
- ticket/security codes
- add-to-calendar action
- view event action
- browse more events action
- support/refund policy link

### Ticket Email Design

Email should include:

- Positives header/logo
- event title
- date/time/timezone
- ticket type
- attendee name
- ticket/security code
- QR code later
- venue or online event note
- host
- add-to-calendar links
- support/refund footer

### Inventory And Payment Requirements

- Use temporary ticket holds before checkout.
- Holds expire if checkout is abandoned.
- Convert holds into sold inventory only after payment success.
- Failed payment creates no attendees.
- Stripe webhook processing is idempotent.
- Duplicate Stripe webhook creates no duplicate attendees, emails, or inventory changes.
- Refund/chargeback deactivates ticket access.

### Acceptance Criteria

- Admin can create paid and free ticket types.
- Member can select multiple ticket quantities.
- Quantity stepper respects min/max and capacity.
- Per-ticket capacity prevents overselling.
- Shared event capacity prevents total overselling after that setting ships.
- Checkout creates an order.
- Successful payment creates attendee records.
- Failed payment creates no attendees.
- Duplicate webhook is safe.
- Ticketed event hides join/replay until paid or comp ticket exists.

## Phase 5: Admin Ticket And RSVP Builder

### Outcome

Make the event editor's ticketing area feel like Event Tickets rather than scattered form fields.

### Event Editor Ticket Panel Design

Use a single panel:

```text
Tickets & RSVPs

[+ New Ticket] [+ New RSVP] [Settings]
```

Empty state:

```text
No tickets or RSVPs have been created yet.

Create a ticket to sell admission, or create an RSVP to collect free registrations.
[+ New Ticket] [+ New RSVP]
```

Saved ticket/RSVP rows:

- name
- type
- price or free
- capacity
- sale/availability window
- status
- actions:
  - edit
  - duplicate
  - delete/archive

### Ticket Form Design

Ticket form should include:

- ticket name
- description
- kind:
  - paid ticket
  - free ticket
- price
- sale price and sale window later
- capacity:
  - unlimited
  - set capacity for this ticket
  - share capacity with event later
- sale start/end
- SKU
- visibility
- min/max quantity
- attendee information mode

### RSVP Form Design

RSVP form should include:

- RSVP name
- description
- capacity:
  - unlimited
  - set capacity
- RSVP availability start/end
- attendee information mode
- allow `Can't go` later
- public attendee opt-in later

### Ticket Settings Modal

Settings should include:

- capacity mode:
  - independent ticket capacity
  - shared event capacity
- shared event capacity
- ticket/RSVP form location
- stock display:
  - always show
  - show below threshold
  - never show
- public attendee list default

### Acceptance Criteria

- Ticket and RSVP creation happens from one clear `Tickets & RSVPs` panel.
- Empty state explains the difference between tickets and RSVPs.
- Ticket rows collapse into compact summaries after save.
- Advanced ticket fields do not overwhelm the default event editor.
- Ticket settings are grouped in a modal/drawer, not scattered across the main page.

## Phase 6: Registration Fields, QR Check-In, And Operations

### Outcome

Add the operational layer needed for real events with attendee data, check-in, and confirmation support.

### Registration Field Builder Design

Inside ticket or RSVP forms:

- require name/email per attendee
- custom field table:
  - label
  - type
  - required
  - visibility/export behavior
  - actions
- add-field modal:
  - label
  - field type
  - required
  - options
  - help text
  - visibility

Supported fields:

- text
- textarea
- email
- phone
- dropdown
- radio
- checkbox
- multi-checkbox
- date
- terms/consent
- marketing opt-in

### QR Check-In Design

Mobile-first route:

- event selector
- selected event summary
- open scanner action
- manual lookup by name, email, ticket code
- recent scans list

Scan states:

- success
- already checked in
- invalid ticket
- wrong event
- canceled/refunded

### Email Operations

Admin should be able to:

- resend ticket/RSVP confirmation
- see resend status
- avoid duplicate sends on duplicate webhooks
- rate-limit resend actions later

### Acceptance Criteria

- Admin can define attendee fields.
- Required attendee fields are enforced.
- Attendee detail modal displays registration fields.
- QR check-in uses signed/random tokens, not attendee IDs.
- Already checked-in tickets show a clear warning.
- Canceled/refunded tickets cannot be checked in.
- Confirmation emails include event, venue, host, attendee, and ticket/security code details.

## Phase 7: Settings And System Health Pages

### Outcome

Move defaults and operational health out of the event editor and into clear settings pages.

### Event Settings Overview

Route:

- `/admin/events/settings`

Design:

- settings dashboard, not a bulk editor
- default timezone
- default access levels
- default calendar/list view
- ticketing defaults
- RSVP/ticket form location
- Zoom connection health
- Stripe/webhook health
- resource counts:
  - events
  - hosts
  - venues
  - ticket types
  - attendees
- quick links:
  - Calendar
  - Add Event
  - Hosts
  - Venues
  - Attendees
  - Ticketing

### Ticket Settings

Route:

- `/admin/events/ticketing`

Tabs:

- General
- Payments
- Emails
- Display
- Integrations

Stripe is the only payment provider in v1, but the UI can use provider language carefully without promising PayPal/WooCommerce.

### Acceptance Criteria

- Settings page is understandable at a glance.
- Hosts, venues, attendees, and ticketing are not managed from one giant settings form.
- Settings show operational health for Zoom and Stripe.
- Global defaults do not override explicit event-level choices without warning.

## Cross-Phase Verification

Every phase should run:

- `npm run lint`
- `npm run build`
- targeted Playwright tests for the touched admin/member routes

Every phase should verify:

- mobile layout
- desktop layout
- server-side member access gating
- admin-only route protection
- empty states
- permission-sensitive fields
- event timezone display

## Recommended Next Slice

The next best implementation slice is:

1. Build the shared event card/status/action components.
2. Redesign `/events` Month/List views to match the brief.
3. Redesign `/events/[id]` into the two-column event conversion layout.
4. Refresh host and venue member pages to use the same event card and page structure.
5. Add targeted Playwright checks for member events page, event detail, host detail, and venue detail.

This brings the visible member experience up to the design brief before expanding deeper ticketing operations.
