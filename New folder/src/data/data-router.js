/* eslint-disable no-unused-vars */
// eslint-disable-next-line strict
const express = require('express');
const DataService = require('./data-service');
const dataRouter = express.Router();
const jsonParser = express.json();
const path = require('path');
const { requireAuth } = require('../middleware/jwt-auth');
const xss = require('xss');

const jsonBodyParser = express.json();

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
  active: data.active,
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postReverbTimes(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addReverbTime(knexInstance, req.body)
      .then(res.status(200))
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postFloorMaterials(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addFloorMaterial(knexInstance, req.body)
      .then(res.status(200))
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postCeilingMaterials(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addCeilingMaterial(knexInstance, req.body)
      .then(res.status(200))
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postOtherMaterials(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addOtherMaterial(knexInstance, req.body)
      .then(res.status(200))
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postWallMaterials(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addWallMaterial(knexInstance, req.body)
      .then(res.status(200))
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postCeilingProducts(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addCeilingProduct(knexInstance, req.body)
      .then(res.status(200))
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postBaffleUnits(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addBaffleUnit(knexInstance, req.body)
      .then(res.status(200))
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
  })
  .put(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.postWallProducts(knexInstance, req.body)
      .then((data) => {
        res.status(200);
      })
      .catch(next);
  })
  .post(jsonBodyParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    DataService.addWallProduct(knexInstance, req.body)
      .then(res.status(200))
      .catch(next);
  });

module.exports = dataRouter;
