// Card storage. Postgres when DATABASE_URL is set; in-memory fallback for local dev.
const crypto = require("crypto");

const COLS = ["name", "phone", "fax", "email", "social", "website", "business", "category", "area", "activities", "misc"];

function pgStore(url) {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1|\.railway\.internal/.test(url) ? false : { rejectUnauthorized: false },
  });
  return {
    kind: "postgres",
    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY,
          ${COLS.map((c) => `${c} TEXT NOT NULL DEFAULT ''`).join(",\n          ")},
          edit_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
    },
    async list() {
      const { rows } = await pool.query(`SELECT * FROM cards ORDER BY lower(category), lower(name)`);
      return rows;
    },
    async get(id) {
      const { rows } = await pool.query(`SELECT * FROM cards WHERE id = $1`, [id]);
      return rows[0] || null;
    },
    async create(card) {
      const id = crypto.randomUUID();
      const cols = [...COLS, "edit_hash"];
      const { rows } = await pool.query(
        `INSERT INTO cards (id, ${cols.join(", ")}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}) RETURNING *`,
        [id, ...cols.map((c) => card[c] ?? "")]
      );
      return rows[0];
    },
    async update(id, card) {
      const { rows } = await pool.query(
        `UPDATE cards SET ${COLS.map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
        [id, ...COLS.map((c) => card[c] ?? "")]
      );
      return rows[0];
    },
    async remove(id) {
      await pool.query(`DELETE FROM cards WHERE id = $1`, [id]);
    },
  };
}

function memoryStore() {
  const rows = new Map();
  const now = () => new Date().toISOString();
  return {
    kind: "memory (dev only — set DATABASE_URL to persist)",
    async init() {},
    async list() {
      const k = (s) => (s || "").toLowerCase();
      return [...rows.values()].sort((a, b) => k(a.category).localeCompare(k(b.category)) || k(a.name).localeCompare(k(b.name)));
    },
    async get(id) { return rows.get(id) || null; },
    async create(card) {
      const r = { id: crypto.randomUUID(), ...card, created_at: now(), updated_at: now() };
      rows.set(r.id, r); return r;
    },
    async update(id, card) {
      const r = { ...rows.get(id), ...card, updated_at: now() };
      rows.set(id, r); return r;
    },
    async remove(id) { rows.delete(id); },
  };
}

module.exports = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : memoryStore();
