# Values Spotlight — IT Setup Guide

This tool powers a live recognition spinner for our weekly all-hands. It reads kudos from Motivosity and randomly selects a winner for a $25 award.

**Estimated setup time: 10–15 minutes**

---

## What you need
- The Motivosity API credentials (App ID + Secure Token) — already provided
- Access to our Vercel account (or ability to create a free one at vercel.com)
- A GitHub account to host the project code

> ⚠️ **Keep the credentials secure.** Do not paste them into any code file or commit them to Git. They go into Vercel's environment variables only (Step 3).

---

## Step 1 — Push the project to GitHub

1. Create a new **private** GitHub repo (e.g. `values-spotlight`)
2. Push the contents of this folder to that repo
3. That's it — no code changes needed

---

## Step 2 — Connect to Vercel

1. Go to **https://vercel.com** → **Add New Project**
2. Import the GitHub repo you just created
3. Vercel will auto-detect all the settings — no changes needed to the build config

---

## Step 3 — Add environment variables

Before clicking Deploy, go to **Environment Variables** and add these two:

| Name | Value |
|------|-------|
| `MOTIVOSITY_APP_ID` | The App ID from the API credentials |
| `MOTIVOSITY_SECURE_TOKEN` | The Secure Token (long JWT string) from the credentials |

Then click **Deploy**. In ~30 seconds you'll get a live URL like `values-spotlight.vercel.app`.

---

## Step 4 — Test it

Open the Vercel URL in a browser. The spinner should load with this week's real recognitions from Motivosity. If no kudos have been given yet this week, it will show demo data until the first real one appears.

---

## How the date window works

The spinner pulls recognitions from a rolling window that resets automatically each week — no manual action needed:

- **Window opens:** Previous Wednesday at 1:00 PM PT
- **Window closes:** Current Wednesday at 12:00 PM PT (right before all-hands)

---

## Troubleshooting

**Spinner shows demo data after deploy**
- Double-check the environment variables are set correctly in Vercel (Project Settings → Environment Variables)
- Verify there are recognitions in Motivosity within the current window dates

**Names or values showing as blank**
- The Motivosity API field names may differ slightly from what's expected. Open `api/kudos.js`, find the `toEntry()` function at the bottom, and add a `console.log(appreciation)` line — then check Vercel's function logs (Project → Functions tab) to see the real field names returned and adjust accordingly.

**API returning 401 / Unauthorized**
- The secure token may have expired. Contact Motivosity support to generate a new one, then update the `MOTIVOSITY_SECURE_TOKEN` environment variable in Vercel.

---

## Questions?

Reach out to Danielle (danielle@eigenlabs.org) with any questions.
