# ADR 0001 — Core Architecture

## Status
Accepted

## Context

The Positives platform needs a clean, extensible architecture that supports a daily-practice membership experience, protected paid access, future audio ingestion workflows, private podcast delivery, and deeper coaching-related modules.

## Decisions

### 1. Next.js on Vercel
The web application will use Next.js App Router and deploy on Vercel.

### 2. Supabase as Source of Truth
Supabase is the single source of truth for:
- members
- content records
- mirrored subscription state
- progress
- journal entries
- community records

### 3. Stripe as Billing Authority
Stripe is authoritative for billing and subscription lifecycle state.
Protected access decisions must be driven by server-side state derived from Stripe webhooks.

### 4. Vimeo for Video
Vimeo is the video host for workshops, monthly videos, and replay assets.

### 5. Google Drive → S3 for Audio Ingestion
Daily audio enters through a designated Google Drive folder.
The system ingests those files into S3 for storage and processing.

### 6. Castos for Private Podcast Delivery
Castos is the private podcast delivery layer for member audio feed access.

### 7. Mobile-First Product Design
The member experience should prioritize mobile usage and a calm, low-friction interface.

### 8. Daily Practice as Primary Experience
The `/today` experience and the daily audio practice are the highest-priority member flows.

## Consequences

This architecture supports:
- strong system boundaries
- reliable future ingestion automation
- clean billing access enforcement
- modular product growth

It also means:
- client-side billing state must never be trusted
- async workflows should be explicit and observable
- repo structure should favor clear separation of concerns