#!/usr/bin/env python3

import csv
import json
import os
import pathlib
import time
import urllib.error
import urllib.request
from urllib.parse import urlencode


WORKSPACE_GID = "1121814557377551"
TEAM_GID = "1173498758723192"
PROJECT_NAME = "Positives Finish Roadmap"
PROJECT_GID = "1214005103885510"
USER_GID = "1207836522534256"
CSV_PATH = pathlib.Path("docs/reports/2026-04-10-positives-asana-import.csv")

COMPLETED_SECTION_NAME = "Completed / Already Built"
WANTED_SECTIONS = [
    COMPLETED_SECTION_NAME,
    "Phase 0 — Repo Stabilization",
    "Phase 1 — Content Model + Member Experience",
    "Phase 2 — Affiliate + Email + Growth Systems",
    "Phase 3 — Tier Features: Events + Coaching",
    "Phase 4 — Marketing + Funnel Variants + Launch Polish",
    "Phase 5 — Deferred / Post-Launch",
    "Blocked / Needs Decision",
]

COMPLETED_TASKS = [
    ("Launch positives.life on the public domain", "The live public site is up on positives.life and serving the current Positives experience."),
    ("Set up Stripe recurring membership pricing for Levels 1, 2, and 3", "Stripe-backed monthly and annual pricing is live for the active paid tiers."),
    ("Implement member authentication with Supabase", "Members can sign in and access protected routes through the live auth stack."),
    ("Build protected member route gating", "Member-only routes are protected and redirect appropriately when the user is not signed in or not eligible."),
    ("Build Today page foundation for the daily practice experience", "The current-month Today page exists and already anchors the daily, weekly, and monthly rhythm."),
    ("Build journaling and member note-saving capability", "Members can save practice-related notes and journal entries inside the app."),
    ("Build the library experience and resource pages", "Members can browse library content and open individual library resources."),
    ("Build monthly archive route structure", "Archive month pages already exist at /library/months/[monthYear]."),
    ("Build Level 3 coaching member route foundation", "The coaching route and content query foundation already exist for higher-tier members."),
    ("Build Level 2 community route with tier gating", "The community route exists and already uses tier-aware access control."),
    ("Build member account page with timezone and security settings", "Account management includes timezone, password/security, and billing access foundations."),
    ("Integrate the Stripe billing portal", "Members can reach the billing portal for payment method and subscription self-service."),
    ("Build the admin shell and protected admin dashboard", "The admin area exists and is protected behind admin-only access rules."),
    ("Build admin content management pages", "Admins can create, edit, and manage content through the admin UI."),
    ("Build admin month workspace for practice planning", "Admins have a month-focused workspace for themes, weekly reflections, and daily audio organization."),
    ("Build admin member management views", "The admin area includes member list and member-detail views."),
    ("Build admin course management surfaces", "Admin course management routes and supporting actions are already in place."),
    ("Build admin email template management surfaces", "There is already an admin UI for editing and organizing core email templates."),
    ("Implement Resend-based lifecycle email framework", "App-managed onboarding, payment recovery, and winback email frameworks already exist."),
    ("Implement Stripe webhook subscription sync foundation", "Stripe webhook handling already updates the app state around billing and membership."),
    ("Implement ActiveCampaign sync foundation", "ActiveCampaign sync logic already exists for member and affiliate-related lifecycle events."),
    ("Migrate affiliate attribution to FirstPromoter", "FirstPromoter is already the current affiliate attribution and reporting source of truth."),
    ("Build the in-app affiliate portal foundation", "The member-facing affiliate portal already exists inside Positives."),
    ("Add PayPal payout-readiness to the affiliate flow", "The affiliate experience already includes payout-readiness handling around PayPal email."),
    ("Add support and contact flows", "Support and contact routes already exist on the public site."),
    ("Publish privacy and terms pages", "Core legal pages for privacy and terms are already live."),
    ("Add GA4 phase-one analytics instrumentation", "Phase-one Google Analytics instrumentation already exists in the codebase."),
    ("Build the public join flow for paid membership", "The current public join path already supports paid signup into the membership platform."),
]


class AsanaClient:
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def request(self, method: str, path: str, data=None, params=None):
        url = "https://app.asana.com/api/1.0" + path
        if params:
            url += "?" + urlencode(params)
        body = None
        if data is not None:
            body = json.dumps({"data": data}).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path} failed: {exc.code} {detail}") from exc

    def get_all(self, path: str, params=None):
        params = dict(params or {})
        params.setdefault("limit", 100)
        rows = []
        while True:
            payload = self.request("GET", path, params=params)
            rows.extend(payload["data"])
            next_page = payload.get("next_page")
            if not next_page or not next_page.get("offset"):
                break
            params["offset"] = next_page["offset"]
        return rows


