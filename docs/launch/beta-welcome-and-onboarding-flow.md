# Beta Welcome And Onboarding Flow

## Goal

Give beta testers a calm, simple orientation inside the product so they know:

- what to try first
- what kind of feedback helps most
- where to send that feedback

## Product Pattern

- Use a lightweight in-app beta welcome banner in the member shell.
- Keep it dismissible.
- Do not turn it into a multi-step tutorial or a heavy checklist.

## What The Banner Should Do

- explain that the product is in beta
- set the expectation that honest friction is useful
- suggest a few high-value things to try:
  - Today
  - My Practice
  - Library
  - account / billing surfaces
- point directly to the `Share beta feedback` path

## What It Should Not Do

- overwhelm the member
- hide the actual product behind onboarding steps
- feel like a formal course or setup wizard

## Recommended Tone

- calm
- warm
- confident
- transparent about the fact that we are still refining

## Launch Safety

- gate with `ENABLE_BETA_WELCOME`
- default off until we intentionally start the beta cohort
- turn on alongside the beta feedback flow once the related migration and ops process are ready
