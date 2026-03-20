import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json";

import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

// Use a specific database if provided in config
const dbInstance = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId)
  : getFirestore(admin.app());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // API Route: Send Booking Email
  app.post("/api/book", async (req, res) => {
    const { name, email, checkIn, checkOut, destination } = req.body;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ error: "Email service not configured." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // Send to user as confirmation
      cc: process.env.EMAIL_USER, // Send to admin
      subject: `Booking Request: ${destination}`,
      text: `
        Hello ${name},

        We have received your booking request for ${destination}.

        Details:
        - Check-in: ${checkIn}
        - Check-out: ${checkOut}

        Our team will contact you shortly to confirm.

        Happy Travels!
        India Travel Buddy AI Team
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Booking request sent successfully!" });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send booking request." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
