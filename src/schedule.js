const cron = require('node-cron');
const StocksService = require('./stocks/stocks-service');
const SentimentService = require('./sentiment/sentiment-service');

module.exports = (app) => {
  cron.schedule('*/1 * * * *', async () => {
    const db = app.get('db');
    //Update historical prices every minute
    //console.log('Updating historical prices at:', new Date());
    await StocksService.fetchHistoricalData(db, 'JDST');
    await StocksService.fetchHistoricalData(db, 'NUGT');
  });

  cron.schedule('0 * * * *', () => {
    //TradingView Scrape and analyze
    const db = app.get('db');

    SentimentService.performSentimentAnalysis(db, 'gold', 'tradingview')
      .then(() => {
        console.log('Successfully analyzed sentiment for gold');
      })
      .catch((err) => {
        console.error('Error analyzing sentiment for gold:', err.code);
      });

    SentimentService.performSentimentAnalysis(db, 'dollar', 'tradingview')
      .then(() => {
        console.log('Successfully analyzed sentiment for dollar:');
      })
      .catch((err) => {
        console.error('Error analyzing sentiment for dollar:', err.code);
      });
  });

  cron.schedule('*/15 * * * *', async () => {
    //backlog Summary Tokenizer
    const db = app.get('db');
    for (let i = 0; i < 5; i++) {
      // Loop to process up to 5 entries
      try {
        const entry = await db('sentiment_analysis')
          .whereNull('token_values')
          .orderBy('id', 'asc') // Ensure entries are processed in order of their id
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
          break; // Exit loop if no unprocessed entry is found
        }
      } catch (error) {
        console.error('Error processing unprocessed entry:', error.code);
        break; // Exit loop in case of an error
      }
    }
  });

  // //Backlog Historical Schedulers////////////////////////////////////////

  // cron.schedule('*/15 8-19 * * *', async () => {
  //   const db = app.get('db');

  //   // Assume subjectIDs for 'gold' and 'dollar' are 1 and 2, respectively
  //   const missingDateGold = await SentimentService.findMissingDate(db, 1, 3);
  //   const missingDateDollar = await SentimentService.findMissingDate(db, 2, 3);

  //   if (missingDateGold) {
  //     console.log(
  //       'Fetching historical news for gold on date:',
  //       missingDateGold
  //     );
  //     await SentimentService.fetchHistoricalNews(
  //       db,
  //       'gold',
  //       missingDateGold,
  //       missingDateGold
  //     );
  //   }

  //   if (missingDateDollar) {
  //     console.log(
  //       'Fetching historical news for dollar on date:',
  //       missingDateDollar
  //     );
  //     await SentimentService.fetchHistoricalNews(
  //       db,
  //       'dollar',
  //       missingDateDollar,
  //       missingDateDollar
  //     );
  //   }
  // });

  ////////////////////////////////////////////////////////////////////////////
};
