const express = require('express');
const router = express.Router();

const DataService = require('./data-service');

router.get('/data', async (req, res, next) => {
  const db = req.app.get('db');
  try {
    console.log('Entering /data route handler');
    const data = await DataService.getData(db);
    console.log('Data retrieved:', data);
    res.json(data);
  } catch (error) {
    console.error('Error in /data route handler:', error);
    next(error);
  }
});

router.get('/process', async (req, res, next) => {
  try {
    console.log('Entering /process route handler');
    const result = await DataService.processData();
    console.log('Process result:', result);
    res.json({ count: result });
  } catch (error) {
    console.error('Error in /process route handler:', error);
    next(error);
  }
});

module.exports = router;
