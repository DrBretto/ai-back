// data-router.js
const DataService = require('./data-service');
const express = require('express');
const fs = require('fs');
const path = require('path');

const dataRouter = express.Router();
const CACHE_DIR = path.join(__dirname, '../cache');
const CACHE_FILE = path.join(CACHE_DIR, 'pricing-cache.json');

dataRouter.get('/process-prices', async (req, res, next) => {
  try {
    let cachedData = [];

    // Check if the cache file exists
    if (fs.existsSync(CACHE_FILE)) {
      // If it exists, read data from the cache file
      const cachedDataStr = fs.readFileSync(CACHE_FILE, 'utf8');
      cachedData = JSON.parse(cachedDataStr);
    } else {
      // If it doesn't exist, fetch data from the database
      const db = req.app.get('db');
      cachedData = await DataService.getPricingData(db);

      // Save fetched data to the cache file
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedData));
    }

    // Send the data to Python for processing
    const count = await DataService.processDataWithPython(cachedData);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

module.exports = dataRouter;
