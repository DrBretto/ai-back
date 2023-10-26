const express = require('express');
const DataService = require('./data-service');
const router = express.Router();

router.get('/data', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const dataService = new DataService();
    const data = await dataService.getData(db);
    res.json(data);
  } catch (error) {
    console.error('Error in /data route handler:', error);
    next(error);
  }
});

router.get('/data/process', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const dataService = new DataService();
    const count = await dataService.processData(db);
    res.json({ count });
  } catch (error) {
    console.error('Error in /process route handler:', error);
    next(error);
  }
});

module.exports = router;
