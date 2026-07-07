const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

// Connect Database
connectDB();

// ensure upload directories exist
const fs = require('fs');
['uploads', 'uploads/profiles', 'uploads/chat'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middlewares
app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
  res.send("Backend Server Running 🚀");
});

const PORT = process.env.PORT || 5000;

const hackathonRoutes = require('./modules/hackathon-agent/hackathonRoutes');
const authRoutes = require('./modules/auth/authRoutes');
const profileRoutes = require('./modules/profile/profileRoutes');
const teamRoutes = require('./modules/team/teamRoutes');
const chatRoutes = require('./modules/chat/chatRoutes');
const userRoutes = require('./modules/user/userRoutes');
const prepRoutes = require('./modules/interview-prep/prepRoutes');
const agentRoutes = require('./modules/hackathon-agent/agentRoutes');

app.use('/uploads', express.static('uploads'));
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prep', prepRoutes);
app.use('/api/agent', agentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});