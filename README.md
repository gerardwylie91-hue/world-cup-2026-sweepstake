# Steady — Private Recovery

A mobile-first, installable personal recovery journal. The existing Vercel project and URL are retained; the former public ticket/sweepstake site is preserved in Git history and the `archive/ep-ticket-watch-before-recovery` branch.

## What is implemented

- Separate morning/evening check-ins with two optional, validated blood-pressure readings; pulse; sleep; headache; fatigue; wound notes and symptom warnings.
- BP history, honest missing-data handling, 7/30-day averages, morning/evening comparisons, pulse charts and optional clinician-entered ranges. Emergency neurological symptoms take priority regardless of BP.
- An operation-date-based 12-week organising guide, with no automatic medical, exercise, driving or alcohol clearance. Steps are logged, not gamified or prescribed.
- Smoking logs, cravings/triggers, quit planning, explicit-zero streaks and logged-day savings. Unrecorded days are never assumed smoke-free.
- Alcohol-free records and actual-intake logging in Irish standard drinks calculated from mL and ABV. Discussion details may be recorded, but the app never automatically increases intake or treats normal BP as evidence of safety.
- Sleep, symptoms, activity, hydration in litres, food notes and weight in kg.
- Twenty-eight original meal ideas with metric ingredient quantities, approximate times, Thermomix-friendly preparation, hob/oven alternatives and allergy flags. These are not copied Cookidoo instructions or manufacturer-tested programmes.
- A seven-day meal planner, swaps, portion scaling, favourites, eaten flags and an aggregated shopping list. Scaling ingredients does not scale safe appliance capacity or cooking times.
- Editable daily routine, appointment notes, medicines with separate acknowledgements for scheduled times and non-prescriptive as-needed logging.
- Encrypted backup/restore, optional plaintext CSV/clipboard/print exports and recurring Dublin-time calendar reminders exported as an ICS file.
- Mobile home-screen installation and offline app-shell availability after the first successful visit.

## Important limitations

This is a personal logging and organising tool, **not a medical device, emergency monitor, diagnostic system or clinically validated treatment plan**. Clinical instructions override general content. It has not undergone an independent security or clinical certification audit.

The chosen architecture is **encrypted on-device storage**, not a cloud account or automatic cross-device sync. The public website serves generic application code; it does not receive or store the journal. No analytics, advertising scripts, external fonts or health-data APIs are used. External reference sites open only when the user chooses a link.

The journal is held in the current browser's IndexedDB. A passphrase derives a non-extractable AES-256-GCM key through PBKDF2-SHA256 with 600,000 iterations and a random 16-byte salt. Every save uses a fresh 12-byte IV and authenticated context. The key is held in memory while the journal is unlocked. This does not protect against an already compromised or unlocked device, malicious browser extensions, compromised served application code or someone who knows the passphrase.

**A forgotten passphrase cannot be reset.** Keep it safe and export encrypted backups. Clearing site storage, switching browsers or losing the device can lose the local journal. To move devices, restore an encrypted backup and supply its passphrase. Earlier backups retain the passphrase used when they were made.

CSV, clipboard and printed reports are plaintext and require deliberate sharing. The app does not upload reports to ChatGPT, a doctor or another service. To continue a ChatGPT check-in, copy the summary and paste it into the conversation.

Calendar reminders require importing the exported ICS file into a calendar and enabling calendar notifications. They are not background website push notifications. Repeated imports may create duplicate events.

## First use

1. Open the established Vercel URL in the browser you intend to keep using.
2. Create a unique passphrase of at least 12 characters and keep it safely.
3. Enter the actual operation date and clinical instructions. No surgery date, blood-pressure target, fluid target or health readings are guessed.
4. Review food preferences, allergies and the actual Thermomix model. Check labels and manufacturer safety instructions; filters cannot guarantee allergy safety.
5. Add prescribed medicines using their exact label instructions.
6. Complete morning/evening check-ins and export an encrypted backup regularly.
7. Export and import calendar reminders if needed; add the site to the home screen when supported.

## Build and verification

The runtime has no npm dependencies or backend service. Source lives in `steady-src/app.html`, with additional defensive import validation in `validation-hardening.js`.

```sh
node steady-src/release.cjs
node --test steady-src/quality.test.mjs
```

`release.cjs` extracts the source into same-origin HTML, JavaScript and CSS; generates genuine PNG install icons, a manifest and content-versioned public-only service worker; and emits the security configuration. It refuses incomplete source sections or missing hardening.

For browser testing, install an explicitly resolved version of `@playwright/test`, install Chromium, then run:

```sh
npx playwright test --config steady-src/playwright.config.mjs
```

Tests use synthetic journals only and cover encryption, restore, missing values, independent BP thresholds, medication schedules, meal planning, reminders, offline use, desktop/mobile navigation and layout overflow. CI logs and artifacts, not this README, are the source of truth for whether a particular commit passed.

The release workflow runs syntax, unit and real browser checks before updating production configuration. A failed check must not promote a broken or incomplete app. Production output is `public/`; only generic app assets are deployed. `node steady-src/release.cjs --publish-config` is reserved for the successful release step.

## Security and privacy design

- Same-origin script CSP; framing, plugins, camera, microphone, location and payment permissions disabled.
- No indexing, no referrer, no external scripts, no inline script execution.
- Passphrase never persisted; encrypted records only in IndexedDB.
- Serialized saves, revision checks for conflicting tabs, visible save failures and inactivity locking.
- Authenticated and bounded backup parsing, unsafe-object-key rejection, type/range validation and formula-safe CSV cells.
- No fabricated readings, inferred zero-intake days, automated exercise escalation or invented nutrition numbers.

## Recovery and food references

General references are linked inside Safety & help: American Heart Association home BP instructions, neurosurgical postoperative care information, NHS emergency symptoms, NHLBI DASH guidance, HSE smoking/alcohol services, Vorwerk appliance safety and Food Safety Authority of Ireland food-temperature guidance. Manufacturer instructions and individual clinical advice always take priority. The meal ideas are original, are not affiliated with Vorwerk, and are not certified Thermomix Guided Cooking recipes.
