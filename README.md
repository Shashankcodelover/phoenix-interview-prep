# 🔥 Phoenix: Unified Interview Prep & Hackathon Suite

Phoenix is a cohesive career acceleration platform that unites **mock interview preparation** and **hackathon portfolio building** into a single, gamified developer feedback loop. 

Unlike traditional disconnected prep tools, Phoenix closes the loop by turning your hackathon submissions into interview-ready STAR-method talking points, while mapping your prep achievements directly to upcoming hackathons.

## 🚀 Key Features

* **Adaptive interview Roadmap Generator:** Generates a prioritized study guide (Aptitude, DSA, DBMS, System Design, CN, OOP) based on target company, role, and available time (e.g., 7-day cramming vs. 30-day mastery).
* **AI Hackathon-to-Interview Story Miner:** Automatically parses your hackathon submissions and outputs mock interview responses using the STAR format (Situation, Task, Action, Result).
* **Hackathon Aggregator & Auto-Fill Agent:** Scrapes active hackathons from Devpost, Unstop, and MLH, monitors critical deadlines on a unified dashboard, and pre-fills registration sheets.
* **Shared Skill Graph:** Core skills proven through coding roadmaps recommend matching hackathon tracks, and hackathon project releases mark matching prep skills as "demonstrated".
* **Career Momentum Gamification:** Unified XP leaderboard tracking consistency in both DSA practice and hackathon code submissions.

---

## 🛠️ Tech Stack

* **Frontend:** React, HTML5, CSS3 (Glassmorphic design system)
* **Backend:** Node.js, Express.js, JWT Authentication
* **Database:** MongoDB (via Mongoose ORM)
* **Real-time Comms:** WebRTC for hackathon team war rooms

---

## 📦 Project Structure

```text
📦 phoenix-interview-prep
 ┣ 📂 sup-frontend     # React client layer
 ┣ 📂 sup-backend      # Express server and API layer
 ┣ 📂 docs             # Project blueprints and workflows
 ┗ 📜 README.md        # Documentation
```

---

## 🚦 Getting Started

### Prerequisites
* Node.js (v18+)
* MongoDB local instance or MongoDB Atlas Connection string

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd sup-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` configuration file:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/phoenix
   JWT_SECRET=your_jwt_secret_key
   ```
4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../sup-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
