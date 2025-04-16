import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import Seat from "./models/Seat.js"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/greeshma_db";

app.use(express.json());
app.use(cors());

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Error connecting to MongoDB:", err));

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

// Signup API
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (await User.findOne({ email })) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || "secret_key", { expiresIn: "1h" });
    res.status(201).json({ username: newUser.username, token, message: "Signup successful" });
  } catch (error) {
    res.status(500).json({ error: "Error signing up" });
  }
});

// Login API
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret_key", { expiresIn: "1h" });
    res.status(200).json({ token, message: "Login successful" });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

// Get available seats
app.get("/seats", async (req, res) => {
  try {
    const seats = await Seat.find();
    res.status(200).json(seats);
  } catch (error) {
    res.status(500).json({ error: "Error fetching seats" });
  }
});

// Book seats

// Book seats - Prevent booking already booked seats
app.post("/book-seat", async (req, res) => {
  const { seats } = req.body;
  try {
    for (const seat of seats) {
      const existingSeat = await Seat.findOne({
        section: seat.section,
        row: seat.row,
        col: seat.col,
      });

      if (existingSeat && existingSeat.booked) {
        return res.status(400).json({ error: `Seat ${seat.section}-${seat.row}-${seat.col} is already booked.` });
      }

      await Seat.updateOne(
        { section: seat.section, row: seat.row, col: seat.col },
        { booked: true },
        { upsert: true }
      );
    }
    res.status(200).json({ message: "Seats booked successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error booking seats" });
  }
});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
