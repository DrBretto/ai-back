const express = require('express');
const DataService = require('./data-service');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(__dirname, 'trader_data.json');

router.get('/', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const data = await DataService.getData(db);
    console.log('Data in /data route handler:', data); // Log data here
    res.json(data);
  } catch (error) {
    console.error('Error in /data route handler:', error);
    next(error);
  }
});

router.get('/process', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const data = await DataService.getData(db);
    const count = await DataService.processData(data);

    console.log('Count in /data/process route handler:', count); // Log count here
    res.json({ count });
  } catch (error) {
    console.error('Error in /process route handler:', error);
    next(error);
  }
});

router.get('/train', async (req, res, next) => {
  try {
    // Direct DB access and data retrieval
    const result = await DataService.trainLSTM();

    res.json(result);
  } catch (error) {
    console.error('Error in /direct-db-access route handler:', error);
    next(error);
  }
  
});

router.get('/predict', async (req, res, next) => {
  try {
    const result = await DataService.predictLSTM();
    res.json(result);
  } catch (error) {
    console.error('Error in /predict route handler:', error);
    next(error);
  }
});

router.get('/latest-prediction', async (req, res, next) => {
  const db = req.app.get('db');
  try {
    const latestPrediction = await DataService.getLatestPrediction(db);
    res.json(latestPrediction);
  } catch (error) {
    console.error('Error in /latest-prediction route handler:', error);
    next(error);
  }
});

router.get('/latest-price', async (req, res, next) => {
  const { symbol } = req.query;
  try {
    const db = req.app.get('db');
    const latestPrice = await DataService.getLatestPrice(db, symbol);
    res.json(latestPrice);
  } catch (error) {
    console.error('Error in /latest-price route handler:', error);
    next(error);
  }
});

// Route to load trader data
router.get('/load-trader', (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading trader data:', err);
      return res.status(500).send('Error reading trader data');
    }
    res.json(JSON.parse(data));
  });
});

// Route to save trader data
router.post('/save-trader', (req, res) => {
  const traderData = req.body;
  fs.writeFile(dataFilePath, JSON.stringify(traderData, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error saving trader data:', err);
      return res.status(500).send('Error saving trader data');
    }
    res.send('Trader data saved successfully');
  });
});

router.get('/delete-cache', (req, res) => {
  DataService.deleteCache();
  res.send('Cache deleted successfully.');
});

module.exports = router;
