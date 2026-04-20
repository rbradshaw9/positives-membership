<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Completion Honesty Rule

Do not summarize a sprint, task, or plan as complete unless every user-stated
acceptance criterion is actually satisfied or explicitly moved into a named
follow-up task.

- If build/lint passes but UX, content, performance, data, or external-account
  verification is still pending, say the implementation is verified but the
  launch task is not fully complete.
- If an Asana task has comments or subtasks describing real remaining work,
  either leave it open or create a specific follow-up before closing it.
- When reporting results, distinguish shipped code from verified production
  behavior and from manual setup still required outside the repo.
