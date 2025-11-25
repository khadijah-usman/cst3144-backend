// scripts/seed.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

const lessons = [
  {
    id: 1,
    subject: "Mathematics",
    location: "Hendon",
    price: 100,
    spaces: 5,
    icon: "fa-solid fa-calculator",
    image: "https://img.icons8.com/color/240/calculator--v1.png",
  },
  {
    id: 2,
    subject: "English",
    location: "Colindale",
    price: 80,
    spaces: 5,
    icon: "fa-solid fa-book-open",
    image: "https://img.icons8.com/color/240/book-reading.png",
  },
  {
    id: 3,
    subject: "Biology",
    location: "Golders Green",
    price: 90,
    spaces: 5,
    icon: "fa-solid fa-seedling",
    image: "https://img.icons8.com/color/240/dna-helix.png",
  },
  {
    id: 4,
    subject: "Chemistry",
    location: "Brent Cross",
    price: 70,
    spaces: 5,
    icon: "fa-solid fa-flask",
    image: "https://img.icons8.com/color/240/test-tube.png",
  },
  {
    id: 5,
    subject: "History",
    location: "Hendon",
    price: 50,
    spaces: 5,
    icon: "fa-solid fa-landmark",
    image: "https://img.icons8.com/color/240/scroll.png",
  },
  {
    id: 6,
    subject: "Physics",
    location: "Colindale",
    price: 95,
    spaces: 5,
    icon: "fa-solid fa-atom",
    image: "https://img.icons8.com/color/240/physics.png",
  },
  {
    id: 7,
    subject: "Art",
    location: "Brent Cross",
    price: 60,
    spaces: 5,
    icon: "fa-solid fa-palette",
    image: "https://img.icons8.com/color/240/art-prices.png",
  },
  {
    id: 8,
    subject: "Geography",
    location: "Golders Green",
    price: 85,
    spaces: 5,
    icon: "fa-solid fa-earth-europe",
    image: "https://img.icons8.com/color/240/globe--v1.png",
  },
  {
    id: 9,
    subject: "Computer Science",
    location: "Hendon",
    price: 120,
    spaces: 5,
    icon: "fa-solid fa-code",
    image: "https://img.icons8.com/color/240/source-code.png",
  },
  {
    id: 10,
    subject: "Economics",
    location: "Colindale",
    price: 110,
    spaces: 5,
    icon: "fa-solid fa-chart-line",
    image: "https://img.icons8.com/color/240/economic-improvement.png",
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("❌ ERROR: MONGODB_URI is missing in .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db("lesson_app");
    const lessonsCol = db.collection("lessons");

    await lessonsCol.deleteMany({});
    console.log("Old lessons cleared.");

    await lessonsCol.insertMany(lessons);
    console.log("🎉 Seeding completed! Lessons inserted.");

  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    client.close();
  }
}

seed();