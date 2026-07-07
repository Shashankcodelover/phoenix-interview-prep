const User = require('../../models/userModel');
const Team = require('../../models/teamModel');

// Haversine formula to compute distance in km
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Mock hackathon events from different geographical coordinates
const MOCK_SCRAPED_EVENTS = [
  {
    name: "Mysore Local Web Dev Hackathon",
    location: "JSSSTU, Mysore",
    lat: 12.3124,
    lng: 76.6143,
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    description: "Build clean offline-first web apps for college admin workflows.",
    hostingLink: "https://unstop.com/o/mysore-web-2026",
    prize: "₹50,000",
    tags: ["Web Dev", "Offline-first"],
    platform: "Unstop",
    scrapedFrom: "#KarnatakaCoders"
  },
  {
    name: "Bangalore Smart Hackathon 2026",
    location: "CMRIT, Bangalore",
    lat: 12.9662,
    lng: 77.7121,
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Design AI-powered models for green urban environment development.",
    hostingLink: "https://devpost.com/hackathons/bangalore-smart-2026",
    prize: "₹2,00,000",
    tags: ["AI/ML", "Sustainability"],
    platform: "Devpost",
    scrapedFrom: "#BangaloreHackathon"
  },
  {
    name: "Hubli AI Challenge",
    location: "KLE Tech, Hubli",
    lat: 15.3647,
    lng: 75.1240,
    date: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Build innovative multi-agent workflows using local open weights models.",
    hostingLink: "https://hackerearth.com/challenges/hubli-ai",
    prize: "₹75,000",
    tags: ["AI/ML", "Agents"],
    platform: "HackerEarth",
    scrapedFrom: "#KarnatakaCoders"
  },
  {
    name: "Delhi National Hackathon",
    location: "IIT Delhi, Delhi",
    lat: 28.5450,
    lng: 77.1926,
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: "The premier student coding festival in Northern India.",
    hostingLink: "https://unstop.com/o/delhi-national-2026",
    prize: "₹5,00,000",
    tags: ["Blockchain", "Fintech", "Healthtech"],
    platform: "Unstop",
    scrapedFrom: "#NationalHackathon"
  }
];

