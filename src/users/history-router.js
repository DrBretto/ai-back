/* eslint-disable strict */
const express = require('express');
const path = require('path');
const UsersService = require('./users-service');

const historyRouter = express.Router();
const jsonBodyParser = express.json();

historyRouter.post('/', jsonBodyParser, (req, res, next) => {
  const history = {
    date_created: 'now()',
    user_name: req.body.user_name,
    customername: req.body.customername,
    projectname: req.body.projectname,
    room_height: req.body.room_height,
    room_length: req.body.room_length,
    room_width: req.body.width,
    clength: req.body.clength,
    cwidth: req.body.cwidth,
    wall1l: req.body.wall1l,
    wall1h: req.body.wall1h,
    wall2l: req.body.wall2l,
    wall2h: req.body.wall2h,
    wall3l: req.body.wall3l,
    wall3h: req.body.wall3h,
    wall4l: req.body.wall4l,
    wall4h: req.body.wall4h,

    selectedreverbtime: req.body.selectedreverbtime,

    selectedfloormaterial: req.body.selectedfloormaterial,

    selectedceilingmaterial: req.body.selectedceilingmaterial,

    selectedwall1material: req.body.selectedwall1material,
    selectedwall2material: req.body.selectedwall2material,
    selectedwall3material: req.body.selectedwall3material,
    selectedwall4material: req.body.selectedwall4material,
    wall1sqft: req.body.wall1sqft,
    wall2sqft: req.body.wall2sqft,
    wall3sqft: req.body.wall3sqft,
    wall4sqft: req.body.wall4sqft,

    selectedother1material: req.body.selectedother1material,
    selectedother2material: req.body.selectedother2material,
    selectedother3material: req.body.selectedother3material,
    selectedother4material: req.body.selectedother4material,
    selectedother5material: req.body.selectedother5material,
    selectedother6material: req.body.selectedother6material,
    selectedother7material: req.body.selectedother7material,
    selectedother8material: req.body.selectedother8material,
    other1sqft: req.body.other1sqft,
    other2sqft: req.body.other2sqft,
    other3sqft: req.body.other3sqft,
    other4sqft: req.body.other4sqft,
    other5sqft: req.body.other5sqft,
    other6sqft: req.body.other6sqft,
    other7sqft: req.body.other7sqft,
    other8sqft: req.body.other8sqft,

    selectedceiling1product: req.body.selectedceiling1product,
    selectedceiling2product: req.body.selectedceiling2product,
    selectedceiling3product: req.body.selectedceiling3product,
    selectedceiling4product: req.body.selectedceiling4product,
    ceilingprod1sqft: req.body.ceilingprod1sqft,
    ceilingprod2sqft: req.body.ceilingprod2sqft,
    ceilingprod3sqft: req.body.ceilingprod3sqft,
    ceilingprod4sqft: req.body.ceilingprod4sqft,

    selectedbaffle1unit: req.body.selectedbaffle1unit,
    selectedbaffle2unit: req.body.selectedbaffle2unit,
    selectedbaffle3unit: req.body.selectedbaffle3unit,
    baffle1sqft: req.body.baffle1sqft,
    baffle2sqft: req.body.baffle2sqft,
    baffle3sqft: req.body.baffle3sqft,

    selectedwall1product: req.body.selectedwall1product,
    selectedwall2product: req.body.selectedwall2product,
    selectedwall3product: req.body.selectedwall3product,
    selectedwall4product: req.body.selectedwall4product,
    selectedwall5product: req.body.selectedwall5product,
    selectedwall6product: req.body.selectedwall6product,
    selectedwall7product: req.body.selectedwall7product,
    selectedwall8product: req.body.selectedwall8product,
    wallprod1sqft: req.body.wallprod1sqft,
    wallprod2sqft: req.body.wallprod2sqft,
    wallprod3sqft: req.body.wallprod3sqft,
    wallprod4sqft: req.body.wallprod4sqft,
    wallprod5sqft: req.body.wallprod5sqft,
    wallprod6sqft: req.body.wallprod6sqft,
    wallprod7sqft: req.body.wallprod7sqft,
    wallprod8sqft: req.body.wallprod8sqft,

    user_id: req.body.user_id,
  };

  const knexInstance = req.app.get('db');

  UsersService.postHistory(knexInstance, history)
    .then((result) => {
      res.json(result);
    })
    .catch(next);
});

historyRouter.get('/:id', jsonBodyParser, (req, res, next) => {
  const knexInstance = req.app.get('db');

  //const user_id = req.body.user_name;
  UsersService.getHistory(knexInstance, req.params.id)
    .then((history) => {
      res.json(history);
    })
    .catch(next);
});

module.exports = historyRouter;
