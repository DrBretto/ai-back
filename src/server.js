/* eslint-disable strict */
const app = require('./app');
const { PORT, DATABASE_URL } = require('./config');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

app.set('db', db);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening at ${DATABASE_URL}:${PORT}`);
});
