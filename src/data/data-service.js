/* eslint-disable no-unused-vars */
// eslint-disable-next-line strict
const DataService = {
  getData(knex, userId) {
    return knex.from('data').select('*');
  },

  getData2(knex, userId) {
    return knex.from('data2').select('*');
  },
};

module.exports = DataService;
