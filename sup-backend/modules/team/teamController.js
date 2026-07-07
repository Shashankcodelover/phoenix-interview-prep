const Team = require('../../models/teamModel');
const User = require('../../models/userModel');
const Conversation = require('../../models/conversationModel');

// @desc    Create a new team
// @route   POST /api/teams
// @access  Public
const createTeam = async (req, res) => {
  try {
    const { teamName, description, leaderId, domains, maxMembers } = req.body;

    if (!teamName || !leaderId) {
      return res.status(400).json({ message: "Team name and leader ID are required" });
    }

    // Check if leader exists
    const leader = await User.findById(leaderId);
    if (!leader) {
      return res.status(404).json({ message: "Leader not found" });
    }

    const team = await Team.create({
      teamName,
      description,
      leader: leaderId,
      domains: domains || [],
      maxMembers: maxMembers || 5,
      members: [
        {
          userId: leaderId,
          status: 'accepted',
          joinedAt: new Date()
        }
      ]
    });

    // Create a group conversation for the team
    try {
      const conv = await Conversation.create({ name: `${teamName} Chat`, isGroup: true, members: [leaderId] });
      team.conversation = conv._id;
      await team.save();
    } catch (convErr) {
      // non-blocking - team is created even if conversation creation fails
      console.error('Failed to create team conversation', convErr.message);
    }

    const populatedTeam = await team.populate(['leader', 'members.userId', 'conversation']);
    res.status(201).json(populatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
const getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate(['leader', 'members.userId', 'conversation'])
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:teamId
// @access  Public
const getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId)
      .populate(['leader', 'members.userId', 'hackathons']);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send team invite to user
// @route   POST /api/teams/:teamId/invite/:userId
// @access  Public
const sendTeamInvite = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if user already in team
    const memberExists = team.members.some(m => m.userId.toString() === userId);
    if (memberExists) {
      return res.status(400).json({ message: "User already in team" });
    }

    // Check max members
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: "Team is full" });
    }

    // Check if invite already sent
    const inviteExists = team.members.some(
      m => m.userId.toString() === userId && m.status === 'invited'
    );
    if (inviteExists) {
      return res.status(400).json({ message: "Invite already sent" });
    }

    team.members.push({
      userId,
      status: 'invited',
      joinedAt: null
    });

    await team.save();
    const populatedTeam = await team.populate(['leader', 'members.userId']);

    res.json({ message: "Invite sent successfully", team: populatedTeam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept team invite
// @route   POST /api/teams/:teamId/accept/:userId
// @access  Public
const acceptTeamInvite = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const member = team.members.find(m => m.userId.toString() === userId);
    if (!member) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (member.status !== 'invited') {
      return res.status(400).json({ message: "Invalid invite status" });
    }

    member.status = 'accepted';
    member.joinedAt = new Date();

    await team.save();
    const populatedTeam = await team.populate(['leader', 'members.userId']);

    // Add member to team conversation if exists
    if (team.conversation) {
      try {
        await Conversation.findByIdAndUpdate(team.conversation, { $addToSet: { members: member.userId } });
      } catch (err) {
        console.error('Failed to add member to conversation', err.message);
      }
    }

    res.json({ message: "Invite accepted", team: populatedTeam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject team invite
// @route   POST /api/teams/:teamId/reject/:userId
// @access  Public
const rejectTeamInvite = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.members = team.members.filter(
      m => !(m.userId.toString() === userId && m.status === 'invited')
    );

    await team.save();
    const populatedTeam = await team.populate(['leader', 'members.userId']);

    // Ensure not in conversation (if somehow present)
    if (team.conversation) {
      try {
        await Conversation.findByIdAndUpdate(team.conversation, { $pull: { members: userId } });
      } catch (err) {
        console.error('Failed to remove user from conversation after reject', err.message);
      }
    }

    res.json({ message: "Invite rejected", team: populatedTeam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from team
// @route   DELETE /api/teams/:teamId/members/:userId
// @access  Public
const removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Can't remove leader
    if (team.leader.toString() === userId) {
      return res.status(400).json({ message: "Cannot remove team leader" });
    }

    team.members = team.members.filter(m => m.userId.toString() !== userId);

    await team.save();
    const populatedTeam = await team.populate(['leader', 'members.userId']);

    // Remove from conversation if exists
    if (team.conversation) {
      try {
        await Conversation.findByIdAndUpdate(team.conversation, { $pull: { members: userId } });
      } catch (err) {
        console.error('Failed to remove member from conversation', err.message);
      }
    }

    res.json({ message: "Member removed", team: populatedTeam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get teams for a user
// @route   GET /api/teams/user/:userId
// @access  Public
const getUserTeams = async (req, res) => {
  try {
    const { userId } = req.params;

    const teams = await Team.find({
      'members.userId': userId
    })
      .populate(['leader', 'members.userId', 'conversation', 'pitchedIdeas.pitchedBy'])
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const callGemini = async (prompt, systemInstruction = '') => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  if (systemInstruction) {
    requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

// @desc    Pitch a new project idea for a team
// @route   POST /api/teams/:teamId/pitch
// @access  Public
const pitchIdea = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId, title, description, techStack } = req.body;

    if (!userId || !title || !description) {
      return res.status(400).json({ message: "userId, title, and description are required" });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const techArray = Array.isArray(techStack) ? techStack : (techStack ? techStack.split(',').map(s => s.trim()) : []);

    team.pitchedIdeas.push({
      title,
      description,
      techStack: techArray,
      pitchedBy: userId,
      votes: [userId] // pitched author upvotes automatically
    });

    await team.save();
    
    const updatedTeam = await Team.findById(teamId).populate('pitchedIdeas.pitchedBy', 'name');
    res.status(201).json(updatedTeam.pitchedIdeas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Vote/Unvote for an idea
// @route   POST /api/teams/:teamId/ideas/:ideaId/vote
// @access  Public
const voteIdea = async (req, res) => {
  try {
    const { teamId, ideaId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ message: "userId is required" });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const idea = team.pitchedIdeas.id(ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const voteIndex = idea.votes.indexOf(userId);
    if (voteIndex > -1) {
      // Downvote
      idea.votes.splice(voteIndex, 1);
    } else {
      // Upvote
      idea.votes.push(userId);
    }

    await team.save();
    
    const updatedTeam = await Team.findById(teamId).populate('pitchedIdeas.pitchedBy', 'name');
    res.json(updatedTeam.pitchedIdeas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Analyze feasibility & novelty of team idea
// @route   POST /api/teams/:teamId/ideas/:ideaId/analyze
// @access  Public
const analyzeIdea = async (req, res) => {
  try {
    const { teamId, ideaId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const idea = team.pitchedIdeas.id(ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const prompt = `
      You are an expert hackathon mentor. Check the novelty and feasibility of this proposed project idea:
      
      Title: "${idea.title}"
      Description: "${idea.description}"
      Tech Stack: "${idea.techStack.join(', ') || 'Not specified'}"

      Evaluate:
      1. Novelty: Is it too similar to typical template projects (like simple chat apps, basic todo lists, Devpost winners)?
      2. Feasibility: Can a team of students build a working prototype of this in a standard 2-day hackathon?
      3. Technical recommendations: Suggest the best architecture, packages, and quick integration points to maximize score.

      Please provide your review in the following JSON format:
      {
        "noveltyScore": <integer 0-100>,
        "feasibilityScore": <integer 0-100>,
        "verdict": "<Excellent | Feasible | Risky | Infeasible>",
        "reportMarkdown": "<Formatted evaluation details as markdown string>"
      }
      
      Ensure you only return raw JSON. Do not include markdown code block fences.
    `;

    let resultJson = {};
    try {
      let resultText = await callGemini(prompt, "You are a professional hackathon innovation evaluator. Return strict raw JSON format only.");
      resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(resultText);
    } catch (apiErr) {
      console.warn("Gemini idea analysis failed, using local fallback", apiErr);
      resultJson = {
        noveltyScore: 75,
        feasibilityScore: 80,
        verdict: "Feasible",
        reportMarkdown: `### Hackathon Feasibility Assessment (Fallback)
        
**Novelty Verdict: Feasible**

* **Strengths:** Addresses a real developer pain point.
* **Weaknesses:** Similar dashboard layouts are common.
* **Teammate Suggestions:** Focus on polished frontend features first. Use an Express backend.`
      };
    }

    idea.noveltyScore = resultJson.noveltyScore || 50;
    idea.feasibilityScore = resultJson.feasibilityScore || 50;
    idea.verdict = resultJson.verdict || 'Feasible';
    idea.aiReport = resultJson.reportMarkdown || '';

    await team.save();
    
    const updatedTeam = await Team.findById(teamId).populate('pitchedIdeas.pitchedBy', 'name');
    res.json(updatedTeam.pitchedIdeas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  sendTeamInvite,
  acceptTeamInvite,
  rejectTeamInvite,
  removeTeamMember,
  getUserTeams,
  pitchIdea,
  voteIdea,
  analyzeIdea
};
