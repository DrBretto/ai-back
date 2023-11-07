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

sentimentRouter.get('/historical-news', async (req, res, next) => {
  const { subject, startDate, endDate } = req.query;
  const db = req.app.get('db');
  if (!subject || !startDate || !endDate) {
    return res
      .status(400)
      .send('Missing required query parameters: subject, startDate, endDate');
  }

  try {
    const newsData = await SentimentService.fetchHistoricalNews(
      db,
      subject,
      startDate,
      endDate
    );
    if (!newsData) {
      console.error('No news data retrieved from fetchHistoricalNews.');
      return res.status(500).send('Failed to fetch historical news data');
    }
    console.log('newsData:', newsData);
    res.json(newsData);
  } catch (error) {
    console.error('Error in /historical-news endpoint:', error);
    next(error);
  }
});

// Assuming sentimentRouter is an Express Router instance

sentimentRouter.get('/trigger-sentiment-analysis', async (req, res, next) => {
  const db = req.app.get('db');
  console.log('Manual trigger for sentiment analysis at:', new Date());

  try {
    const goldResult = await SentimentService.performSentimentAnalysis(db, 'gold', 'tradingview');
    console.log('Successfully analyzed sentiment for gold:', goldResult);

    const dollarResult = await SentimentService.performSentimentAnalysis(db, 'dollar', 'tradingview');
    console.log('Successfully analyzed sentiment for dollar:', dollarResult);

    res.status(200).send({
      message: 'Sentiment analysis triggered successfully',
      gold: goldResult,
      dollar: dollarResult
    });
  } catch (error) {
    console.error('Error triggering sentiment analysis:', error);
    res.status(500).send('Error triggering sentiment analysis');
    next(error);
  }
});


sentimentRouter.get('/compare-terms/:id', async (req, res, next) => {
  const { id } = req.params;
  const db = req.app.get('db');
  const subject = req.query.subject || 'gold';
  try {
    await SentimentService.performTermComparison(db, id, subject);
    res.status(200).send('Term comparison completed successfully');
  } catch (error) {
    console.error('Error in /compare-terms/:id endpoint:', error);
    next(error);
  }
});

module.exports = sentimentRouter;
