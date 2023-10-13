/* eslint-disable strict */
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const { NODE_ENV } = require('./config');

const authRouter = require('./auth/auth-router');
const usersRouter = require('./users/users-router');
const stocksRouter = require('./stocks/stocks-router');
const StocksService = require('./stocks/stocks-service');

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

const app = express();

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/stocks', stocksRouter);

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

//Backlog Scheduler//////////////////////////////////////////////////////////////////
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
  console.log('Fetching recent data: JDST');
  await StocksService.fetchTodaysData(db, 'JDST');
  console.log('Fetching recent data: NUGT');
  await StocksService.fetchTodaysData(db, 'NUGT');
});

module.exports = app;
