const User = require('../../models/userModel');

// Helper to make calls to Gemini API
const callGemini = async (prompt, systemInstruction = '', jsonMode = false) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (jsonMode) {
    requestBody.generationConfig = {
      responseMimeType: "application/json"
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gemini API Error details:', errText);
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  try {
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error('Failed to extract text from Gemini response:', data);
    throw new Error('Invalid response structure from Gemini API');
  }
};

// @desc    Generate a custom interview roadmap
// @route   POST /api/prep/generate-roadmap
// @access  Public
const generateRoadmap = async (req, res) => {
  try {
    const { userId, targetRole, timeFrame, resumeText } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Save preferences
    user.targetRole = targetRole || 'Software Engineer';
    user.prepTimeFrame = parseInt(timeFrame) || 30;
    if (resumeText) user.resumeText = resumeText;
    await user.save();

    const resumeContext = user.resumeText || "No resume uploaded. Generate a standard comprehensive developer path.";
    const duration = user.prepTimeFrame;
    const role = user.targetRole;

    const prompt = `
      You are an expert technical interviewer and placement coordinator. 
      Generate a customized daily preparation roadmap for the role of "${role}" over a timeframe of ${duration} days.
      Use this student's resume context:
      "${resumeContext}"

      The syllabus MUST prioritize high-yield concepts across:
      1. Aptitude (Quantitative, Logical, Verbal)
      2. Data Structures & Algorithms (Arrays, Lists, Trees, Graphs, DP, Sorting, Searching)
      3. Operating Systems (Threads, Processes, Deadlocks, Memory Management)
      4. Database Management Systems (SQL, NoSQL, Normalization, Indexing)
      5. Computer Networks (TCP/IP, HTTP, OSI, Routing)
      6. Object-Oriented Programming (OOP concepts, Design Patterns)
      7. Role-specific stack topics (e.g. React/Node if Frontend/Fullstack, Python/Pytorch if ML, etc.)

      IMPORTANT: Since the duration is ${duration} days, structure the response so it fits exactly ${duration} day-by-day modules.
      Keep it high-yield. Collapsed cramming mode is supported by only focusing on the highest priority items.
      Return a raw JSON object containing an array "roadmap" where each item has:
      - "day": integer (1 to ${duration})
      - "title": string (topic title)
      - "category": string (e.g., "DSA", "OS", "DBMS", "CN", "Aptitude", "OOP", "System Design")
      - "description": string (explanation of what to study and solve)
      - "questions": array of 2 multiple-choice questions for verification, each with:
        - "question": string
        - "options": array of 4 strings
        - "answer": string (must match exactly one of the options)

      Ensure the JSON is strictly valid. Do not wrap in markdown \`\`\`json block.
    `;

    const systemInstruction = "You are a professional roadmap generator. Return strict raw JSON format only.";
    
    let resultText = await callGemini(prompt, systemInstruction, true);
    // Parse to ensure it is valid JSON
    let roadmapData;
    try {
      roadmapData = JSON.parse(resultText);
    } catch (e) {
      console.warn("JSON parsing failed, attempting to clean markdown code blocks...", e);
      // fallback cleanup if Gemini outputs markdown wrappers anyway
      resultText = resultText.replace(/```json/i, '').replace(/```/g, '').trim();
      roadmapData = JSON.parse(resultText);
    }

    res.json({
      message: "Roadmap generated successfully",
      roadmap: roadmapData.roadmap
    });
  } catch (error) {
    console.error("Roadmap generation error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    AI Mock Interview Chat Handler
// @route   POST /api/prep/mock-interview
// @access  Public
const mockInterview = async (req, res) => {
  try {
    const { message, history, targetRole } = req.body;

    const role = targetRole || "Software Engineer";

    const prompt = `
      Current user message: "${message}"

      Conversation History:
      ${JSON.stringify(history)}

      Act as a technical interviewer conducting a mock interview for the role: "${role}".
      Ask one question at a time. If the user answers a question, provide a brief critique (e.g., clarity, correctness, structure) and then ask the next question.
      Analyze their pace and tone if applicable, and point out any filler words (like "um", "like", "actually") in their responses.
      Keep your responses professional, encouraging, and focused on helping them improve their communication and technical skills.
    `;

    const responseText = await callGemini(prompt, "You are a helpful and experienced technical interviewer. Keep responses concise and focused.");
    res.json({ reply: responseText });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Role-based Resume generator / optimizer
// @route   POST /api/prep/tailor-resume
// @access  Public
const tailorResume = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ message: "Both resumeText and jobDescription are required." });
    }

    const prompt = `
      Tailor this engineering student's resume to match this specific job description. Highlight keywords, project achievements, and structure it cleanly.
      
      Resume text:
      "${resumeText}"

      Job Description:
      "${jobDescription}"

      Provide the output in clean, formatted Markdown that the student can copy and download directly. Do not include any meta comments. Focus on producing a clean resume layout.
    `;

    const responseText = await callGemini(prompt, "You are a professional resume writer. Return a beautifully formatted Markdown resume.");
    res.json({ resume: responseText });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Quiz submission handler (awards XP and updates weak topics)
// @route   POST /api/prep/quiz-submit
// @access  Public
const submitQuiz = async (req, res) => {
  try {
    const { userId, answersCorrect, xpEarned } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Award XP
    user.xp = (user.xp || 0) + (parseInt(xpEarned) || 10);
    
    // Level calculation: 100 XP per level
    const newLevel = Math.floor(user.xp / 100) + 1;
    if (newLevel > (user.level || 1)) {
      user.level = newLevel;
    }

    // Update streak logic
    const today = new Date().toDateString();
    if (user.lastActiveDate) {
      const lastActive = new Date(user.lastActiveDate).toDateString();
      const diffTime = Math.abs(new Date(today).getTime() - new Date(lastActive).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        user.streak = (user.streak || 0) + 1;
      } else if (diffDays > 1) {
        user.streak = 1;
      }
    } else {
      user.streak = 1;
    }
    user.lastActiveDate = new Date();

    await user.save();

    res.json({
      message: "Quiz results processed",
      xp: user.xp,
      level: user.level,
      streak: user.streak
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get company-tagged question bank
const getQuestions = async (req, res) => {
  try {
    const questions = [
      {
        title: "Reverse a Linked List in Groups of Size K",
        company: "Amazon",
        category: "DSA",
        difficulty: "Hard",
        description: "Given a pointer to the head node of a linked list, reverse the nodes of the list k at a time, and return the modified list. k is a positive integer and is less than or equal to the length of the linked list."
      },
      {
        title: "LRU Cache Design & Implementation",
        company: "Google",
        category: "DSA",
        difficulty: "Medium",
        description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement LRUCache class with get(key) and put(key, value) in O(1) time complexity."
      },
      {
        title: "Explain CPU Scheduling & Deadlock Prevention",
        company: "TCS",
        category: "OS",
        difficulty: "Easy",
        description: "What is a deadlock situation? Explain four necessary conditions for deadlocks (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait) and strategies to prevent them."
      },
      {
        title: "Optimizing Joins in Large SQL Databases",
        company: "Adobe",
        category: "DBMS",
        difficulty: "Medium",
        description: "Explain nested loop joins, hash joins, and sort-merge joins. How do indexes alter database parser cost estimation when fetching millions of records?"
      },
      {
        title: "Three-way Partitioning of Arrays",
        company: "Microsoft",
        category: "DSA",
        difficulty: "Medium",
        description: "Given an array and a range [lowVal, highVal], partition the array such that all elements less than lowVal come first, elements between lowVal and highVal come second, and elements greater than highVal come last."
      }
    ];
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recommended peer matches
const getPeerMatches = async (req, res) => {
  try {
    const peers = [
      { _id: "1", name: "Alice Johnson", targetRole: "Fullstack React Developer", level: 3, xp: 260 },
      { _id: "2", name: "Bob Smith", targetRole: "Machine Learning Engineer", level: 4, xp: 380 },
      { _id: "3", name: "Carol Lee", targetRole: "Mobile Android Programmer", level: 2, xp: 140 }
    ];
    res.json(peers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Calculate time budget allocations using Gemini
const allocatePlanner = async (req, res) => {
  try {
    const { interviewDate, hackathonDate, dailyHours, ratio } = req.body;

    const prepRatio = parseInt(ratio) || 50;
    const hackRatio = 100 - prepRatio;
    const hours = parseFloat(dailyHours) || 4.0;

    const prepHours = (hours * prepRatio / 100).toFixed(1);
    const hackHours = (hours * hackRatio / 100).toFixed(1);

    const prompt = `
      You are an elite academic scheduler.
      A student is preparing for an interview on: ${interviewDate}
      and participating in a hackathon on: ${hackathonDate}
      
      Their daily code prep and build budget is: ${hours} hours.
      The split ratio is:
      - Placement Interview Preparation: ${prepHours} hours/day
      - Hackathon Prototype Development: ${hackHours} hours/day
      
      Generate a prioritized, daily task budget to resolve schedules.
      Return a JSON object containing an array "schedule" where each item has:
      - "title": string (the specific task explanation)
      - "duration": string (e.g. "${prepHours} hrs" or "${hackHours} hrs")
      - "type": string (either "prep" or "hackathon")

      Ensure the JSON is strictly valid. Do not wrap in markdown block.
    `;

    let resultText;
    try {
      resultText = await callGemini(prompt, "You are a professional academic time budget planner. Return strict raw JSON format only.", true);
    } catch (apiErr) {
      console.warn("Gemini call failed in planner, using fallback static schedule", apiErr);
      return res.json({
        schedule: [
          { title: "Solve 2 LeetCode Medium Hashmap Problems", duration: `${prepHours} hrs`, type: "prep" },
          { title: "Initialize Express Server & Mongoose Schemas", duration: `${hackHours} hrs`, type: "hackathon" },
          { title: "Study Database Normalization & Indexing", duration: `${prepHours} hrs`, type: "prep" },
          { title: "Configure Geofenced Instagram scraper APIs", duration: `${hackHours} hrs`, type: "hackathon" }
        ]
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch (e) {
      resultText = resultText.replace(/```json/i, '').replace(/```/g, '').trim();
      parsed = JSON.parse(resultText);
    }

    res.json({ schedule: parsed.schedule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate high-yield AI revision cheatsheets
// @route   POST /api/prep/revision
// @access  Public
const generateRevisionSheet = async (req, res) => {
  try {
    const { topic, category } = req.body;

    if (!topic || !category) {
      return res.status(400).json({ message: "topic and category are required" });
    }

    const prompt = `
      You are an elite placement trainer. Generate a high-yield interview revision cheatsheet for the following topic:
      
      Topic: "${topic}"
      Category: "${category}"

      Structure the sheets into the following exact sections:
      1. 🔑 Core Concept & Summary (Simplified explanation)
      2. 💡 Typical Interview Questions (Top 3 questions asked on this topic)
      3. 🚀 SDE Answer Templates (Perfect answers using correct terms)
      4. ⚡ Code snippets or pseudo-code (if applicable to DSA/OOP/DBMS, else key diagrams as bullet text)

      Output the result in beautiful, clear Markdown headings. Do not include meta comments.
    `;

    let sheetContent;
    try {
      sheetContent = await callGemini(prompt, "You are a senior technical interview coach. Return response in Markdown only.");
    } catch (apiErr) {
      console.warn("Gemini call failed in revision generator, using static fallback", apiErr);
      sheetContent = `### Revision Sheet: ${topic} (Fallback Mode)

**1. Core Concept & Summary:**
* ${topic} is a crucial technical component under the ${category} category. It facilitates efficient data processing and system operations.

**2. Key Interview Questions:**
* What is the basic mechanism of ${topic}?
* How do you optimize systems utilizing ${topic}?
* What are the trade-offs of ${topic}?

**3. Perfect Answer Template:**
* "When explaining ${topic}, I state that it is designed to optimize time and space complexity in systems engineering..."`;
    }

    res.json({ sheet: sheetContent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateRoadmap,
  mockInterview,
  tailorResume,
  submitQuiz,
  getQuestions,
  getPeerMatches,
  allocatePlanner,
  generateRevisionSheet
};
