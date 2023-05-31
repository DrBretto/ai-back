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
  hz125: data.hz125,
  hz250: data.hz250,
  hz500: data.hz500,
  hz1000: data.hz1000,
  hz2000: data.hz2000,
  hz4000: data.hz4000,
  nrc: data.nrc,
  min: data.min,
  max: data.max,
  l: data.l,
  w: data.w,
});

dataRouter
  .route('/recommended_reverb_times')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getRecommendedReverbTimes(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/floor_materials')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getFloorMaterials(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/ceiling_materials')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getCeilingMaterials(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/other_materials')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getOtherMaterials(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/wall_materials')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getWallMaterials(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/ceiling_products')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getCeilingProducts(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/baffle_units')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getBaffleUnits(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

dataRouter
  .route('/wall_products')
  .all(requireAuth)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');

    DataService.getWallProducts(knexInstance)
      .then((data) => {
        res.json(data.map(serializeData));
      })
      .catch(next);
  });

module.exports = dataRouter;
