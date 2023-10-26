const express = require('express');
const DataService = require('./data-service');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = req.app.get('db');
    const dataService = new DataService();
    const data = await dataService.getData(db);
    console.log('Data in /data route handler:', data); // Log data here
    res.json(data);
  } catch (error) {
    console.error('Error in /data route handler:', error);
    next(error);
  }
});

router.get('/process', async (req, res, next) => {
  console.log('Tell chatGPT to eat my ass. /data/process endpoint hit');
  try {
    const db = req.app.get('db');
    const dataService = new DataService();
    const data = await dataService.getData(db);
    const count = await dataService.processData(data);

    console.log('Count in /data/process route handler:', count); // Log count here
    res.json({ count });
  } catch (error) {
    console.error('Error in /process route handler:', error);
    next(error);
  }
});

module.exports = router;
