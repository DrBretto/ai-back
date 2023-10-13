const express = require('express');
const SentimentService = require('./sentiment-service');

const sentimentRouter = express.Router();

sentimentRouter.get('/', async (req, res, next) => {
  try {
    const articleContents = await SentimentService.performSentimentAnalysis();
    res.json(articleContents);
  } catch (error) {
    next(error);
  }
});

module.exports = sentimentRouter;
