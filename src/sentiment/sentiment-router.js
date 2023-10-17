const express = require('express');
const SentimentService = require('./sentiment-service');

const sentimentRouter = express.Router();

sentimentRouter.get('/', async (req, res, next) => {
  const subject = req.query.subject || 'gold';
  const source = req.query.source || 'tradingview';
  const db = req.app.get('db');

  try {
    const articleContents = await SentimentService.performSentimentAnalysis(
      db,
      subject,
      source
    );
    res.json(articleContents);
  } catch (error) {
    next(error);
  }
});

module.exports = sentimentRouter;
