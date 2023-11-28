const express = require('express');
const StocksService = require('./stocks-service');

const stocksRouter = express.Router();

stocksRouter.get('/history', async (req, res, next) => {
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
  const { stockSymbol } = req.query; // Get stockSymbol from query params
  const db = req.app.get('db');

  try {
    await StocksService.fetchTodaysData(db, stockSymbol); // Call the fetchTodaysData function
    res.status(200).json({ message: "Today's data fetched successfully" });
  } catch (error) {
    next(error);
  }
});

stocksRouter.get('/last24hours', async (req, res, next) => {
  const db = req.app.get('db');

  try {
    // Fetch the last 24 hours of prices for two stocks
    const prices = await StocksService.fetchLast24HoursData(db);

    // Normalize the data if necessary
    const normalizedPrices = StocksService.normalizePrices(prices);

    res.json(normalizedPrices);
  } catch (error) {
    next(error);
  }
});


module.exports = stocksRouter;
