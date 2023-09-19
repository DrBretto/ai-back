const express = require('express');
const StocksService = require('./stocks-service');

const stocksRouter = express.Router();

stocksRouter.get('/history', async (req, res, next) => {
  const { stockSymbol, startDate, endDate } = req.query;

  try {
    const data = await StocksService.fetchStockHistory(stockSymbol, startDate, endDate);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = stocksRouter;
