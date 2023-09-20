/* eslint-disable strict */
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const authRouter = require('./auth/auth-router');
const usersRouter = require('./users/users-router');
const stocksRouter = require('./stocks/stocks-router');
const StocksService = require('./stocks/stocks-service');

const dataRouter = require('./data/data-router.js');

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

const app = express();

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/data', dataRouter);
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

const cron = require('node-cron');

let currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-11
let currentYear = new Date().getFullYear();

cron.schedule('*/5 * * * *', async () => {
  const formattedMonth = String(currentMonth).padStart(2, '0');
  console.log(`Fetching stock history for ${currentYear}-${formattedMonth}`);

  await StocksService.fetchStockHistory(
    'JDST',
    `${currentYear}-${formattedMonth}`
  );
  await StocksService.fetchStockHistory(
    'NUGT',
    `${currentYear}-${formattedMonth}`
  );

  // Update month and year
  if (currentMonth === 1) {
    currentMonth = 12;
    currentYear -= 1;
  } else {
    currentMonth -= 1;
  }
});

module.exports = app;
