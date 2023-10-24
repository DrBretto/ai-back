const cron = require('node-cron');
const moment = require('moment-business-days');
const StocksService = require('./stocks/stocks-service');
const SentimentService = require('./sentiment/sentiment-service');

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // Months are 0-based in JS
let currentDate = moment();
let daysback = 97;
currentDate.subtract(daysback, 'days')

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
    //Historical News Scheduler
    while (currentDate.day() === 0 || currentDate.day() === 6) {
      currentDate.subtract(1, 'days');
    }

    const date = currentDate.format('YYYY-MM-DDTHH:mm:ss[Z]');

    console.log('Fetching historical news for date:', currentDate);

    await SentimentService.fetchHistoricalNews(db, 'gold', date, date);
    await SentimentService.fetchHistoricalNews(db, 'dollar', date, date);

    currentDate.subtract(1, 'days');
    daysback++;
    console.log('days back:', daysback);
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
