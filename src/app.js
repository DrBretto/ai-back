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

// Function to get the last 24 months
const getLast24Months = () => {
  const dates = [];
  let currentDate = new Date();
  
  for (let i = 0; i < 24; i++) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    
    dates.push(`${year}-${month}`);
    
    currentDate.setMonth(currentDate.getMonth() - 1);
  }
  
  return dates;
};

const months = getLast24Months();

cron.schedule('*/5 * * * *', async () => {
  for (const month of months) {
    await StocksService.fetchStockHistory('JDST', month);
    await StocksService.fetchStockHistory('NUGT', month);
  }
});





module.exports = app;
