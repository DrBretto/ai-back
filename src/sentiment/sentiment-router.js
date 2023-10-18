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

sentimentRouter.get('/historical-news', async (req, res) => {
  const { subject, startDate, endDate } = req.query;
  if (!subject || !startDate || !endDate) {
    return res
      .status(400)
      .send('Missing required query parameters: subject, startDate, endDate');
  }

  try {
    const newsData = await SentimentService.fetchHistoricalNews(
      subject,
      startDate,
      endDate
    );
    if (!newsData) {
      return res.status(500).send('Failed to fetch historical news data');
    }
    res.json(newsData);
  } catch (error) {
    console.error('Error in /historical-news endpoint:', error);
    res.status(500).send('Server error');
  }
});

module.exports = sentimentRouter;
