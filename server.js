// Man Village Rolodex — public member-card directory.
// Express API + static frontend. Postgres when DATABASE_URL is set (Railway),
// in-memory store otherwise (local dev only — data is lost on restart).

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const store = require("./src/store");

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "";

const FIELDS = {
  name: 60, phone: 30, fax: 30, email: 120, social: 120, website: 120,
  business: 80, category: 50, area: 60, activities: 220, misc: 120,
};
const REQUIRED = ["name", "category"];

const tidy = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
const titleCase = (s) => tidy(s).replace(/\b([a-z])/g, (m, c) => c.toUpperCase());
const hash = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const safeEqual = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};
const newEditCode = () =>
  crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "x").slice(0, 10).toUpperCase();

function clean(body) {
  const out = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    let v = tidy(body?.[k]);
    if (v.length > max) v = v.slice(0, max);
    out[k] = v;
  }
  out.category = titleCase(out.category);
  out.area = titleCase(out.area);
  return out;
}
function validate(card) {
  for (const k of REQUIRED) if (!card[k]) return `${k === "name" ? "Name" : "Occupation"} is required.`;
  if (card.website && !/^(https?:\/\/)?[^\s/]+\.[^\s]+$/i.test(card.website)) return "Website doesn't look like a web address.";
  return null;
}
const isAdmin = (req) => ADMIN_KEY && safeEqual(req.get("x-admin-key") || "", ADMIN_KEY);
const publicCard = (c) => {
  const { edit_hash, ...rest } = c;
  return rest;
};

const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(express.json({ limit: "20kb" }));

const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many changes from this connection. Wait a few minutes and try again." } });

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.get("/api/cards", async (req, res, next) => {
  try { res.json((await store.list()).map(publicCard)); } catch (e) { next(e); }
});

app.post("/api/cards", writeLimiter, async (req, res, next) => {
  try {
    if (tidy(req.body?.company_url)) return res.status(201).json({ ok: true }); // honeypot: silently drop bots
    const card = clean(req.body);
    const err = validate(card);
    if (err) return res.status(400).json({ error: err });
    const editCode = newEditCode();
    const saved = await store.create({ ...card, edit_hash: hash(editCode) });
    res.status(201).json({ card: publicCard(saved), editCode });
  } catch (e) { next(e); }
});

async function authorize(req, res) {
  const existing = await store.get(req.params.id);
  if (!existing) { res.status(404).json({ error: "That card no longer exists." }); return null; }
  const code = tidy(req.get("x-edit-code")).toUpperCase();
  if (isAdmin(req) || (code && safeEqual(hash(code), existing.edit_hash))) return existing;
  res.status(403).json({ error: "That edit code doesn't match this card." });
  return null;
}

app.put("/api/cards/:id", writeLimiter, async (req, res, next) => {
  try {
    if (!(await authorize(req, res))) return;
    const card = clean(req.body);
    const err = validate(card);
    if (err) return res.status(400).json({ error: err });
    res.json({ card: publicCard(await store.update(req.params.id, card)) });
  } catch (e) { next(e); }
});

app.delete("/api/cards/:id", writeLimiter, async (req, res, next) => {
  try {
    if (!(await authorize(req, res))) return;
    await store.remove(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Check an edit code or admin key without changing anything.
app.post("/api/cards/:id/verify", writeLimiter, async (req, res, next) => {
  try { if (await authorize(req, res)) res.json({ ok: true }); } catch (e) { next(e); }
});
app.post("/api/admin/verify", writeLimiter, (req, res) =>
  isAdmin(req) ? res.json({ ok: true }) : res.status(403).json({ error: "Wrong admin key." }));

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Try again." });
});

store.init().then(() => {
  app.listen(PORT, () => console.log(`Man Village Rolodex on :${PORT} (${store.kind} store)`));
}).catch((e) => { console.error("Failed to start:", e); process.exit(1); });
