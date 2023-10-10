const express = require('express');
const StocksService = require('./stocks-service');

const stocksRouter = express.Router();

stocksRouter.get('/history', async (req, res, next) => {
  console.log('Inside /history route', req.query);

  const { stockSymbol } = req.query; // Get stockSymbol from query params
  const db = req.app.get('db');

  try {
    await StocksService.fetchHistoricalData(db, stockSymbol); // Call the fetchHistoricalData function
    res.status(200).json({ message: 'Historical data fetched successfully' });
  } catch (error) {
    next(error);
  }
});

stocksRouter.get('/refresh', async (req, res, next) => {
  console.log('Inside /refresh route', req.query);

  const { stockSymbol } = req.query; // Get stockSymbol from query params
  const db = req.app.get('db');

  try {
    await StocksService.fetchTodaysData(db, stockSymbol); // Call the fetchTodaysData function
    res.status(200).json({ message: "Today's data fetched successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = stocksRouter;
