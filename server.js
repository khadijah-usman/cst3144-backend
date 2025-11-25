// server.js
// Express + MongoDB (native driver) backend for LessonHub

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ❗ Replace ONLY in development. For GitHub, keep this placeholder
// and set the real URI as an environment variable on Render/AWS.
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://dijahnasir:dijahnasir2004@cluster02863.a0yng.mongodb.net/lesson_app?retryWrites=true&w=majority";

const DB_NAME = "lesson_app";
const LESSONS_COLLECTION = "lessons";
const ORDERS_COLLECTION = "orders";

// =============== GLOBAL DB HANDLES =================
let db;
let lessonsCollection;
let ordersCollection;

// =============== MIDDLEWARE ========================

// Allow front-end (GitHub Pages / localhost) to call this API
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Logger middleware – prints every request to the console
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  if (Object.keys(req.body || {}).length) {
    console.log("  Body:", req.body);
  }
  next();
});

// Static file / image middleware:
// Returns lesson images if they exist, otherwise a JSON error.
app.get("/images/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "public", "images", fileName);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.sendFile(filePath);
  });
});

// =============== ROUTES (REST API) =================

/**
 * GET /lessons
 * Returns all lessons as JSON array
 */
app.get("/lessons", async (req, res) => {
  try {
    const lessons = await lessonsCollection.find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error("Error in GET /lessons:", err);
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
});

/**
 * GET /search?q=term
 * Challenge search feature (Back-end + Front-end)
 * Searches in subject, location, price, spaces
 */
app.get("/search", async (req, res) => {
  const term = (req.query.q || "").trim();

  if (!term) {
    // If no term, just return all lessons
    const all = await lessonsCollection.find({}).toArray();
    return res.json(all);
  }

  const lowerTerm = term.toLowerCase();
  const numTerm = Number(term);
  const isNumeric = !isNaN(numTerm);

  // Build query using regex for text fields and direct compare for numbers
  const query = {
    $or: [
      { subject: { $regex: lowerTerm, $options: "i" } },
      { location: { $regex: lowerTerm, $options: "i" } },
      ...(isNumeric
        ? [
            { price: numTerm },
            { spaces: numTerm },
          ]
        : []),
    ],
  };

  try {
    const results = await lessonsCollection.find(query).toArray();
    res.json(results);
  } catch (err) {
    console.error("Error in GET /search:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * POST /orders  (or /order)
 * Saves a new order into the "orders" collection.
 * Expected body:
 * {
 *   name: "Student Name",
 *   phone: "12345678",
 *   items: [{ id: 1, quantity: 2 }, ...],
 *   total: 250
 * }
 */
async function handleCreateOrder(req, res) {
  const { name, phone, items, total } = req.body;

  if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "Missing name, phone, or items in order." });
  }

  const orderDoc = {
    name,
    phone,
    items,
    total: total || 0,
    createdAt: new Date(),
  };

  try {
    const result = await ordersCollection.insertOne(orderDoc);
    res.status(201).json({
      message: "Order saved",
      orderId: result.insertedId,
    });
  } catch (err) {
    console.error("Error in POST /orders:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
}

app.post("/orders", handleCreateOrder);
// alias to match coursework wording "order"
app.post("/order", handleCreateOrder);

/**
 * PUT /lessons/:id
 * Updates any attribute of a lesson (e.g. spaces) using our numeric "id" field.
 * Example body: { spaces: 3 }
 */
app.put("/lessons/:id", async (req, res) => {
  const idParam = req.params.id;
  const lessonId = parseInt(idParam, 10);

  if (isNaN(lessonId)) {
    return res.status(400).json({ error: "Lesson id must be a number" });
  }

  const updateData = req.body || {};

  try {
    const result = await lessonsCollection.updateOne(
      { id: lessonId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json({ message: "Lesson updated" });
  } catch (err) {
    console.error("Error in PUT /lessons/:id:", err);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

// =============== DB CONNECT + SERVER START ==========

async function startServer() {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db(DB_NAME);
    lessonsCollection = db.collection(LESSONS_COLLECTION);
    ordersCollection = db.collection(ORDERS_COLLECTION);

    console.log("Connected to MongoDB Atlas, DB:", DB_NAME);

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

startServer();