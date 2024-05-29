/* eslint-disable no-unused-vars */
/* eslint-disable strict */
require('dotenv').config();
const express = require('express');
// const morgan = require('morgan'); // Comment out morgan
const cors = require('cors');
const helmet = require('helmet');

const { NODE_ENV } = require('./config');

const authRouter = require('./auth/auth-router');
const usersRouter = require('./users/users-router');
const stocksRouter = require('./stocks/stocks-router');
const sentimentRouter = require('./sentiment/sentiment-router');
const dataRouter = require('./data/data-router');

const setupCronJobs = require('./schedule');

// const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

// const customMorganFormat = ':method :url :status :res[content-length] - :response-time ms';

const app = express();

// app.use(morgan(customMorganFormat, {
//   skip: (req) => req.originalUrl.includes('latest-price') || req.originalUrl.includes('latest-prediction')
// }));

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/sentiment', sentimentRouter);
app.use('/api/data', dataRouter);

app.get('/', (req, res) => {
  res.send('Hello, world!!');
});

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

setupCronJobs(app);

module.exports = app;
