const express = require('express');
const SentimentService = require('./sentiment-service');

const sentimentRouter = express.Router();

// sentimentRouter.get('/', async (req, res, next) => {
//   const subject = req.query.subject || 'gold';
//   const source = req.query.source || 'tradingview';
//   const db = req.app.get('db');

//   try {
//     const articleContents = await SentimentService.performSentimentAnalysis(
//       db,
//       subject,
//       source
//     );
//     res.json(articleContents);
//   } catch (error) {
//     next(error);
//   }
// });

sentimentRouter.get('/', async (req, res, next) => {
  const subjectName = req.query.subject;
  const sourceName = req.query.source;
  const db = req.app.get('db');

  if (!subjectName || !sourceName) {
    return res.status(400).json({ message: "Subject and source are required" });
  }

  try {
    // Convert subjectName and sourceName to their respective IDs
    // This part depends on your database structure and how you map names to IDs
    const subjectId = await sentimentRouter.getOrCreateSubjectID(db, subjectName); // Replace with actual implementation
    const sourceId = await sentimentRouter.getSourceID(db, sourceName); // Replace with actual implementation

    // Query the database for the latest entry for the given subjectId and sourceId
    const latestEntry = await db('sentiment_analysis')
      .where({ subject_id: subjectId, source_id: sourceId })
      .orderBy('date_published', 'desc')
      .first();

    if (latestEntry) {
      // Structure the response to include summary and sentiment scores
      const responseData = {
        summary: latestEntry.tokenized_sentiment,
        sentimentScores: {
          low: latestEntry.low_score,
          high: latestEntry.high_score,
          average: latestEntry.average_score
        }
      };
      res.json(responseData);
    } else {
      res.status(404).json({ message: `No entries found for subject: ${subjectName} and source: ${sourceName}` });
    }
  } catch (error) {
    next(error);
  }
});



sentimentRouter.get('/', async (req, res, next) => {
  const subjectId = req.query.subjectId; // Assuming subjectId is passed as a query parameter
  const db = req.app.get('db');

  if (!subjectId) {
    return res.status(400).json({ message: 'Subject ID is required' });
  }

  try {
    // Query the database for the latest entry for the given subjectId
    const latestEntry = await db('sentiment_analysis')
      .where({ subject_id: subjectId })
      .orderBy('date_published', 'desc')
      .first();

    if (latestEntry) {
      // Structure the response to include summary and sentiment scores
      const responseData = {
        summary: latestEntry.tokenized_sentiment,
        sentimentScores: {
          low: latestEntry.low_score,
          high: latestEntry.high_score,
          average: latestEntry.average_score,
        },
      };
      res.json(responseData);
    } else {
      res
        .status(404)
        .json({ message: `No entries found for subject ID: ${subjectId}` });
    }
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
    const goldResult = await SentimentService.performSentimentAnalysis(
      db,
      'gold',
      'tradingview'
    );
    console.log('Successfully analyzed sentiment for gold:', goldResult);

    const dollarResult = await SentimentService.performSentimentAnalysis(
      db,
      'dollar',
      'tradingview'
    );
    console.log('Successfully analyzed sentiment for dollar:', dollarResult);

    res.status(200).send({
      message: 'Sentiment analysis triggered successfully',
      gold: goldResult,
      dollar: dollarResult,
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
