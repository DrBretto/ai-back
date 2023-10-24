/* eslint-disable strict */
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const { NODE_ENV } = require('./config');

const authRouter = require('./auth/auth-router');
const usersRouter = require('./users/users-router');
const stocksRouter = require('./stocks/stocks-router');
const sentimentRouter = require('./sentiment/sentiment-router');

const setupCronJobs = require('./schedule');

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

app.get('/python/python-api', async (req, res, next) => {
  try {
    const pythonResponse = await axios.get('http://localhost:10000/hello');
    res.json(pythonResponse.data);
  } catch (error) {
    next(error); // Pass errors to your error handler
  }
});

setupCronJobs(app);

module.exports = app;
