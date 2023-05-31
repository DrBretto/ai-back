/* eslint-disable strict */
const app = require('../api');
const { PORT, DATABASE_URL } = require('./config');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: DATABASE_URL,
});

app.set('db', db);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening at (not) ${DATABASE_URL}:${PORT}`);
});
