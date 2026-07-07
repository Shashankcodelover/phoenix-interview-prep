const express = require('express');

const {
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
} = require('./teamController');

const router = express.Router();

// Team routes
router.post('/', createTeam);
router.get('/user/:userId', getUserTeams);
router.get('/:teamId', getTeamById);
router.get('/', getTeams);

// Invite routes
router.post('/:teamId/invite/:userId', sendTeamInvite);
router.post('/:teamId/accept/:userId', acceptTeamInvite);
router.post('/:teamId/reject/:userId', rejectTeamInvite);

// Member management
router.delete('/:teamId/members/:userId', removeTeamMember);

// Collaborative Pitching & Sandbox
router.post('/:teamId/pitch', pitchIdea);
router.post('/:teamId/ideas/:ideaId/vote', voteIdea);
router.post('/:teamId/ideas/:ideaId/analyze', analyzeIdea);

module.exports = router;
