const cron = require('node-cron');
const StocksService = require('./stocks/stocks-service');
const SentimentService = require('./sentiment/sentiment-service');

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // Months are 0-based in JS

module.exports = (app) => {
  const db = app.get('db');

  cron.schedule('0 0 * * *', async () => {
    //Daily Price Scheduler
    const monthToFetch = `${currentYear}-${currentMonth
      .toString()
      .padStart(2, '0')}`;
    console.log('Fetching history: JDST', monthToFetch);
    await StocksService.fetchHistoricalData(db, 'JDST', monthToFetch);
    console.log('Fetching history: NUGT', monthToFetch);
    await StocksService.fetchHistoricalData(db, 'NUGT', monthToFetch);
  });

  cron.schedule('*/1 * * * *', async () => {
    //Minute Price Scheduler
    const db = app.get('db');
    await StocksService.fetchTodaysData(db, 'JDST');
    await StocksService.fetchTodaysData(db, 'NUGT');
  });

  cron.schedule('50 6 * * *', () => {
    //Daily Sentiment Scheduler
    console.log(
      'Running sentiment analysis for gold and dollar at:',
      new Date()
    );

    SentimentService.performSentimentAnalysis(db, 'gold', 'tradingview')
      .then((result) => {
        console.log('Successfully analyzed sentiment for gold:', result);
      })
      .catch((err) => {
        console.error('Error analyzing sentiment for gold:', err);
      });

    SentimentService.performSentimentAnalysis(db, 'dollar', 'tradingview')
      .then((result) => {
        console.log('Successfully analyzed sentiment for dollar:', result);
      })
      .catch((err) => {
        console.error('Error analyzing sentiment for dollar:', err);
      });
  });

  cron.schedule('*/5 * * * *', async () => {
    const db = app.get('db');

    // Assume subjectIDs for 'gold' and 'dollar' are 1 and 2, respectively
    const missingDateGold = await SentimentService.findMissingDate(db, 1, 3);
    const missingDateDollar = await SentimentService.findMissingDate(db, 2, 3);

    if (missingDateGold) {
      console.log(
        'Fetching historical news for gold on date:',
        missingDateGold
      );
      await SentimentService.fetchHistoricalNews(
        db,
        'gold',
        missingDateGold,
        missingDateGold
      );
    }

    if (missingDateDollar) {
      console.log(
        'Fetching historical news for dollar on date:',
        missingDateDollar
      );
      await SentimentService.fetchHistoricalNews(
        db,
        'dollar',
        missingDateDollar,
        missingDateDollar
      );
    }
  });

  cron.schedule('*/2 * * * *', async () => {
    const db = app.get('db');
    //Every 2 Minute Sentiment Analysis Scheduler
    console.log('Processing unprocessed entry at:', new Date());

    try {
      // Fetch the first entry with token_values as null
      const entry = await db('sentiment_analysis')
        .whereNull('token_values')
        .first();

      if (entry) {
        // If an unprocessed entry is found, trigger your sentiment analysis functions
        const sentimentAnalysisId = entry.id;
        await SentimentService.performTermComparison(db, sentimentAnalysisId);
        console.log(
          'Successfully processed entry with id:',
          sentimentAnalysisId
        );
      } else {
        console.log('No unprocessed entries found.');
      }
    } catch (error) {
      console.error('Error processing unprocessed entry:', error);
    }
  });

  //Backlog Historical Price Scheduler////////////////////////////////////////
  // cron.schedule('*/10 * * * *', async () => {
  //   const db = app.get('db');
  //   const monthToFetch = `${currentYear}-${currentMonth
  //     .toString()
  //     .padStart(2, '0')}`;
  //   console.log('Fetching history: JDST', monthToFetch);
  //   await StocksService.fetchHistoricalData(db, 'JDST', monthToFetch);
  //   console.log('Fetching history: NUGT', monthToFetch);
  //   await StocksService.fetchHistoricalData(db, 'NUGT', monthToFetch);

  //   // Decrement month and handle year rollover
  //   if (currentMonth === 1) {
  //     currentYear--;
  //     currentMonth = 12;
  //   } else {
  //     currentMonth--;
  //   }
  // });
  ////////////////////////////////////////////////////////////////////////////
};