// @desc    Geofenced Hackathon discovery scraping simulator
// @route   POST /api/agent/scrape
// @access  Public
const getScrapedEvents = async (req, res) => {
  try {
    const { userId, geofenceRadius } = req.body;

    const baseLat = 12.3129; // SJCE base latitude
    const baseLng = 76.6135; // SJCE base longitude
    const radius = parseFloat(geofenceRadius) || 300.0; // Default 300km

    const filtered = MOCK_SCRAPED_EVENTS.map(event => {
      const distance = getDistance(baseLat, baseLng, event.lat, event.lng);
      return {
        ...event,
        distanceKm: Math.round(distance * 10) / 10,
        inRange: distance <= radius
      };
    }).filter(event => event.inRange);

    res.json({
      message: `Scraper search finished. Found ${filtered.length} hackathons within ${radius}km geofence radius.`,
      events: filtered
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save team profile details
// @route   POST /api/agent/save-team
// @access  Public
const saveTeam = async (req, res) => {
  try {
    const { userId, teamMembers } = req.body;

    if (!userId || !teamMembers) {
      return res.status(400).json({ message: "userId and teamMembers are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.teamMembers = teamMembers;
    await user.save();

    res.json({
      message: "Team profile saved successfully",
      teamMembers: user.teamMembers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Simulate headful Puppeteer automation runs log telemetry stream
// @route   POST /api/agent/auto-fill
// @access  Public
const triggerAutoFill = async (req, res) => {
  try {
    const { userId, hackathonName, hostingLink } = req.body;

    if (!userId || !hackathonName || !hostingLink) {
      return res.status(400).json({ message: "userId, hackathonName, and hostingLink are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = user.teamMembers && user.teamMembers.length > 0
      ? user.teamMembers
      : [
          { name: user.name, usn: "01JST24UCS100", email: user.email, github: "github.com/lead", resumePath: "uploads/resume_1.pdf" }
        ];

    // Build the execution log trace
    const timestamp = () => `[${new Date().toLocaleTimeString()}]`;
    const logs = [
      `${timestamp()} Launching headful Chrome browser context inside Xvfb (Virtual Framebuffer :99)...`,
      `${timestamp()} Navigating target Unstop registration form: ${hostingLink}...`,
      `${timestamp()} Target URL loaded successfully. Response status: 200 OK.`,
      `${timestamp()} Injecting Puppeteer-Stealth plugin hooks to bypass client verification...`,
      `${timestamp()} Locating fields and autofilling team credentials (Team Name: ${user.name}-Aegis-Devs)...`,
      `${timestamp()} Member 1 (Lead): Inputting ${team[0].name} (USN: ${team[0].usn || '01JST24UCS100'}, Email: ${team[0].email})...`,
      `${timestamp()} File Chooser: Uploading resume path: ${team[0].resumePath || 'uploads/resumes/shashank_resume.pdf'}...`,
      `${timestamp()} File uploaded successfully.`,
      ...team.slice(1).map((m, idx) => [
        `${timestamp()} Member ${idx + 2}: Inputting ${m.name} (USN: ${m.usn || '01JST24UCS101'}, Email: ${m.email})...`,
        `${timestamp()} File Chooser: Uploading resume path: ${m.resumePath || 'uploads/resumes/member_resume.pdf'}...`
      ]).flat(),
      `${timestamp()} Clicking "Review Application" ... OK.`,
      `${timestamp()} Form submission aborted: Physical security gate encountered (Alphanumeric CAPTCHA / UPI Fee Payment Required).`,
      `${timestamp()} Transmitting handoff webhook push token to WhatsApp Evolution API...`,
      `${timestamp()} Status: WAITING_FOR_HUMAN. Interactive prompt sent successfully to team chat.`
    ];

    res.json({
      message: "Browser orchestration started",
      logs,
      vncLaunchAvailable: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mine hackathon projects into STAR stories using Gemini API
// @route   POST /api/agent/mine-story
// @access  Public
const mineStory = async (req, res) => {
  try {
    const { projectTitle, projectDescription, roleContribution } = req.body;

    if (!projectTitle || !projectDescription) {
      return res.status(400).json({ message: "projectTitle and projectDescription are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return res.json({
        story: `### STAR Interview Story: ${projectTitle} (Fallback Mode)
        
**Situation:** Our team participated in a hackathon to build a solution for "${projectTitle}".
**Task:** We needed to design and implement the system under a strict 24-hour limit.
**Action:** As a developer/contributor (${roleContribution || 'Core Programmer'}), I worked on building the web interfaces and backend connection.
**Result:** The application was built successfully and deployed, allowing the team to demonstrate a working prototype.`
      });
    }

    const prompt = `
      Create a detailed, high-impact interview response in STAR (Situation, Task, Action, Result) format.
      The story is based on this student's hackathon project:
      
      Project Title: "${projectTitle}"
      Project Description: "${projectDescription}"
      My Role & Contribution: "${roleContribution || 'Full Stack Developer'}"

      Make it sound professional, focusing on the engineering challenges, engineering metrics, outcomes, and technical skills shown.
      Output the result in clear, easy-to-read markdown.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: "You are an elite coding coach. Format the response beautifully using Markdown headings." }] }
      })
    });

    if (!response.ok) {
      throw new Error("Gemini API request failed.");
    }

    const data = await response.json();
    const storyText = data.candidates[0].content.parts[0].text;

    res.json({ story: storyText });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Run Skill-Gap Analysis for a team vs a hackathon track
// @route   POST /api/agent/skill-gap
// @access  Public
const runSkillGapAnalysis = async (req, res) => {
  try {
    const { teamSkills = [], track = 'Fullstack' } = req.body;

    // Required skill profiles per track
    const trackProfiles = {
      'AI/ML':      ['Python', 'TensorFlow', 'PyTorch', 'Numpy', 'Data Science'],
      'Fullstack':  ['React', 'Node.js', 'MongoDB', 'Express', 'REST APIs'],
      'Mobile':     ['React Native', 'Flutter', 'Android', 'iOS', 'Firebase'],
      'Blockchain': ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Rust'],
      'Cybersec':   ['Penetration Testing', 'Wireshark', 'OWASP', 'Linux', 'Cryptography']
    };

    const required = trackProfiles[track] || trackProfiles['Fullstack'];
    const covered  = required.filter(s => teamSkills.some(ts => ts.toLowerCase() === s.toLowerCase()));
    const missing  = required.filter(s => !covered.includes(s));
    const gapScore = Math.round((covered.length / required.length) * 100);

    // Find users on platform whose skills cover the gaps
    let suggestions = [];
    if (missing.length > 0) {
      try {
        suggestions = await User.find({
          skills: { $in: missing.map(m => new RegExp(m, 'i')) }
        })
          .select('name skills domains experience')
          .maxTimeMS(3000)
          .limit(5);
      } catch (dbErr) {
        console.warn('DB offline — skipping teammate suggestions:', dbErr.message);
      }
    }

    res.json({
      track,
      required,
      covered,
      missing,
      gapScore,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check idea novelty & feasibility via Gemini
// @route   POST /api/agent/novelty-check
// @access  Public
const checkIdeaNovelty = async (req, res) => {
  try {
    const { ideaTitle, ideaDescription, techStack = [], teamSize = 2, hackathonDays = 2 } = req.body;

    if (!ideaTitle || !ideaDescription) {
      return res.status(400).json({ message: 'ideaTitle and ideaDescription are required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback static analysis when no API key
      return res.json({
        noveltyScore: 72,
        feasibilityScore: 68,
        verdict: 'Feasible',
        strengths:  ['Unique problem framing', 'Strong social impact angle'],
        weaknesses: ['Similar tools exist (e.g. Devpost)', 'API rate limits may bottleneck scraping'],
        recommendations: [
          'Add a real-time collaboration layer to differentiate',
          'Use a lightweight in-memory queue (Bull) for scraping jobs',
          'Create a live demo board to showcase progress during judging'
        ]
      });
    }

    const prompt = `
You are an expert hackathon mentor and innovation consultant.

Evaluate the following project idea submitted for a hackathon:

**Idea Title:** ${ideaTitle}
**Description:** ${ideaDescription}
**Tech Stack:** ${techStack.join(', ') || 'Not specified'}
**Team Size:** ${teamSize}
**Hackathon Duration:** ${hackathonDays} day(s)

Provide your analysis as a strict JSON object (no markdown, no backticks) with these exact keys:
{
  "noveltyScore": <integer 0-100>,
  "feasibilityScore": <integer 0-100>,
  "verdict": "<Excellent|Feasible|Risky|Infeasible>",
  "strengths": [<string>, ...],
  "weaknesses": [<string>, ...],
  "recommendations": [<string>, ...]
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: 'You are a hackathon idea analyst. Return only raw JSON — no markdown fences, no extra text.' }] }
      })
    });

    if (!response.ok) throw new Error('Gemini API error: ' + response.status);

    const data = await response.json();
    let raw = data.candidates[0].content.parts[0].text;

    // Strip possible markdown fences
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    const result = JSON.parse(raw);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a post-hackathon portfolio project
// @route   POST /api/agent/portfolio
// @access  Public
const addPortfolioProject = async (req, res) => {
  try {
    const { userId, title, description, techStack, outcome, hackathonName, won } = req.body;

    if (!userId || !title || !description) {
      return res.status(400).json({ message: 'userId, title, and description are required.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Add to portfolio projects
    user.portfolioProjects.push({
      title,
      description,
      techStack: Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map(s => s.trim()) : []),
      outcome: outcome || '',
      hackathonName: hackathonName || '',
      won: won || false
    });

    // Award XP for portfolio capture
    user.xp = (user.xp || 0) + 50;
    const newLevel = Math.floor(user.xp / 100) + 1;
    if (newLevel > (user.level || 1)) user.level = newLevel;

    // Mark skills proven from the tech stack
    if (Array.isArray(techStack)) {
      techStack.forEach(skill => {
        if (skill && !user.skillsProven.includes(skill)) {
          user.skillsProven.push(skill);
        }
      });
    }

    await user.save();

    res.status(201).json({
      message: 'Portfolio project captured successfully! +50 XP awarded.',
      project: user.portfolioProjects[user.portfolioProjects.length - 1],
      xp: user.xp,
      level: user.level
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all portfolio projects for a user
// @route   GET /api/agent/portfolio/:userId
// @access  Public
const getPortfolioProjects = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('portfolioProjects skillsProven');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      projects: user.portfolioProjects,
      skillsProven: user.skillsProven
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getScrapedEvents,
  saveTeam,
  triggerAutoFill,
  mineStory,
  runSkillGapAnalysis,
  checkIdeaNovelty,
  addPortfolioProject,
  getPortfolioProjects
};
