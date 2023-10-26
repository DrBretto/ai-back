const express = require('express');
const DataService = require('./data-service');
const router = express.Router();

router.get('/data', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const dataService = new DataService();
    const data = await dataService.getData(db);
    console.log('Data in /data route handler:', data);  // Log data here
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
    console.log('Count in /data/process route handler:', count);  // Log count here
    res.json({ count });
  } catch (error) {
    console.error('Error in /process route handler:', error);
    next(error);
  }
});

module.exports = router;
