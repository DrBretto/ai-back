const express = require('express');
const StocksService = require('./stocks-service');

const stocksRouter = express.Router();

stocksRouter.get('/history', async (req, res, next) => {

  console.log('Inside /history route', res);


  const { stockSymbol } = req.query;  // Get stockSymbol from query params
  const db = req.app.get('db');

  try {
    const data = await StocksService.fetchStockHistory(db, stockSymbol); // Pass stockSymbol to fetchStockHistory
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
