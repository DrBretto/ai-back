// data-router.js
const express = require('express');
const DataService = require('./data-service');
const { spawn } = require('child_process');
const path = require('path');

const dataRouter = express.Router();

dataRouter.get('/process-prices', async (req, res, next) => {
  try {

      const db = req.app.get('db');
      const prices = await DataService.getPricingData(db);
  
      const scriptPath = path.join(__dirname, '..', 'python', 'process_data.py');
      const process = spawn('python3', [scriptPath, JSON.stringify(prices)]);
    let scriptOutput = '';
    let scriptError = '';  // Add this line to capture error output
    
    process.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    process.stderr.on('data', (data) => {  // Add this block to capture error output
      scriptError += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', scriptError);  // Log the error output
        return next(new Error('Python script failed'));
      }
      res.json({ count: scriptOutput });
    });
  } catch (error) {
    next(error);
  }
});


module.exports = dataRouter;
