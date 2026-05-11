# Event System Page Design Brief

**Goal:** Build event, venue, host, ticketing, RSVP, attendee, and check-in interfaces that feel close to **The Events Calendar + Event Tickets** WordPress experience, while using the label **Hosts** instead of “Organizers.”

This document is intended as a handoff brief for a developer agent. It focuses on page design, layout, UX behavior, admin workflows, front-end components, and acceptance criteria.

---

## Product Design Direction

Build the system with two distinct UX layers:

1. **Public-facing event experience**  
   Clean, card-based, responsive, and optimized for visitors to find an event, understand where/when/who, and register or buy tickets.

2. **Admin-facing event management experience**  
   WordPress-native, form-heavy, modular, reusable, and operational. The admin should feel like they are editing normal WordPress content, but with structured panels for date/time, venue, host, tickets, RSVPs, attendees, and check-ins.

The key product rule:

> Events are the main content. Venues and hosts are reusable related content. Tickets, RSVPs, orders, attendees, and check-ins are operational records attached to the event.

---

## Reference Pattern

This brief is modeled after the general UX patterns of:

- [The Events Calendar WordPress plugin](https://wordpress.org/plugins/the-events-calendar/)
- [Event Tickets WordPress plugin](https://wordpress.org/plugins/event-tickets/)
- [The Events Calendar venue and organizer documentation](https://theeventscalendar.com/knowledgebase/venues-organizers/)
- [The Events Calendar ticket creation documentation](https://theeventscalendar.com/knowledgebase/create-tickets/)
- [The Events Calendar attendee documentation](https://theeventscalendar.com/knowledgebase/event-attendees/)
- [Event Tickets email settings documentation](https://theeventscalendar.com/knowledgebase/event-tickets-emails/)
- [Event Tickets QR code documentation](https://theeventscalendar.com/knowledgebase/ticket-qr-codes/)

---

# 1. Public Events Calendar Page

## Purpose

The main public page where visitors browse upcoming events.

## Desktop Layout

Use a centered content container, approximately `1100px–1280px` wide.

Recommended structure:

```text
[Page title: Events]
[Search / filter bar]
[View controls]
[Calendar or list content]
[Export / subscribe links]
```

## Search / Filter Bar

The search area should be a horizontal utility toolbar.

| Element | Design |
|---|---|
| Keyword field | Placeholder: “Search events” |
| Date field | Placeholder: “Select date” or current month |
| Location/category filter | Optional but useful |
| Primary CTA | “Find Events” |
| Reset link | “Reset” or “Clear filters” |
| View toggle | Month / List / Day, optionally Week later |

Desktop behavior:

- Fields sit in one row.
- The search button is visually primary.
- The view switcher sits near the right side or below the filter bar.

Mobile behavior:

- Fields stack vertically.
- View switcher becomes a dropdown or segmented control.
- Filters may be collapsible.

## Month View

The month view should look like a traditional calendar grid.

Top navigation:

```text
< Previous Events        May 2026        Next Events >
```

Calendar header:

```text
Sun | Mon | Tue | Wed | Thu | Fri | Sat
```

Each day cell should include:

| Element | Design |
|---|---|
| Date number | Top-left of cell |
| Event title | Small linked text |
| Multiple events | Stack vertically |
| Overflow | “+3 more” if too many |
| Today | Subtle highlight |
| Past days | Muted text |
| Empty days | Blank but still clickable |

Event titles should be compact. Clicking an event title opens the single event page.

## Event Hover Card

On desktop, hovering over an event in the month grid should open a lightweight popover card.

Popover content:

```text
[Optional event image thumbnail]
Event title
Date and time
Venue name
Short excerpt
View Event link
```

Rules:

- Do not include full ticket controls in the hover card.
- Keep the hover card lightweight and readable.
- It should close on mouse leave or when another event is hovered.

## Bottom of Page

At the bottom:

```text
< Previous Events      Next Events >
[Subscribe to calendar] [Export Events]
```

## Mobile Layout

Do not shrink the entire desktop calendar grid into an unusable tiny table.

Use this approach:

```text
[Events]
[Search events]
[Date/month selector]
[Compact calendar grid]
[Selected date’s events as cards]
```

Mobile month grid behavior:

| Element | Mobile Behavior |
|---|---|
| Day cells | Small square cells |
| Event indicators | Dots or small count badges |
| Event details | Shown below grid, not inside tiny cells |
| Search/filter | Collapsible or stacked |
| View switcher | Dropdown instead of tabs |

---

# 2. Public Event List Page

## Purpose

A simpler browsing mode for visitors. Many users prefer list view over calendar view.

## Desktop Layout

Use a vertical list of event cards grouped by date.

```text
[Search / filter bar]

MAY 14
------------------------------------------------
[Image]  Event title
         Thu, May 14, 2026, 6:00 PM – 8:00 PM
         Venue name, City
         Short description...
         [View Event] [Get Tickets]

MAY 21
------------------------------------------------
[Image]  Event title...
```

## Event Card Design

Each list item should include:

| Element | Design |
|---|---|
| Date label | Left-side date block or small eyebrow above card |
| Thumbnail | 16:9 image, optional |
| Event title | Large clickable heading |
| Time | Date/time line with icon |
| Venue | Venue name and city |
| Host | Optional: “Hosted by…” |
| Excerpt | 1–2 lines |
| Price/status | Free, From $25, Sold Out |
| CTA | “View Event” or “Get Tickets” |

## States

| State | Display |
|---|---|
| Sold out | Badge: “Sold out”; CTA becomes “View Event” |
| Free RSVP | Badge: “Free”; CTA: “RSVP” |
| Canceled | Warning badge: “Canceled” |
| Postponed | Amber/warning badge: “Postponed” |
| Virtual | Badge: “Online” |
| No events | Empty-state card with “No events found” and reset filters link |

## Mobile Layout

Cards stack vertically:

```text
[Date badge]
[Image]
[Title]
[Time]
[Venue]
[Short description]
[CTA]
```

Rules:

- Keep CTAs full-width on mobile.
- Date/time should be visible without expanding the card.
- Event image should be optional so the layout works for text-only events.

---

# 3. Single Event Page

## Purpose

This is the conversion page. It must answer:

1. What is this event?
2. When is it?
3. Where is it?
4. Who is hosting it?
5. How do I register or buy tickets?

## Recommended Desktop Layout

Use a two-column page.

```text
------------------------------------------------
Event title
Date/time summary
[Status badges: Free / Sold Out / Online / Canceled]
------------------------------------------------

LEFT COLUMN, 65%
[Hero image]
[Event description]
[Ticket / RSVP module]
[Add to calendar]
[Related events]

RIGHT COLUMN, 35%
[Event details card]
[Venue card]
[Host card]
[Share card]
------------------------------------------------
```

## Header Section

At the top:

```text
[Event category eyebrow]
Event title
Thu, May 14, 2026, 6:00 PM – 8:00 PM AST
[Hosted by Host Name]
```

Optional badges:

```text
[Free] [In person] [Registration required]
```

For canceled or postponed events, show a strong notice directly below the title:

```text
This event has been postponed. A new date will be announced soon.
```

## Hero Image

Use a full-width 16:9 image in the left column.

Rules:

- On mobile, it appears directly below the title/date.
- If no image exists, use a neutral placeholder with the event category label.
- Avoid using a broken image area.

## Event Description

The description area should support rich text:

- Paragraphs
- Links
- Headings
- Lists
- Embedded media
- Speaker details
- Agenda blocks

Ticket module placement should be configurable:

| Option | Behavior |
|---|---|
| Above event description | Best for conversion-heavy landing pages |
| Below event description | Best when users need context first |
| Above event details | Similar to classic event plugin behavior |
| Below event details | Less aggressive |

---

# 4. Ticket / RSVP Module on Event Page

## Purpose

The main registration or purchase component.

## Placement

Default placement:

```text
After event description, before event details on mobile.
In the main left column on desktop.
```

But make placement configurable.

## Ticket Module Container

Design it as a bordered card:

```text
------------------------------------------------
Tickets
Select your tickets below.

General Admission
$25.00
Sales end May 13, 2026
[ - ] [ 0 ] [ + ]

VIP Pass
$75.00
Includes preferred seating and reception access.
12 available
[ - ] [ 0 ] [ + ]

[Get Tickets]
------------------------------------------------
```

## Ticket Row

Each ticket row should contain:

| Element | Design |
|---|---|
| Ticket name | Bold |
| Description | Small text below name |
| Price | Right-aligned on desktop, below title on mobile |
| Availability | “12 available,” “Sold out,” or hidden |
| Sale window | Optional small text |
| Quantity stepper | Minus / number / plus |
| Status | Sold out, not yet available, sales ended |
| Error area | Inline validation message |

## Ticket States

| State | UI |
|---|---|
| On sale | Quantity selector enabled |
| Sold out | Quantity selector disabled; badge “Sold out” |
| Before sale opens | Hide selector; message “Tickets are not yet available” |
| After sale ends | Hide selector; message “Ticket sales have ended” |
| Event canceled | Disable all ticket controls |
| Event ended | Hide ticket controls or show “This event has passed” |
| Capacity low | “Only 5 left” when below threshold |

## RSVP Module

For free reservations, use a simpler module:

```text
------------------------------------------------
RSVP
Will you attend?

Going
[ - ] [ 1 ] [ + ]

Your information
Name
Email

[Confirm RSVP]
[Can’t go]
------------------------------------------------
```

Rules:

- RSVP should not show credit card/payment UI.
- RSVP should still create attendee records.
- RSVP should still support capacity, sale/availability windows, and attendee fields.

## Attendee Information Step

When attendee info is required, show it after quantity selection.

Example:

```text
Attendee 1
First name
Last name
Email
Phone
T-shirt size
Dietary restrictions

Attendee 2
...
```

Rules:

- Do not force all fields into the ticket row itself.
- Keep the ticket row compact.
- Show attendee fields in an expanded section, modal, or checkout step.
- Support purchaser vs. attendee distinction.

---

# 5. Event Details Sidebar Card

## Purpose

Give scannable event facts.

## Layout

```text
Event Details
Date:
May 14, 2026

Time:
6:00 PM – 8:00 PM AST

Cost:
$25 – $75

Event Categories:
Networking, Business

Website:
Visit event website
```

## Fields to Include

| Field | Display |
|---|---|
| Date | Human-readable date |
| Time | Start/end time with timezone |
| Cost | Free, price, or range |
| Category | Linked category chips |
| Tags | Optional linked chips |
| Event website | External link |
| Add to calendar | Google Calendar / iCal links |
| Status | Canceled/postponed/sold out |

Design rules:

- Use icons only if they improve scanning.
- Keep typography compact and readable.
- Do not make the sidebar visually noisy.

---

# 6. Venue Card on Single Event Page

## Purpose

Show where the event is happening and link to the reusable venue record.

## Card Layout

```text
Venue
[Venue Name →]
123 Main Street
Suite 200
San Juan, PR 00901

[View Map] [Get Directions]

[Embedded map]
```

## Fields

| Field | Display |
|---|---|
| Venue name | Link to venue page |
| Address | Formatted multiline address |
| City/state/postal/country | Included in address |
| Phone | Optional |
| Website | Optional |
| Map link | Optional |
| Embedded map | Optional |
| Parking/accessibility notes | Optional, recommended |

## States

| State | Behavior |
|---|---|
| No venue | Hide venue card |
| Online event | Replace venue with “Online event” card |
| Address but map disabled | Show address, no map |
| Map error | Show address and “Open in map” link only |
| Multiple venues | Show primary venue first, then additional venue cards |

---

# 7. Host / Organizer Card on Single Event Page

## Purpose

Show who is responsible for the event.

Use the label **Host** publicly. Internally, this is similar to The Events Calendar’s “Organizer.”

## Card Layout

```text
Host
[Logo/headshot]
[Host Name →]
Short bio or organization name
Email: hello@example.com
Website: Visit website
[Instagram] [LinkedIn]
```

## Fields

| Field | Display |
|---|---|
| Host name | Link to host page |
| Headshot/logo | Optional |
| Bio excerpt | Optional |
| Email | Only if public |
| Phone | Only if public |
| Website | Optional |
| Social links | Optional |
| Role | Host, speaker, sponsor, instructor, performer |

## Multiple-Host Design

For multiple hosts, use compact cards:

```text
Hosts
[Logo] Host A    Primary Host
[Logo] Host B    Speaker
[Logo] Host C    Sponsor
```

Rules:

- Each host name should link to its host page.
- Avoid showing three full bios inside the sidebar.
- Show a compact host list with links.
- Respect contact visibility settings.

---

# 8. Public Venue Page

## Purpose

A reusable landing page for a place.

## Desktop Layout

```text
------------------------------------------------
[Hero image]
Venue Name
Address summary
------------------------------------------------

LEFT COLUMN
About this venue
Upcoming events at this venue

RIGHT COLUMN
Venue details
Map
Contact
------------------------------------------------
```

## Top Header

```text
[Featured image, 16:9]
Venue Name
123 Main Street, San Juan, PR
[Get Directions] [Venue Website]
```

## Venue Details Card

```text
Venue Details
Address:
123 Main Street
San Juan, PR 00901

Phone:
(555) 123-4567

Website:
venue.com

Accessibility:
Wheelchair accessible entrance. Street parking nearby.
```

## Map Block

Display a map card if map is enabled and the address or coordinates are valid.

```text
[Embedded map]
[Open in Google Maps]
```

## Upcoming Events List

Show event cards filtered to this venue:

```text
Upcoming Events at Venue Name

May 14
Event Title
6:00 PM – 8:00 PM
[View Event]

May 21
Event Title
...
```

## Empty State

```text
No upcoming events at this venue.
[Browse all events]
```

---

# 9. Public Host Page

## Purpose

A profile page and event hub for a person, company, performer, instructor, sponsor, or organization.

## Desktop Layout

```text
------------------------------------------------
[Hero/cover or logo/headshot]
Host Name
Host type / role
[Website] [Email] [Social links]
------------------------------------------------

LEFT COLUMN
About the host
Upcoming events hosted by this host

RIGHT COLUMN
Contact details
Social links
Related hosts or categories
------------------------------------------------
```

## Header Design

For individuals:

```text
[Headshot]
Host Name
Speaker / Instructor / Organizer
Short bio
```

For organizations:

```text
[Logo]
Organization Name
Event host
Short organization description
```

## Upcoming Events List

Same card format as venue page, but filtered by host:

```text
Upcoming Events by Host Name
[Event card]
[Event card]
```

## Contact Visibility

Respect host privacy settings:

| Visibility | Public Display |
|---|---|
| Public | Show email/phone |
| Logged-in only | Show after login |
| Private | Hide completely |
| Contact form only | Show “Contact host” button |

---

# 10. Admin Events Listing Page

## Purpose

The admin needs a sortable list of events with operational shortcuts.

## Layout

Use a WordPress-style list table.

```text
Events
[Add New Event]

[All] [Published] [Draft] [Canceled] [Past] [Upcoming]

[Bulk actions] [Apply]  [Date filter] [Category filter] [Venue filter] [Host filter] [Filter]

Search events...

------------------------------------------------
[ ] Title | Start Date | End Date | Venue | Host | Tickets | Attendees | Status
------------------------------------------------
```

## Row Actions

When hovering an event row:

```text
Edit | View | Duplicate | Attendees | Tickets | Trash
```

## Columns

| Column | Purpose |
|---|---|
| Title | Event title and row actions |
| Start date | Sortable |
| End date | Sortable |
| Venue | Linked venue |
| Host | Linked host(s) |
| Tickets | “3 ticket types” / “RSVP only” |
| Attendees | “42 registered” |
| Status | Published, draft, canceled, sold out |
| Revenue | Optional but useful |

---

# 11. Admin Add/Edit Event Page

## Purpose

The core admin screen. It should feel like the WordPress editor plus structured event panels.

## Layout

```text
------------------------------------------------
Title field
Permalink / slug
Rich content editor
------------------------------------------------

Event Details panel
Venue panel
Host panel
Tickets / RSVP panel
SEO / schema panel, optional

RIGHT SIDEBAR
Publish controls
Featured image
Categories
Tags
Event status
------------------------------------------------
```

## Event Details Panel

Use a grouped card.

```text
Event Details

[ ] All-day event

Start
Date: [MM/DD/YYYY]  Time: [HH:MM]  Timezone: [America/Puerto_Rico]

End
Date: [MM/DD/YYYY]  Time: [HH:MM]

Event status:
[Scheduled / Canceled / Postponed]

Event website:
[URL]

Event type:
[In person / Online / Hybrid]
```

## Validation

| Condition | Message |
|---|---|
| Missing start date | “Start date is required.” |
| End before start | “End date must be after start date.” |
| Invalid timezone | “Select a valid timezone.” |
| Online event without URL | Warning, not hard block |
| Canceled event with active tickets | Warning: “Tickets are currently enabled.” |

---

# 12. Admin Venue Panel Inside Event Editor

## Purpose

Allow admins to search/select existing venues or create a new one inline.

## Panel Layout

```text
Venue

[Search existing venue... v]

Selected venue:
Venue Name
123 Main Street, San Juan, PR
[Edit Venue] [Remove]

[+ Create New Venue]
```

## Create-New Expanded State

```text
Create New Venue

Venue name *
Description
Address 1
Address 2
City
State / Region
Postal code
Country
Phone
Website
Latitude
Longitude

[ ] Show map
[ ] Show map link

[Save Venue]
```

## Design Behavior

- Search should autocomplete existing venues.
- Selecting a venue should populate a preview card.
- Editing a venue should open a modal or side panel.
- Creating a new venue inline should save it as a reusable venue, not just event-specific text.
- Allow event-specific room notes separately:

```text
Room / stage / suite for this event:
[Main Ballroom]
```

---

# 13. Admin Host Panel Inside Event Editor

## Purpose

Allow one or more reusable hosts to be attached to an event.

## Panel Layout

```text
Hosts

[Search existing host... v]

Selected hosts:
1. Host Name        Role: [Primary Host v]    [Edit] [Remove]
2. Host Name        Role: [Speaker v]         [Edit] [Remove]

[+ Add another host]
[+ Create New Host]
```

## Create-New Expanded State

```text
Create New Host

Host name *
Host type: [Person / Organization / Brand / Team]
Description / bio
Email
Phone
Website
Social links
Featured image / logo

Contact visibility:
[Public / Logged-in only / Private]

[Save Host]
```

## Design Behavior

- Multiple hosts should be supported.
- Each host should have an optional role.
- One host can be marked primary.
- Host contact info should respect visibility settings.

---

# 14. Admin Ticket / RSVP Panel Inside Event Editor

## Purpose

Admins configure tickets and RSVPs for the event.

## Panel Header

```text
Tickets & RSVPs

[+ New Ticket] [+ New RSVP] [Settings]
```

## Empty State

```text
No tickets or RSVPs have been created yet.

Create a ticket to sell admission, or create an RSVP to collect free registrations.
[+ New Ticket] [+ New RSVP]
```

## Ticket Settings Modal

```text
Ticket Settings

Commerce provider:
[Native checkout / WooCommerce / Stripe / PayPal]

Capacity mode:
( ) Independent ticket capacity
( ) Shared event capacity

Shared event capacity:
[100]

Public attendee list:
[ ] Show attendees on event page

Ticket form location:
[Below event description v]

Stock display:
[Always show / Show below threshold / Never show]
Threshold:
[10]

[Save Settings]
```

Important behavior:

- Support independent ticket capacity.
- Support shared event capacity.
- Shared event capacity lets multiple ticket types pull from one event-level inventory pool.

Example:

```text
Event capacity: 100 total seats
Ticket types: Adult, Child, Senior
All three ticket types pull from the same 100-seat pool.
```

---

# 15. Admin Add/Edit Ticket Form

## Purpose

Create one ticket type for an event.

## Layout

Use an inline card or modal. Inline card is preferred because it keeps ticket context visible inside the event editor.

```text
New Ticket

Ticket name *
[General Admission]

Description
[Short description...]

Ticket type
[Standard Ticket v]

Price
[$ 25.00]

Sale price, optional
[$ 20.00]
Sale price start / end

Capacity
( ) Unlimited
( ) Set capacity for this ticket
    [100]
( ) Share capacity with event
    Limit sales of this ticket to: [50]

Sale duration
Start sale: [Date] [Time]
End sale: [Date] [Time]

Advanced
SKU
Visibility
Min quantity per order
Max quantity per order

Attendee information
[ ] Collect attendee information
[+ Add field]

[Save Ticket] [Cancel]
```

## Saved Ticket Compact View

After saving, collapse the ticket into a summary row:

```text
General Admission       $25.00       Capacity: 100       Sales: May 1–May 14
[Edit] [Duplicate] [Delete]
```

## Field-Level Behavior

| Field | Rule |
|---|---|
| Name | Required |
| Price | Required for paid tickets; allow `0` for free ticket |
| Capacity | Blank/unlimited allowed |
| Start sale | Optional; default starts on publish |
| End sale | Optional; default ends at event start |
| SKU | Optional |
| Attendee info | Optional but should support custom fields |

---

# 16. Admin Add/Edit RSVP Form

## Purpose

Create a free registration option without checkout.

## Layout

```text
New RSVP

RSVP name *
[RSVP]

Description
[Reserve your spot]

Capacity
( ) Unlimited
( ) Set capacity
    [100]

RSVP availability
Start: [Date] [Time]
End: [Date] [Time]

Attendee information
[ ] Collect attendee information
[+ Add field]

Response options
[ ] Allow “Can’t go” response
[ ] Show public attendee opt-in

[Save RSVP] [Cancel]
```

## Front-End Effect

RSVP should display a free reservation form, not a checkout cart.

---

# 17. Attendee Information Field Builder

## Purpose

Allow admins to collect custom details during registration.

## Layout

Inside ticket or RSVP form:

```text
Attendee Information

[ ] Require name and email for each attendee

Custom fields:
------------------------------------------------
Field label        Type          Required
Company            Text          Yes      [Edit] [Delete]
T-shirt size       Dropdown      No       [Edit] [Delete]
Dietary needs      Textarea      No       [Edit] [Delete]
------------------------------------------------

[+ Add Field]
```

## Add-Field Modal

```text
Add Registration Field

Field label *
[Company]

Field type
[Text / Textarea / Dropdown / Radio / Checkbox / Date / Phone / Email]

Required?
[ ] Required

Options
[For dropdown/radio/checkbox]

Help text
[Optional]

Visibility
[Admin only / Show in ticket email / Export only]

[Save Field]
```

Supported field types:

- Text
- Textarea
- Email
- Phone
- Dropdown
- Radio
- Checkbox
- Multi-checkbox
- Date
- Terms/consent checkbox
- Marketing opt-in

---

# 18. Front-End Checkout Page

## Purpose

Convert selected tickets into an order.

## Layout

Use a two-column checkout on desktop and single column on mobile.

```text
Checkout

LEFT COLUMN
Contact information
First name
Last name
Email

Attendee information
Attendee 1...
Attendee 2...

Payment
[Stripe/PayPal/card fields]

RIGHT COLUMN
Order summary
Event title
Date/time
Venue
Ticket line items
Fees/taxes
Total
```

## Order Summary Card

```text
Order Summary

Event:
Spring Networking Mixer

Date:
May 14, 2026, 6:00 PM

Tickets:
2 × General Admission       $50.00
1 × VIP Pass                $75.00

Total:
$125.00

[Complete Purchase]
```

## Checkout States

| State | UI |
|---|---|
| Inventory changed | “One or more tickets are no longer available.” |
| Payment failed | Show error above payment area |
| Checkout expired | “Your ticket hold expired. Please start again.” |
| Payment processing | Disable button and show spinner |
| Success | Redirect to order confirmation |
| Free ticket | Skip payment section but still create order/attendees |

Important implementation note:

- Use temporary inventory holds during checkout.
- Do not decrement final inventory until payment or RSVP confirmation succeeds.
- Payment webhooks must be idempotent.

---

# 19. Order Confirmation / Success Page

## Purpose

Confirm the user’s purchase or RSVP and provide next steps.

## Layout

```text
Thank you — your tickets are confirmed.

Order #12345
A confirmation email has been sent to ryan@example.com.

Event:
Spring Networking Mixer
May 14, 2026, 6:00 PM – 8:00 PM
Venue Name

Tickets:
General Admission — Ryan Smith
Ticket code: ABC-123

[Download tickets]
[Add to calendar]
[View event]
[Browse more events]
```

## Design Notes

- Show success state clearly.
- Include order number.
- Include event date/time.
- Include venue.
- Include ticket names and attendee names.
- Include calendar links.
- Include support/refund policy link.

---

# 20. Emailed Ticket Design

## Purpose

Provide the attendee with everything needed for admission.

## Email Layout

```text
[Header logo]

Your tickets are ready

Event Title
May 14, 2026, 6:00 PM – 8:00 PM AST

Ticket
------------------------------------------------
Ticket type: General Admission
Attendee: Ryan Smith
Ticket number: 000123
Security code: ABC-123
[QR code]
------------------------------------------------

Venue
Venue Name
123 Main Street
San Juan, PR 00901

Host
Host Name

[Add to Google Calendar] [Download iCal]
[View Event]

Footer:
Refund policy / Support email / Site name
```

## Email Requirements

| Element | Required? |
|---|---:|
| Event title | Yes |
| Date/time/timezone | Yes |
| Ticket type | Yes |
| Attendee name | Yes |
| Ticket/security code | Yes |
| QR code | Strongly recommended |
| Venue | Yes for in-person events |
| Online event link | Yes for virtual events, but protect appropriately |
| Host | Optional but useful |
| Add-to-calendar links | Strongly recommended |
| Support contact | Yes |
| Refund/cancellation policy | Recommended |

---

# 21. Admin Attendee Report Page

## Purpose

The operational dashboard for registrations, ticket holders, and check-ins.

## Global Attendee List

Route:

```text
Tickets → Attendees
```

Layout:

```text
Attendees

[Search attendees...]

Filters:
[Event] [Ticket type] [Order status] [Checked-in status] [Date range] [Filter]

Summary:
Total attendees | Checked in | Not checked in | Revenue

Table:
[ ] Attendee | Email | Event | Ticket | Order | Security Code | Status | Checked In | Actions
```

## Per-Event Attendee List

Route:

```text
Events → Event → Attendees
```

Header:

```text
Attendees for Spring Networking Mixer

Total: 125
Checked in: 82
Remaining: 43

[Print] [Export CSV] [Email Attendees] [+ Add Attendee]
```

## Table Columns

| Column | Design |
|---|---|
| Checkbox | For bulk actions |
| Attendee | Name, avatar optional |
| Email | Attendee email |
| Purchaser | Purchaser name/email if different |
| Ticket | Ticket type |
| Order | Linked order number |
| Security code | Short code |
| Registration fields | View modal |
| Status | Registered, checked in, canceled, refunded |
| Check-in | Button or timestamp |
| Actions | View, edit, resend, cancel, move |

## Row Actions

```text
View Details | Edit | Check In | Resend Ticket | Cancel | Move
```

## Bulk Actions

```text
Bulk actions:
- Check in
- Reverse check-in
- Resend tickets
- Export selected
- Move attendees
- Delete/cancel
```

## Attendee Detail Modal

```text
Attendee Details

Name: Ryan Smith
Email: ryan@example.com
Ticket: General Admission
Order: #12345
Security code: ABC-123
Checked in: Yes, May 14, 2026, 5:42 PM

Registration fields:
Company: Acme Co.
T-shirt size: Large
Dietary needs: Vegetarian

[Edit] [Resend Ticket] [Close]
```

---

# 22. QR Check-In Screen

## Purpose

Allow staff to scan tickets quickly at the door.

## Mobile-First Layout

```text
Check In Attendees

[Select Event v]
Spring Networking Mixer
May 14, 2026

[Open Scanner]

Manual lookup:
[Search name, email, ticket code]

Recent scans:
✓ Ryan Smith — General Admission — 5:42 PM
⚠ Jamie Lee — Already checked in
✕ Invalid ticket
```

## Scan Result States

### Success

```text
Checked in successfully

Ryan Smith
General Admission
Ticket ABC-123

[Scan Next]
```

### Already Checked In

```text
Already checked in

Ryan Smith was checked in at 5:42 PM by Staff User.

[Scan Next]
```

### Invalid Ticket

```text
Invalid ticket

This QR code does not match a valid attendee.

[Try Again]
```

### Wrong Event

```text
Wrong event

This ticket is for:
Different Event Name

[Scan Next]
```

### Refunded or Canceled

```text
Ticket canceled or refunded

This ticket cannot be checked in.

[Scan Next]
```

## Staff Permissions

Give check-in staff a limited interface. They should not need full admin permissions to edit events, export attendees, or view revenue.

---

# 23. Admin Venue Listing and Editor

## Venue Listing Page

Route:

```text
Events → Venues
```

Layout:

```text
Venues
[Add New Venue]

[Search venues...]

Table:
[ ] Venue | City | State | Country | Upcoming Events | Status | Actions
```

Row actions:

```text
Edit | View | Events | Trash
```

## Venue Editor Page

```text
Add New Venue

Venue name
Description editor

Venue Information
Address 1
Address 2
City
State / Region
Postal Code
Country
Phone
Website
Latitude
Longitude

Map Settings
[ ] Show map
[ ] Show map link

Accessibility / Parking Notes
[Textarea]

Featured Image

[Publish / Update]
```

## Venue Rules

- A venue only needs a name to be saved.
- Address/map fields are optional.
- Venue should be reusable across multiple events.
- Archiving or deleting a venue should not delete historical events.

---

# 24. Admin Host Listing and Editor

## Host Listing Page

Route:

```text
Events → Hosts
```

Or, if staying closer to the plugin language:

```text
Events → Organizers
```

Layout:

```text
Hosts
[Add New Host]

[Search hosts...]

Table:
[ ] Host | Type | Email | Website | Upcoming Events | Status | Actions
```

Row actions:

```text
Edit | View | Events | Trash
```

## Host Editor Page

```text
Add New Host

Host name
Description / bio editor

Host Information
Host type
Email
Phone
Website

Social Links
Instagram
LinkedIn
X / Twitter
Facebook
YouTube
TikTok

Visibility
Email visibility
Phone visibility

Featured Image / Logo

[Publish / Update]
```

## Host Rules

- A host only needs a name to be saved.
- Host can be a person, brand, department, venue team, nonprofit, performer, instructor, or sponsor.
- Contact fields must respect visibility settings.
- Host should be reusable across multiple events.

---

# 25. Ticket Settings Page

## Purpose

Configure global ticketing behavior.

Route:

```text
Tickets → Settings
```

## Tab Structure

```text
General | Payments | Emails | Integrations | Display | Licenses
```

## General Tab

```text
Post types that can have tickets:
[ ] Events
[ ] Posts
[ ] Pages

RSVP form location:
[Below event details v]

Ticket form location:
[Below event description v]

Stock countdown:
Display “X tickets left” when remaining is below:
[10]

Require login:
[ ] Require login to RSVP
[ ] Require login to buy tickets

Attendee information:
[ ] Require name/email per attendee by default

[Save Changes]
```

## Payments Tab

```text
Payment providers
[ ] Stripe
[ ] PayPal
[ ] WooCommerce

Currency
[USD v]

Fees
Service fee
Tax behavior

Webhook status
Stripe webhook: Connected / Error
PayPal webhook: Connected / Error

[Save Changes]
```

## Emails Tab

```text
Emails

Ticket confirmation          Enabled    [Edit]
RSVP confirmation            Enabled    [Edit]
Order receipt                Enabled    [Edit]
Ticket resend                Enabled    [Edit]
Refund/cancellation          Enabled    [Edit]
Waitlist confirmation        Disabled   [Edit]
Waitlist available           Disabled   [Edit]

Sender name
Sender email

Email styling
Header image
Header/footer background
Ticket section color
Footer content

[Save Changes]
```

---

# 26. Public Attendee List / “Who’s Attending” Block

## Purpose

Optional social proof on event pages.

## Design

Place below tickets or near the bottom of the event page.

```text
Who’s Attending

[Avatar] Ryan S.
[Avatar] Jamie L.
[Avatar] Morgan P.

+42 more attendees
```

## Privacy Behavior

Default should be private / opted out.

During checkout or RSVP:

```text
[ ] Show my name in the public attendee list
```

Rules:

- Do not publicly show attendee emails.
- Do not publicly show custom registration fields.
- Public attendee visibility must be explicit.

---

# 27. Empty States and Error States

## No Upcoming Events

```text
No upcoming events found.

Try adjusting your filters or browse past events.
[Reset filters]
```

## No Tickets Yet, Admin

```text
No tickets or RSVPs have been created for this event.

[+ New Ticket] [+ New RSVP]
```

## Ticket Sold Out

```text
Sold out

General Admission is currently sold out.
[Join waitlist]
```

## Ticket Not Yet Available

```text
Tickets are not yet available.

Sales begin May 1, 2026 at 9:00 AM.
```

## Sale Ended

```text
Ticket sales have ended.
```

## Event Passed

```text
This event has passed.
```

## Checkout Inventory Conflict

```text
Ticket availability changed.

Only 1 VIP Pass remains. Please update your order.
```

---

# 28. Visual Design System

## General Style

Use a clean, neutral design that inherits the site theme but has strong default structure.

## Components

| Component | Use |
|---|---|
| Card | Event, ticket, venue, host, attendee summaries |
| Badge | Free, sold out, canceled, online, VIP |
| Tabs | Settings screens, event views |
| Accordions | Ticket advanced options, attendee fields |
| Modal | Attendee details, edit host/venue inline |
| Toast | Saved, checked in, email resent |
| Table | Admin lists |
| Stepper | Ticket quantity |
| Date picker | Event and sale dates |
| Map card | Venue display |

## Typography

Use three levels:

| Type | Use |
|---|---|
| Page title | Event title / admin page heading |
| Section heading | Tickets, Venue, Host, Event Details |
| Body text | Description, field help, card copy |

## Spacing

- Use generous vertical spacing on public pages.
- Use tighter spacing in admin tables.
- Use consistent card padding, around `20–24px` desktop and `16px` mobile.
- Keep ticket rows dense enough that multiple ticket types are visible without excessive scrolling.

## Buttons

| Button | Use |
|---|---|
| Primary | Get Tickets, RSVP, Save Ticket, Complete Purchase |
| Secondary | View Event, Add to Calendar, Edit Venue |
| Destructive | Delete ticket, cancel attendee |
| Text link | Reset filters, remove host, edit |

---

# 29. Responsive Behavior

## Desktop

- Two-column single event page.
- Full calendar grid.
- Inline filters.
- Admin list tables show all key columns.

## Tablet

- Event page can remain two-column if width allows.
- Calendar may use reduced event labels.
- Admin side panels can become full-width sections.

## Mobile

- Single event page becomes one column.
- Ticket module appears before long metadata sections.
- Month calendar uses dots/counts with event cards below.
- Filters stack vertically.
- Tables become card lists or horizontal-scroll tables.
- Ticket quantity selectors become large touch targets.
- Check-in scanner is mobile-first.

---

# 30. Suggested Build Order

Build these screens in this order:

1. Admin event editor shell.
2. Venue admin + inline venue selector.
3. Host admin + inline host selector.
4. Single event public page with venue/host cards.
5. Events list view.
6. Calendar month view.
7. Ticket/RSVP admin panel.
8. Front-end ticket/RSVP form.
9. Checkout and confirmation page.
10. Ticket confirmation email.
11. Attendee report.
12. QR check-in.
13. Settings pages.
14. Venue and host public pages.
15. Public attendee list and waitlist.

---

# 31. Acceptance Criteria

## Venue Acceptance Criteria

- Admin can create a venue with only a name.
- Admin can create a venue with full address/contact/map data.
- Admin can select an existing venue while editing an event.
- Admin can create a new venue inline while editing an event.
- Venue appears on the event page.
- Venue name links to a venue detail page.
- Venue detail page lists upcoming events at that venue.
- Venue map displays only if map setting is enabled and address/coordinates are valid.
- Deleting or archiving a venue does not delete past events.
- Search/filter by venue works.

## Host Acceptance Criteria

- Admin can create a host with only a name.
- Admin can add email, phone, website, image, bio, and socials.
- Admin can select existing host while editing an event.
- Admin can create a new host inline while editing an event.
- Event can have multiple hosts.
- Host appears on event page.
- Host links to host detail page.
- Host page lists upcoming events.
- Private host contact fields do not render publicly.
- Search/filter by host works.

## Ticketing Acceptance Criteria

- Admin can add a paid ticket to an event.
- Admin can add a free RSVP to an event.
- Admin can add multiple ticket types to one event.
- Ticket form respects start sale and end sale dates.
- Ticket form displays sold-out state correctly.
- Per-ticket capacity prevents overselling.
- Shared capacity prevents total event overselling.
- Checkout creates an order.
- Successful payment creates attendee records.
- Failed payment does not create attendee records.
- Duplicate webhook does not create duplicate attendees.
- Confirmation email is sent after successful registration or purchase.
- Each attendee receives a unique ticket/security code.
- Admin can view attendees for one event.
- Admin can view all attendees globally.
- Admin can export attendees to CSV.
- Admin can manually add an attendee.
- Admin can check in an attendee manually.
- Admin can check in an attendee by QR code.
- Already checked-in tickets show an “already checked in” warning.
- Refunded/canceled tickets cannot be checked in.
- Admin can resend ticket email.
- Required attendee fields are enforced.
- Public attendee visibility is opt-in or configurable.

---

# 32. Common Mistakes to Avoid

## Mistake 1: Treating Ticket Price as an Event Field

Bad:

```text
event.price = 25
```

Good:

```text
event has many ticket_types
ticket_type.price = 25
ticket_type.capacity = 100
ticket_type.sale_window = ...
```

## Mistake 2: No Attendee Entity

Bad:

```text
order says user bought 3 tickets
```

Good:

```text
order has 3 attendee records, each with its own name, email, ticket code, QR token, and check-in status
```

## Mistake 3: No Checkout Inventory Hold

Bad:

```text
check availability when user adds to cart
then assume still available after checkout
```

Good:

```text
create temporary hold
expire hold if unpaid
convert hold to sale after payment confirmation
```

## Mistake 4: No Shared Capacity

Bad:

```text
Adult capacity = 100
Child capacity = 100
Senior capacity = 100
Venue capacity is accidentally 300
```

Good:

```text
shared_capacity = 100
all ticket types pull from same pool
```

## Mistake 5: Hosts and Venues Duplicated Per Event

Bad:

```text
venue_name, venue_address copied into every event
```

Good:

```text
venue is reusable
event references venue_id
event can override room/stage notes
```

## Mistake 6: QR Codes Are Just Attendee IDs

Bad:

```text
/check-in?attendee_id=123
```

Good:

```text
/check-in?token=signed_random_token
```

## Mistake 7: No Order-Status Handling

Bad:

```text
create tickets as soon as checkout starts
```

Good:

```text
create tickets only after payment success or configured completed order status
```

---

# 33. Copy/Paste Developer Agent Brief

```text
Build the event system UI close to The Events Calendar + Event Tickets.

Design principle:
- Public pages should be clean, card-based, responsive, and conversion-oriented.
- Admin pages should feel WordPress-native, with list tables, editor panels, sidebars, meta boxes/cards, and familiar save/publish flows.
- Venues and hosts are reusable content records.
- Tickets, RSVPs, orders, attendees, and check-ins are operational records attached to events.

Required public pages:
1. Events Calendar page
   - Search/filter bar.
   - Month/List/Day view toggle.
   - Desktop month grid with event titles and hover cards.
   - Mobile month picker with event dots and cards below.
   - Previous/next navigation.
   - Export/subscribe links.

2. Events List page
   - Date-grouped event cards.
   - Each card shows image, title, date/time, venue, host, excerpt, price/status, CTA.
   - Support states: free, paid, sold out, canceled, postponed, online, no events.

3. Single Event page
   - Header with category, title, date/time/timezone, host, status badges.
   - Hero image.
   - Event description.
   - Ticket/RSVP module.
   - Event details card.
   - Venue card with map/link.
   - Host card.
   - Add-to-calendar links.
   - Related/upcoming events.
   - Mobile stacks into one column.

4. Venue page
   - Hero image, venue name, address summary, directions/website buttons.
   - Venue details card.
   - Map block.
   - Upcoming events at this venue.
   - Empty state when no upcoming events.

5. Host page
   - Headshot/logo, host name, type/role, bio, website/social/contact links.
   - Upcoming events by this host.
   - Respect contact visibility.

Required admin pages:
1. Events list table
   - Columns: title, start date, end date, venue, host, tickets, attendees, status.
   - Filters for date, category, venue, host, status.
   - Row actions: edit, view, duplicate, attendees, tickets, trash.

2. Add/Edit Event page
   - Title, slug, rich editor, publish controls, featured image, categories/tags.
   - Event Details panel with start/end date/time, all-day, timezone, event status, event website, event type.
   - Venue panel with search existing venue, create new venue inline, edit selected venue, remove venue.
   - Host panel with search existing host, create new host inline, multiple hosts, host roles, primary host.
   - Tickets & RSVPs panel with New Ticket, New RSVP, Settings.

3. Venue admin
   - Venue list table.
   - Venue editor with name, description, address, city, state/region, postal code, country, phone, website, latitude, longitude, show map, show map link, featured image, parking/accessibility notes.

4. Host admin
   - Host list table.
   - Host editor with name, type, bio, email, phone, website, social links, contact visibility, featured image/logo.

5. Ticket admin inside event editor
   - Empty state.
   - Buttons: New Ticket, New RSVP, Settings.
   - Ticket settings modal with commerce provider, shared event capacity, public attendee list, form location, stock display threshold.
   - Ticket form with name, description, ticket type, price, sale price, capacity, shared-capacity option, sale start/end, SKU, visibility, min/max quantity, attendee information.
   - Saved ticket compact rows with edit, duplicate, delete.
   - RSVP form with name, description, capacity, start/end, attendee info, allow “can’t go.”

6. Checkout
   - Contact info.
   - Attendee info.
   - Payment section.
   - Order summary sidebar.
   - Inventory conflict, payment failed, checkout expired, and success states.

7. Order confirmation
   - Thank-you message.
   - Order number.
   - Event summary.
   - Ticket list with attendee names and security codes.
   - Download tickets, add to calendar, view event buttons.

8. Ticket email
   - Header logo.
   - Event title/date/time.
   - Ticket type, attendee name, ticket number, security code, QR code.
   - Venue and host info.
   - Add-to-calendar links.
   - Support/refund footer.

9. Attendee report
   - Global attendees page and per-event attendees page.
   - Search/filter by event, ticket type, order status, checked-in status, purchaser, email, ticket/security code.
   - Table with attendee, email, event, ticket, order, security code, status, check-in, actions.
   - Bulk actions: check in, reverse check-in, resend tickets, export, move, cancel/delete.
   - Attendee detail modal with custom registration fields.
   - Print, CSV export, email attendees.

10. QR check-in
   - Mobile-first scanner.
   - Event selector.
   - Manual lookup.
   - Recent scans.
   - Result states: success, already checked in, invalid, wrong event, canceled/refunded.
   - Limited staff permissions.

Required settings:
- General: post types, RSVP/ticket form location, ticket-left threshold, login requirements.
- Payments: Stripe, PayPal, WooCommerce/native checkout, currency, webhooks.
- Emails: ticket confirmation, RSVP confirmation, order receipt, resend, refund/cancellation, waitlist emails, sender info, styling.
- Display: calendar/list defaults, map behavior, badges, stock display.
- Integrations: QR scanner/API key, calendar export, webhooks.

Do not build:
- A single event.price field.
- Duplicated venue text per event.
- Duplicated host text per event.
- Ticket purchase without attendee records.
- QR codes based only on guessable attendee IDs.
- Checkout without inventory holds.
- Payment webhook flow that can create duplicate attendees.
```

---

# Final Implementation Reminder

The most important design instruction is:

> Build reusable content screens for venues and hosts, but build ticketing as a structured operational flow with tickets, RSVPs, checkout, attendee records, emails, and check-in.

That distinction is what will make the product feel close to The Events Calendar instead of a basic event form.
