const express = require('express');
const SentimentService = require('./sentiment-service');

const sentimentRouter = express.Router();

sentimentRouter.get('/', async (req, res, next) => {
  const subject = req.query.subject || ' gold '; // Default to 'gold' if no subject is provided
  try {
    const articleContents = await SentimentService.performSentimentAnalysis(
      subject
    );
    res.json(articleContents);
  } catch (error) {
    next(error);
  }
});

module.exports = sentimentRouter;
