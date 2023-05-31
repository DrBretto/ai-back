/* eslint-disable no-unused-vars */
// eslint-disable-next-line strict
const DataService = {
  getRecommendedReverbTimes(knex, userId) {
    return knex.from('recommended_reverb_times').select('*');
  },

  getFloorMaterials(knex, userId) {
    return knex.from('floor_materials').select('*');
  },

  getCeilingMaterials(knex, userId) {
    return knex.from('ceiling_materials').select('*');
  },

  getWallMaterials(knex, userId) {
    return knex.from('wall_materials').select('*');
  },

  getOtherMaterials(knex, userId) {
    return knex.from('other_materials').select('*');
  },

  getCeilingProducts(knex, userId) {
    return knex.from('ceiling_products').select('*');
  },

  getBaffleUnits(knex, userId) {
    return knex.from('baffle_units').select('*');
  },

  getWallProducts(knex, userId) {
    return knex.from('wall_products').select('*');
  },
};

module.exports = DataService;
