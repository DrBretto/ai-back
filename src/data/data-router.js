const express = require('express');
const DataService = require('./data-service');
const router = express.Router();

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
  console.log('/data/process endpoint hit');
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
    const db = req.app.get('db');

    // Retrieve and organize data
    await DataService.getData(db);

    // Train the model
    const trainingResult = await DataService.trainModel();

    res.json(trainingResult);
  } catch (error) {
    console.error('Error in /train route handler:', error);
    next(error);
  }
});

router.get('/direct', async (req, res) => {
  try {
    const dataService = new DataService();
    const result = await dataService.directDbAccess();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/delete-cache', (req, res) => {
  DataService.deleteCache();
  res.send('Cache deleted successfully.');
});

module.exports = router;
