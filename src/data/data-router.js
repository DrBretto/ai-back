const express = require('express');
const dataRouter = express.Router();
const DataService = require('./data-service');

dataRouter.get('/process-prices', async (req, res, next) => {
  try {
    const count = await DataService.processData();
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

module.exports = dataRouter;
