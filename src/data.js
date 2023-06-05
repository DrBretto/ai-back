/* eslint-disable no-unused-vars */
/* eslint-disable strict */
const config = require('../config');

const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: config.DATABASE_URL,
});

module.exports = db;
