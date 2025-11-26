// server.js
// ===========================================================
// CST3144 Lesson Booking App - Backend API
// Technologies: Node.js, Express, MongoDB Atlas (native driver)
// This server exposes REST endpoints used by the Vue frontend
// to load lessons, search, place orders and update spaces.
// ===========================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");

// -----------------------------------------------------------
// 1. EXPRESS APP + BASIC CONFIG
// -----------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection string is stored in .env for security.
// For example: MONGODB_URI=mongodb+srv://user:pass@cluster/.../lesson_app
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "lesson_app";
const LESSONS_COLLECTION = "lessons";
const ORDERS_COLLECTION = "orders";

// Global handles to re-use the same connection across requests
let db;
let lessonsCollection;
let ordersCollection;

// -----------------------------------------------------------
// 2. GLOBAL MIDDLEWARE
// -----------------------------------------------------------

// Allow frontend (localhost dev + GitHub Pages / Render) to call this API
app.use(cors());

// Parse JSON request bodies into req.body
app.use(express.json());

// Simple request logger – helpful for debugging & presentation
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  if (Object.keys(req.body || {}).length) {
    console.log("  Body:", req.body);
  }
  next();
});

// -----------------------------------------------------------
// 3. STATIC IMAGE ROUTE
// -----------------------------------------------------------
// This route returns lesson images from /public/images.
// If the file is missing, it returns a JSON 404 error.
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

// -----------------------------------------------------------
// 4. LESSON ROUTES (READ + SEARCH + UPDATE)
// -----------------------------------------------------------

/**
 * GET /lessons
 * Returns all lessons as a JSON array.
 * Used by the frontend on initial page load.
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
 * Backend part of the “search” feature.
 * Matches subject + location (case-insensitive) and
 * optionally exact price/spaces if the term is numeric.
 */
app.get("/search", async (req, res) => {
  const term = (req.query.q || "").trim();

  // If no search term, just return all lessons
  if (!term) {
    const all = await lessonsCollection.find({}).toArray();
    return res.json(all);
  }

  const lowerTerm = term.toLowerCase();
  const numTerm = Number(term);
  const isNumeric = !isNaN(numTerm);

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
 * PUT /lessons/:id
 * Updates a lesson using our numeric "id" field.
 * The frontend uses this to update remaining spaces after checkout.
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

// -----------------------------------------------------------
// 5. ORDER ROUTES (CREATE + OPTIONAL LIST)
// -----------------------------------------------------------

/**
 * Shared handler for creating orders.
 * This supports both POST /orders and POST /order (alias).
 */
async function handleCreateOrder(req, res) {
  const { name, phone, items, total } = req.body;

  // Basic validation – protects the database and ensures clean data
if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Missing name, phone, or items." });
  }
  
  // Phone validation: only digits + minimum length (e.g., 8)
  const phoneDigitsOnly = /^[0-9]+$/.test(phone);
  
  if (!phoneDigitsOnly || phone.length < 8) {
    return res
      .status(400)
      .json({ error: "Phone number must be at least 8 digits and contain only numbers." });
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

// Main coursework endpoint used by the frontend
app.post("/orders", handleCreateOrder);

// Alias to match variations in the spec (“/order” vs “/orders”)
app.post("/order", handleCreateOrder);

/**
 * (Optional extra) GET /orders
 * Helpful for testing and demonstrating stored orders in MongoDB.
 */
app.get("/orders", async (req, res) => {
  try {
    const orders = await ordersCollection.find({}).toArray();
    res.json(orders);
  } catch (err) {
    console.error("Error in GET /orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// -----------------------------------------------------------
// 6. FALLBACK + ERROR HANDLERS
// -----------------------------------------------------------

// 404 handler for any unknown route
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Generic error handler (in case any route calls next(err))
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// -----------------------------------------------------------
// 7. MONGODB CONNECTION + SERVER START
// -----------------------------------------------------------

async function startServer() {
  try {
    if (!MONGODB_URI) {
      console.error("Missing MONGODB_URI. Check your .env file.");
      process.exit(1);
    }

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
    process.exit(1); // Exit so deployment platforms know it failed
  }
}

startServer();