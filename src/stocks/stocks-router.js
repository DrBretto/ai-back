const express = require('express');
const StocksService = require('./stocks-service');

const stocksRouter = express.Router();

stocksRouter.get('/history', async (req, res, next) => {
  console.log('stocksRouter.get hit with:', req.query);
  const { stockSymbol, month } = req.query;
  console.log('stockSymbol:', stockSymbol);
  console.log('month:', month);

  const db = req.app.get('db'); // <-- Add this line to get the db instance

  try {
    const data = await StocksService.fetchStockHistory(db, stockSymbol, month); // <-- Add db as the first argument
    res.json(data);
  } catch (error) {
    next(error);
  }
});

stocksRouter.get('/refreshData', async (req, res, next) => {
  const db = req.app.get('db');
  try {
    await StocksService.fetchAndSaveStocks(db);
    res.status(200).json({ message: 'Data refreshed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = stocksRouter;
