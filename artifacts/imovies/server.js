import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3000);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(currentDir, "public");
const apiPrefix = "/imovies-api";
const mongoUri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/imovies";
const jwtSecret =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "imovies-local-development-secret-change-before-deploying");

if (!jwtSecret) {
  throw new Error("Set JWT_SECRET before running in production.");
}

mongoose.set("bufferCommands", false);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || false }));
app.use(express.json({ limit: "20kb" }));
app.use(express.static(publicDir));

const demoMovies = [
  {
    _id: "demo-midnight",
    title: "Midnight in the City",
    genre: "Drama",
    durationMinutes: 118,
    rating: 8.2,
    classification: "PG-13",
    synopsis: "One night, two strangers, and a city that never runs out of stories.",
    accentColor: "#7657d7",
    showtime: "7:30 PM",
    times: ["12:20", "15:40", "19:10"],
  },
  {
    _id: "demo-orbit",
    title: "Beyond the Orbit",
    genre: "Sci-Fi",
    durationMinutes: 132,
    rating: 8.1,
    classification: "PG-13",
    synopsis: "A small crew follows a mysterious signal beyond the edge of known space.",
    accentColor: "#277d9c",
    showtime: "8:15 PM",
    times: ["13:15", "16:50", "20:30"],
  },
  {
    _id: "demo-summer",
    title: "The Last Summer",
    genre: "Romance",
    durationMinutes: 104,
    rating: 7.8,
    classification: "PG",
    synopsis: "A seaside summer brings old friends together for one more adventure.",
    accentColor: "#da7755",
    showtime: "6:45 PM",
    times: ["11:45", "14:10", "18:00"],
  },
  {
    _id: "demo-kingdom",
    title: "Kingdom of Ash",
    genre: "Adventure",
    durationMinutes: 126,
    rating: 8.6,
    classification: "PG-13",
    synopsis: "A young cartographer sets out to find a kingdom missing from every map.",
    accentColor: "#9b573e",
    showtime: "9:00 PM",
    times: ["12:00", "15:25", "19:45"],
  },
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword() {
  if (this.isModified("passwordHash")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
});

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    genre: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    rating: { type: Number, default: 7.5, min: 0, max: 10 },
    classification: { type: String, default: "PG" },
    synopsis: { type: String, default: "" },
    accentColor: { type: String, default: "#7657d7" },
    showtime: { type: String, default: "7:30 PM" },
    times: { type: [String], default: [] },
  },
  { timestamps: true },
);

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    seats: {
      type: [String],
      required: true,
      validate: {
        validator: (seats) =>
          seats.length > 0 &&
          seats.length <= 8 &&
          new Set(seats).size === seats.length,
        message: "Choose between 1 and 8 unique seats.",
      },
    },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model("User", userSchema);
export const Movie =
  mongoose.models.Movie || mongoose.model("Movie", movieSchema);
export const Booking =
  mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    jwtSecret,
    { expiresIn: "2h" },
  );
}

function requireDatabase(res) {
  if (mongoose.connection.readyState !== 1) {
    sendError(res, 503, "MongoDB is not connected. Check MONGODB_URI.");
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "A valid Bearer token is required.");
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.sub;
    return next();
  } catch {
    return sendError(res, 401, "Token is invalid or expired.");
  }
}

app.get(`${apiPrefix}/health`, (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "demo mode",
  });
});

app.get(`${apiPrefix}/movies`, async (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json(demoMovies);
  }

  try {
    const movies = await Movie.find().sort({ title: 1 }).lean();
    return res.json(movies.length ? movies : demoMovies);
  } catch (error) {
    console.error("Could not load movies:", error.message);
    return res.json(demoMovies);
  }
});

app.post(`${apiPrefix}/auth/register`, async (req, res) => {
  if (!requireDatabase(res)) return;

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, "Enter a name and a valid email address.");
  }
  if (password.length < 8 || password.length > 72) {
    return sendError(res, 400, "Password must be between 8 and 72 characters.");
  }

  try {
    const user = await User.create({ name, email, passwordHash: password });
    return res.status(201).json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, "An account with this email already exists.");
    }
    console.error("Could not register user:", error.message);
    return sendError(res, 500, "Could not create the account.");
  }
});

app.post(`${apiPrefix}/auth/login`, async (req, res) => {
  if (!requireDatabase(res)) return;

  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!email || !password) {
    return sendError(res, 400, "Email and password are required.");
  }

  try {
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return sendError(res, 401, "Email or password is incorrect.");
    }
    return res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Could not log in:", error.message);
    return sendError(res, 500, "Could not log in.");
  }
});

app.post(`${apiPrefix}/bookings`, requireAuth, async (req, res) => {
  if (!requireDatabase(res)) return;

  const { movieId, seats } = req.body;
  if (!mongoose.isValidObjectId(movieId) || !Array.isArray(seats)) {
    return sendError(res, 400, "Provide a valid movieId and a list of seats.");
  }

  const normalizedSeats = [
    ...new Set(
      seats.filter(
        (seat) => typeof seat === "string" && /^[A-H](?:[1-9]|1[0-2])$/.test(seat),
      ),
    ),
  ];
  if (
    normalizedSeats.length === 0 ||
    normalizedSeats.length > 8 ||
    normalizedSeats.length !== seats.length
  ) {
    return sendError(res, 400, "Choose between 1 and 8 unique valid seats.");
  }

  try {
    const movie = await Movie.findById(movieId);
    if (!movie) return sendError(res, 404, "Movie not found.");

    const alreadyBooked = await Booking.exists({
      movie: movieId,
      status: "confirmed",
      seats: { $in: normalizedSeats },
    });
    if (alreadyBooked) {
      return sendError(res, 409, "One or more selected seats are already booked.");
    }

    const booking = await Booking.create({
      user: req.userId,
      movie: movieId,
      seats: normalizedSeats,
      total: normalizedSeats.length * 12,
    });
    return res.status(201).json(booking);
  } catch (error) {
    console.error("Could not create booking:", error.message);
    return sendError(res, 500, "Could not create the booking.");
  }
});

app.get(`${apiPrefix}/bookings/mine`, requireAuth, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const bookings = await Booking.find({ user: req.userId })
      .populate("movie", "title showtime")
      .sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (error) {
    console.error("Could not load bookings:", error.message);
    return sendError(res, 500, "Could not load bookings.");
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith(`${apiPrefix}/`)) return next();
  return res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error.message);
  return sendError(res, 500, "An unexpected server error occurred.");
});

async function connectMongo() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
    const movieCount = await Movie.countDocuments();
    if (movieCount === 0) {
      await Movie.insertMany(
        demoMovies.map(({ _id, ...movie }) => movie),
        { ordered: false },
      );
    }
    console.info("MongoDB connected.");
  } catch (error) {
    console.error(
      `MongoDB unavailable; the demo will use sample movies. ${error.message}`,
    );
    const retry = setTimeout(() => void connectMongo(), 10000);
    retry.unref();
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

app.listen(port, "0.0.0.0", () => {
  console.info(`IMovies server listening on port ${port}`);
});

void connectMongo();