def load_token() -> str:
    token = os.environ.get("ASANA_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("ASANA_ACCESS_TOKEN is not set in the environment.")
    return token


def ensure_sections(client: AsanaClient):
    sections = client.get_all(f"/projects/{PROJECT_GID}/sections", {"opt_fields": "gid,name"})
    section_map = {section["name"]: section["gid"] for section in sections}

    if COMPLETED_SECTION_NAME not in section_map:
        untitled = next((section for section in sections if section["name"] == "Untitled section"), None)
        if untitled:
            client.request("PUT", f"/sections/{untitled['gid']}", data={"name": COMPLETED_SECTION_NAME})
            section_map.pop("Untitled section", None)
            section_map[COMPLETED_SECTION_NAME] = untitled["gid"]
        else:
            created = client.request("POST", f"/projects/{PROJECT_GID}/sections", data={"name": COMPLETED_SECTION_NAME})["data"]
            section_map[COMPLETED_SECTION_NAME] = created["gid"]

    for section_name in WANTED_SECTIONS:
        if section_name not in section_map:
            created = client.request("POST", f"/projects/{PROJECT_GID}/sections", data={"name": section_name})["data"]
            section_map[section_name] = created["gid"]

    return section_map


def sync_roadmap_tasks(client: AsanaClient, section_map):
    all_tasks = client.get_all(
        f"/projects/{PROJECT_GID}/tasks",
        {"opt_fields": "gid,name,assignee.gid,completed"},
    )
    existing = {task["name"]: task for task in all_tasks}

    created = 0
    for row in csv.DictReader(CSV_PATH.open(newline="")):
        name = row["Name"]
        if name in existing:
            continue
        notes = (
            f"{row['Description'].strip()}\n\n"
            f"Area: {row['Area']}\n"
            f"Priority: {row['Priority']}\n"
            f"Status: {row['Status']}\n"
            f"Launch Gate: {row['Launch Gate']}\n"
            f"Type: {row['Type']}"
        )
        client.request(
            "POST",
            "/tasks",
            data={
                "workspace": WORKSPACE_GID,
                "name": name,
                "notes": notes,
                "assignee": USER_GID,
                "memberships": [{"project": PROJECT_GID, "section": section_map[row["Section/Column"]]}],
            },
        )
        created += 1
        time.sleep(0.03)

    return created


def backfill_completed_tasks(client: AsanaClient, section_map):
    all_tasks = client.get_all(
        f"/projects/{PROJECT_GID}/tasks",
        {"opt_fields": "gid,name,assignee.gid,completed"},
    )
    existing = {task["name"]: task for task in all_tasks}

    created_completed = 0
    completed_now = 0

    repo_green_task = existing.get("Fix affiliate repo blockers and get lint/build green")
    if repo_green_task and not repo_green_task.get("completed"):
        client.request("PUT", f"/tasks/{repo_green_task['gid']}", data={"completed": True, "assignee": USER_GID})
        completed_now += 1

    for name, description in COMPLETED_TASKS:
        if name in existing:
            updates = {}
            task = existing[name]
            if not task.get("completed"):
                updates["completed"] = True
            assignee = task.get("assignee") or {}
            if assignee.get("gid") != USER_GID:
                updates["assignee"] = USER_GID
            if updates:
                client.request("PUT", f"/tasks/{task['gid']}", data=updates)
            continue

        notes = description + "\n\nStatus: Done\nCategory: Already built before current finish roadmap execution"
        client.request(
            "POST",
            "/tasks",
            data={
                "workspace": WORKSPACE_GID,
                "name": name,
                "notes": notes,
                "assignee": USER_GID,
                "completed": True,
                "memberships": [{"project": PROJECT_GID, "section": section_map[COMPLETED_SECTION_NAME]}],
            },
        )
        created_completed += 1
        time.sleep(0.03)

    return created_completed, completed_now


def assign_all_tasks(client: AsanaClient):
    all_tasks = client.get_all(
        f"/projects/{PROJECT_GID}/tasks",
        {"opt_fields": "gid,name,assignee.gid,completed"},
    )
    reassigned = 0
    for task in all_tasks:
        assignee = task.get("assignee") or {}
        if assignee.get("gid") != USER_GID:
            client.request("PUT", f"/tasks/{task['gid']}", data={"assignee": USER_GID})
            reassigned += 1
            time.sleep(0.02)
    return reassigned


def main():
    client = AsanaClient(load_token())
    section_map = ensure_sections(client)
    created_roadmap = sync_roadmap_tasks(client, section_map)
    created_completed, completed_now = backfill_completed_tasks(client, section_map)
    reassigned = assign_all_tasks(client)

    sections = client.get_all(f"/projects/{PROJECT_GID}/sections", {"opt_fields": "gid,name"})
    section_counts = {}
    for section in sections:
        tasks = client.get_all(f"/sections/{section['gid']}/tasks", {"opt_fields": "gid"})
        section_counts[section["name"]] = len(tasks)

    project = client.request(
        "GET",
        f"/projects/{PROJECT_GID}",
        params={"opt_fields": "gid,name,permalink_url"},
    )["data"]

    print(
        json.dumps(
            {
                "project_name": project["name"],
                "project_url": project["permalink_url"],
                "created_roadmap_tasks_this_run": created_roadmap,
                "created_completed_tasks_this_run": created_completed,
                "tasks_marked_complete_this_run": completed_now,
                "tasks_assigned_to_ryan_this_run": reassigned,
                "section_counts": section_counts,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
