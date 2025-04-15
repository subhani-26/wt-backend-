import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import Seat from './models/Seat.js'; // Import the Seat model

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mahaboobsubhanisk639:D8ahOft2IPPSPP1i@cluster0.5kfzff6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Middleware setup
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("Connected to MongoDB");

    // Seed data for the seats (only if necessary)
    const seats = [
      { section: 'Sofa', row: 1, col: 1, booked: false },
      { section: 'Sofa', row: 1, col: 2, booked: false },
      { section: 'Chair', row: 1, col: 1, booked: false },
      { section: 'Chair', row: 1, col: 2, booked: false },
      // Add more seats as necessary
    ];

    // Insert seats into the database
    Seat.insertMany(seats)
      .then(() => {
        console.log("Seats inserted successfully");
      })
      .catch(err => {
        console.error("Error inserting seats:", err);
      });
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err);
  });

// User Schema and Routes
const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

// Signup Route
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || "secret_key", { expiresIn: "1h" });
    res.status(201).json({ username: newUser.username, token, message: "Signup successful" });
  } catch (error) {
    res.status(500).json({ error: "Error signing up" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret_key", { expiresIn: "1h" });
    res.status(200).json({ token, message: "Login successful" });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

// Fetch all seats (status of availability and booking)
app.get("/seats", async (req, res) => {
  try {
    const seats = await Seat.find();  // Fetch all seats from the database
    res.status(200).json(seats);
  } catch (error) {
    res.status(500).json({ error: "Error fetching seats" });
  }
});

// Book a seat
app.post("/book-seat", async (req, res) => {
  const { section, row, col } = req.body;
  console.log("Received seat data:", { section, row, col }); // Log the received data

  try {
    // Find the seat based on section, row, and col
    const seat = await Seat.findOne({ section, row, col });
    
    if (!seat) {
      // If the seat doesn't exist, insert it into the database
      const newSeat = new Seat({
        section,
        row,
        col,
        booked: true, // Mark the seat as booked when it's created
      });
      await newSeat.save();
      return res.status(201).json({ message: `Seat ${section} ${row} ${col} created and booked` });
    }

    if (seat.booked) {
      // If the seat is already booked, return a conflict response
      return res.status(400).json({ error: "Seat already booked" });
    }

    // If the seat exists and is not booked, mark it as booked
    seat.booked = true;
    await seat.save();

    res.status(200).json({ message: `Seat ${section} ${row} ${col} booked successfully` });
  } catch (error) {
    console.error("Error booking seat:", error);
    res.status(500).json({ error: "Error booking seat" });
  }
});





// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
