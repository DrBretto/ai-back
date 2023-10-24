/* eslint-disable strict */
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const moment = require('moment-business-days');

const { NODE_ENV } = require('./config');

const authRouter = require('./auth/auth-router');
const usersRouter = require('./users/users-router');
const stocksRouter = require('./stocks/stocks-router');
const sentimentRouter = require('./sentiment/sentiment-router');

const StocksService = require('./stocks/stocks-service');
const SentimentService = require('./sentiment/sentiment-service');

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

const app = express();

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/sentiment', sentimentRouter);

app.get('/', (req, res) => {
  res.send('Hello, world!!');
});

app.use(function errorHandler(error, req, res) {
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } };
  } else {
    // eslint-disable-next-line no-console
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // Months are 0-based in JS

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

cron.schedule('0 0 * * *', async () => {
  const db = app.get('db');
  const monthToFetch = `${currentYear}-${currentMonth
    .toString()
    .padStart(2, '0')}`;
  console.log('Fetching history: JDST', monthToFetch);
  await StocksService.fetchHistoricalData(db, 'JDST', monthToFetch);
  console.log('Fetching history: NUGT', monthToFetch);
  await StocksService.fetchHistoricalData(db, 'NUGT', monthToFetch);
});

cron.schedule('*/1 * * * *', async () => {
  const db = app.get('db');
  await StocksService.fetchTodaysData(db, 'JDST');
  await StocksService.fetchTodaysData(db, 'NUGT');
});

cron.schedule('0 6 * * *', () => {
  const db = app.get('db');
  console.log('Running sentiment analysis for gold and dollar at:', new Date());

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

let currentDate = moment();
let daysback = 0;

// Define your cron schedule
cron.schedule('*/5 * * * *', async () => {
  const db = app.get('db');

  // Check if the current date is a weekend, if so, find the previous weekday
  while (currentDate.day() === 0 || currentDate.day() === 6) {
    currentDate.subtract(1, 'days');
  }

  // Format the date to match the required format
  const date = currentDate.format('YYYY-MM-DDTHH:mm:ss[Z]');

  // Log the date for debugging purposes
  console.log('Fetching historical news for date:', currentDate);

  // Call your functions with the formatted date
  await SentimentService.fetchHistoricalNews(db, 'gold', date, date);
  await SentimentService.fetchHistoricalNews(db, 'dollar', date, date);

  // Subtract one day from the current date for the next iteration
  currentDate.subtract(1, 'days');
  daysback++;
  console.log('days back:', daysback);
});

module.exports = app;
