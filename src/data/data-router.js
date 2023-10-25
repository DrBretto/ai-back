const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const DataService = require('./data-service');
const express = require('express');

const dataRouter = express.Router();

dataRouter.get('/process-prices', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const prices = await DataService.getPricingData(db);

    // Write data to a temporary file
    const tempFilePath = path.join(__dirname, 'tempData.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(prices));

    const scriptPath = path.join(__dirname, '..', 'python', 'process_data.py');
    const process = spawn('python3', [scriptPath, tempFilePath]); // Pass the file path, not the data

    let scriptOutput = '';
    let scriptError = '';

    process.stdout.on('data', (data) => {
      scriptOutput += data.toString();
    });

    process.stderr.on('data', (data) => {
      scriptError += data.toString();
    });

    dataRouter.get('/process-prices', async (req, res, next) => {
      try {
        const db = req.app.get('db');
        const prices = await DataService.getPricingData(db);

        // Write data to a temporary file
        const tempFilePath = path.join(__dirname, 'tempData.json');
        fs.writeFileSync(tempFilePath, JSON.stringify(prices));

        const scriptPath = path.join(
          __dirname,
          '..',
          'python',
          'process_data.py'
        );
        const process = spawn('python3', [scriptPath, tempFilePath]); // Pass the file path, not the data

        let scriptOutput = '';
        let scriptError = '';

        process.stdout.on('data', (data) => {
          scriptOutput += data.toString();
        });

        process.stderr.on('data', (data) => {
          scriptError += data.toString();
        });

        process.on('close', (code) => {
          fs.unlinkSync(tempFilePath); // Delete the temporary file
          if (code !== 0) {
            console.error('Python script error:', scriptError);
            return next(new Error('Python script failed'));
          }
          res.json({ count: scriptOutput });
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = dataRouter;
