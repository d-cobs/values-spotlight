// api/kudos.js — Vercel serverless function
// Fetches kudos from Motivosity for the current all-hands window:
//   Wednesday 1:00 PM PT  →  following Wednesday 12:00 PM PT

const MV_BASE = 'https://app.motivosity.com/api/v2';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const appId       = process.env.MOTIVOSITY_APP_ID;
  const secureToken = process.env.MOTIVOSITY_SECURE_TOKEN;

  if (!appId || !secureToken) {
    return res.status(500).json({
      error: 'Missing MOTIVOSITY_APP_ID or MOTIVOSITY_SECURE_TOKEN environment variables.',
    });
  }

  try {
    const { startDate, endDate, label } = getKudosWindow();

    const appreciations = await fetchAppreciations(appId, secureToken, startDate, endDate);
    const kudos         = appreciations.map(toEntry).filter(Boolean);

    res.json({ kudos, window: { startDate, endDate, label } });
  } catch (err) {
    console.error('kudos api error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ── Date window ───────────────────────────────────────────────────────────────
// All-hands: every Wednesday at 12:00 PM PT.
// Eligible window: previous Wednesday 1:00 PM PT → current Wednesday 12:00 PM PT.
function getKudosWindow() {
  const now    = new Date();
  const ptDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const dayPT  = ptDate.getDay();
  const hourPT = ptDate.getHours();
  const minPT  = ptDate.getMinutes();

  let daysBack = ((dayPT - 3) + 7) % 7;
  const isWedBeforeClose = daysBack === 0 && (hourPT < 13 || (hourPT === 13 && minPT === 0));
  if (isWedBeforeClose) daysBack = 7;

  const startPT = new Date(ptDate);
  startPT.setDate(startPT.getDate() - daysBack);
  startPT.setHours(13, 0, 0, 0);

  const endPT = new Date(startPT);
  endPT.setDate(endPT.getDate() + 7);
  endPT.setHours(12, 0, 0, 0);

  const toISODate = d => d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); // YYYY-MM-DD
  const fmt       = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });

  return {
    startDate: toISODate(startPT),
    endDate:   toISODate(new Date(Math.min(endPT, now))),
    label:     `Week of ${fmt(startPT)} – ${fmt(endPT)}`,
  };
}

// ── Motivosity API ────────────────────────────────────────────────────────────
async function mvGet(appId, secureToken, path, params = {}) {
  const url = new URL(`${MV_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: {
  'Authorization': `Bearer ${secureToken}`,
  'Content-Type': 'application/json',
},
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Motivosity API error [${path}] ${res.status}: ${text}`);
  }

  return res.json();
}

async function fetchAppreciations(appId, secureToken, startDate, endDate) {
  const all  = [];
  let   page = 0;

  while (true) {
    const data = await mvGet(appId, secureToken, '/appreciation', {
      startDate,
      endDate,
      page,
      size: 100,
    });

    // Motivosity returns Spring-style pagination: { content: [...], totalPages, ... }
    const items = data.content ?? data ?? [];
    all.push(...items);

    const totalPages = data.totalPages ?? 1;
    if (page >= totalPages - 1 || items.length === 0) break;
    page++;
  }

  return all;
}

// ── Map a Motivosity appreciation → { name, value, note } ────────────────────
//
// Motivosity appreciation fields (adjust if your org's API returns different keys):
//   toUser        → { firstName, lastName, fullName }   — the recipient
//   fromUser      → { firstName, lastName }              — the giver
//   note          → string                               — the kudos message
//   companyValue  → { name }                             — the value tagged
//   createdDate   → ISO date string
//
// If the spinner is showing blank names/values, log `appreciation` here to inspect
// the real field names your org's API returns and adjust accordingly.
function toEntry(appreciation) {
  // Recipient name
  const toUser = appreciation.toUser ?? appreciation.recipient ?? {};
  const name =
    toUser.fullName?.trim() ||
    [toUser.firstName, toUser.lastName].filter(Boolean).join(' ').trim() ||
    null;

  if (!name) return null; // skip if we can't determine a recipient

  // Company value
  const value =
    appreciation.companyValue?.name?.trim() ||
    appreciation.badge?.name?.trim() ||
    '';

  // Kudos note
  const note =
    (appreciation.note ?? appreciation.message ?? '').trim();

  return { name, value, note };
}
