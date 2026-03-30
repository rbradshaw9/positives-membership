Positives Platform

Practice-based membership platform for daily grounding, emotional resilience, and personal growth.

Positives is designed to feel like a gym for personal growth. Members do not complete it — they return to it. The product centers on a daily audio practice supported by weekly principles, monthly themes, journaling, progress tracking, coaching, and private podcast delivery.

Product Summary

The core experience is simple:

Daily: short grounding audio from Dr. Paul
Weekly: a principle and simple practice
Monthly: a deeper theme for reflection and growth

Over time, members can deepen engagement through:

content library
quarterly events
coaching circle
executive coaching
Core Principles
Simplicity: the experience should always feel calm and obvious
Habit formation: daily engagement is the primary success metric
Emotional support: this should feel closer to a wellness app than a course portal
No “behind” feeling: no linear curriculum, no completion states
Tech Stack
Frontend: Next.js
Hosting: Vercel
Database/Auth: Supabase
Payments: Stripe
Video: Vimeo
Audio ingestion: Google Drive → S3
Private podcast feed: Castos
Email automation: ActiveCampaign
SMS: Twilio
Architecture Notes
Source of Truth

Supabase is the single source of truth for:

members
subscription status
content access
progress tracking
journaling
engagement data
Billing Access Model

Stripe drives billing state. Access decisions are enforced server-side. Client-side subscription state is never trusted.

Daily Audio Pipeline
Dr. Paul uploads audio to a designated Google Drive folder
The system ingests the file into S3
The file is transcribed
AI generates suggested title, description, and tags
Admin reviews and approves content
Audio is published to:
the Positives platform
the private member podcast feed via Castos
Video Delivery

Vimeo is the system of record for hosted video content, including workshops, monthly videos, and event replays.

Product Modules
Daily Practice Engine
Content Library
Journal
Community / Q&A
Coaching System
Admin Dashboard
Analytics & Retention
Planned Membership Structure
Level 1 — Membership
daily audio
weekly principles
monthly themes
content library
private podcast feed
Level 2 — Membership + Events + Q&A
everything in Level 1
quarterly virtual events
Q&A access
event replays
Level 3 — Coaching Circle
everything in Levels 1 and 2
weekly group coaching
coaching replays
implementation support
Level 4 — Executive Coaching
everything in Levels 1–3
bi-weekly 1:1 coaching
personalized support
Member Retention Features
daily streak tracking
reflection prompts
private journal
milestone celebrations
engagement reminders
Build Priorities
Auth
Stripe subscriptions + webhook handling
Access middleware
Daily audio player
Google Drive ingestion pipeline
S3 storage workflow
Transcription + AI metadata generation
Castos publishing
Journal system
Content library
Vimeo integration
Community / Q&A
Coaching
Admin dashboard
Analytics
Repository Goals

This repository should remain aligned with the following standards:

mobile-first UX
calm, low-cognitive-load interface
server-enforced access control
clean separation between ingestion, publishing, and delivery
architecture that is easy for AI agents and human developers to extend safely
Related Internal Documents

This repo is built from three core planning documents:

North Star Documentation
AI Technical Build Specification
Agent Roles & Responsibilities Specification

These should be kept up to date as the product evolves.

Status

This project is currently in active rebuild / fresh-start mode.

The goal of the rebuild is to create a clean, durable foundation that matches the current product architecture rather than continuing from an early exploratory scaffold.

License

Private project. All rights reserved.