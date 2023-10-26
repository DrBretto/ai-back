const express = require('express');
const router = express.Router();

const DataService = require('./data-service');

router.get('/data', async (req, res, next) => {
  const db = req.app.get('db');
  try {
    const data = await DataService.getData(db);
    res.json(data);
  } catch (error) {
    console.error('Error object in /data route handler:', error);
    console.log('Response object in /data route handler:', res);
    next(error);
  }
});

router.get('/process', async (req, res, next) => {
  try {
    const result = await DataService.processData();
    res.json({ count: result });
  } catch (error) {
    console.error('Error object in /process route handler:', error);
    console.log('Response object in /process route handler:', res);
    next(error);
  }
});

module.exports = router;
