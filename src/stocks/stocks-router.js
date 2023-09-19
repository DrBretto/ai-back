const express = require('express');
const StocksService = require('./stocks-service');

const stocksRouter = express.Router();

stocksRouter.get('/history', async (req, res, next) => {
  console.log('stocksRouter.get hit with:', req.query);
  const { stockSymbol, month } = req.query; // Changed to month to match service
  console.log('stockSymbol:', stockSymbol);
  console.log('month:', month);
  
  try {
    const data = await StocksService.fetchStockHistory(stockSymbol, month);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = stocksRouter;
