/* eslint-disable no-unused-vars */
// eslint-disable-next-line strict
const express = require('express');
const DataService = require('./data-service');
const dataRouter = express.Router();
const jsonParser = express.json();
const path = require('path');
const { requireAuth } = require('../middleware/jwt-auth');
const xss = require('xss');

const serializeData = (data) => ({
  id: data.id,
  descript: data.descript,
});

dataRouter
  .route('/data')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getData(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/data2')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getData2(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

module.exports = dataRouter;
