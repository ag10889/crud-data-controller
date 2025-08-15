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
app.get("/api/data", async (_req, res) => {
  try {
    if (!pool) throw new Error("DB not ready");
    const [rows] = await pool.query(`SELECT * FROM \`${TABLE_NAME}\``);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/data/companies", async (_req, res) => {
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
