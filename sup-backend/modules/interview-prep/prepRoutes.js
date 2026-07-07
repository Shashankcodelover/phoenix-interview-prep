const express = require('express');
const {
  generateRoadmap,
  mockInterview,
  tailorResume,
  submitQuiz,
  getQuestions,
  getPeerMatches,
  allocatePlanner
} = require('./prepController');

const router = express.Router();

router.post('/generate-roadmap', generateRoadmap);
router.post('/mock-interview', mockInterview);
router.post('/tailor-resume', tailorResume);
router.post('/quiz-submit', submitQuiz);
router.get('/questions', getQuestions);
router.post('/peer-match', getPeerMatches);
router.post('/planner/allocate', allocatePlanner);
router.post('/revision', generateRevisionSheet);

module.exports = router;
