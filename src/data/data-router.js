// data-router.js
const express = require('express');
const DataService = require('./data-service');
const { spawn } = require('child_process');

const dataRouter = express.Router();

dataRouter.get('/process-prices', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const prices = await DataService.getPricingData(db);

    const process = spawn('python3', ['./python/process_data.py', JSON.stringify(prices)]);
    let scriptOutput = '';
    
    process.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        return next(new Error('Python script failed'));
      }
      res.json({ count: scriptOutput });
    });
  } catch (error) {
    next(error);
  }
});

module.exports = dataRouter;
