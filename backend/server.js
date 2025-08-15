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
if (!DB_HOST || !DB_USER || !DB_PASS || !DB_NAME || !DB_PORT || !COLUMNS) {
  console.error("Check database value configuration in the .env file");
  process.exit(1);
}
if (TABLE_NAME !== "internship_applications") {
  console.warn("Check your table name");
}
if (PK_NAME !== "id") {
  console.warn("Check your primary key column name");
}

const EDITABLE_COLS = COLUMNS.split(",").map(s => s.trim()).filter(Boolean);

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

    // Fetch and return the inserted row
    const [rows] = await pool.query(
      `SELECT * FROM \`${TABLE_NAME}\` WHERE \`${PK_NAME}\` = ?`,
      [result.insertId]
    );

    return res.status(201).json(rows[0] ?? { [PK_NAME]: result.insertId });
  } catch (err) {
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

app.listen(Number(PORT), () =>
  console.log(`API running → http://localhost:${PORT}`)
);
