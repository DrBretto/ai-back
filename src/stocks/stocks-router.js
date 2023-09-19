const express = require('express');
const StocksService = require('./stocks-service');

const stocksRouter = express.Router();

stocksRouter.get('/history', async (req, res, next) => {
  const { stockSymbol, month } = req.query; // Changed to month to match service

  try {
    const data = await StocksService.fetchStockHistory(stockSymbol, month);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = stocksRouter;
