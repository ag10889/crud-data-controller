import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const {
  PORT = 5000,
  DB_HOST,
  DB_USER,
  DB_PASS,
  DB_NAME,
  DB_PORT = 3306,
  TABLE_NAME,
  PK_NAME,
  COLUMNS
} = process.env;

// Validate required envs BEFORE using them
if (!DB_HOST || !DB_USER || !DB_PASS || !DB_NAME || !DB_PORT || !COLUMNS || !TABLE_NAME || !PK_NAME) {
  console.error("Missing required .env values. Needed: DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT, COLUMNS, TABLE_NAME, PK_NAME");
  process.exit(1);
}
const EDITABLE_COLS = COLUMNS.split(",").map(s => s.trim()).filter(Boolean);
if (!EDITABLE_COLS.length) {
  console.error("COLUMNS must list at least one non-empty column name");
  process.exit(1);
}
if (EDITABLE_COLS.includes(PK_NAME)) {
  console.error("COLUMNS must NOT include the primary key column");
  process.exit(1);
}
if (![TABLE_NAME, PK_NAME, ...EDITABLE_COLS].every(c => /^[A-Za-z0-9_]+$/.test(c))) {
  console.error("Only alphanumeric and underscore are allowed in TABLE_NAME/PK_NAME/COLUMNS");
  process.exit(1);
}

let pool;
(async () => {
  try {
    pool = await mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      port: Number(DB_PORT),
      waitForConnections: true,
      connectionLimit: 10,
    });
    console.log("DB pool initialized");
    app.listen(Number(PORT), () =>
      console.log(`API running → http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("Failed to init DB pool:", err);
    process.exit(1);
  }
})();

// Routes
app.get("/api/data", async (_req, res, next) => {
  try {
    if (!pool) throw new Error("DB not ready");
    const [rows] = await pool.query(`SELECT * FROM \`${TABLE_NAME}\``);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


app.post("/api/post", async (req, res, next) => {
  try {
    if (!pool) throw new Error("DB not ready");

    const payload = req.body ?? {};

    // Ensure all required columns are present in the body
    const missing = EDITABLE_COLS.filter((c) => payload[c] === undefined);
    if (missing.length) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
        required: EDITABLE_COLS,
      });
    }

    const cols = EDITABLE_COLS.map((c) => `\`${c}\``).join(",");
    const placeholders = EDITABLE_COLS.map(() => "?").join(",");
    const values = EDITABLE_COLS.map((c) => payload[c]);

    const [result] = await pool.query(
      `INSERT INTO \`${TABLE_NAME}\` (${cols}) VALUES (${placeholders})`,
      values
    );

    // Prefer insertId if present; otherwise fall back to PK from payload (for non-AI PKs)
    const pkValue = result.insertId || payload[PK_NAME];
    if (pkValue === undefined) {
      return res.status(201).json({ message: "Created", affectedRows: result.affectedRows });
    }

    const [rows] = await pool.query(
      `SELECT * FROM \`${TABLE_NAME}\` WHERE \`${PK_NAME}\` = ?`,
      [pkValue]
    );

    return res.status(201).json(rows[0] ?? { [PK_NAME]: pkValue });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Duplicate key" });
    }
    return next(err);
  }
});

app.get("/api/data/companies", async (_req, res, next) => {
  try {
    if (!pool) throw new Error("DB not ready");
    const [rows] = await pool.query(`SELECT company FROM \`${TABLE_NAME}\``);
    let output = rows.map(row => row.company).filter(Boolean);
    res.send(output);
  }   catch (err) {
    next(err);
  }
});

app.get("/api/test" , async (_req, res) => {
  let output = "Hello World!!!";
  res.json(output);
})

// Basic error guard
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

