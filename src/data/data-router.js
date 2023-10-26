const express = require('express');
const router = express.Router();

const DataService = require('./data-service');

router.get('/data', async (req, res, next) => {
  const db = req.app.get('db');
  try {
    const data = await DataService.getData(db);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/process', async (req, res, next) => {
  try {
    const count = await DataService.processData();
    res.json({ count }); // Send back the count value
  } catch (error) {
    next(error);
  }
});

module.exports = router;
