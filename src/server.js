/* eslint-disable strict */
const app = require('./app');
const { PORT, DATABASE_URL } = require('./config');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: DATABASE_URL, //'postgres://lamvinadmin@lambin-reverb-postgresql-db:LAMVINtech2022!@lambin-reverb-postgresql-db.postgres.database.azure.com:5432/reverb', ,
});

app.set('db', db);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening at ${DATABASE_URL}:${PORT}`);
});
