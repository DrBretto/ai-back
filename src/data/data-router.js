// data-router.js
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
    const db = req.app.get('db');
    try {
        const result = await DataService.processData(db);
        res.json({ count: result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
