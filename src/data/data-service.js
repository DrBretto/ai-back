/* eslint-disable no-unused-vars */
// eslint-disable-next-line strict
const DataService = {
  getRecommendedReverbTimes(knex, userId) {
    return knex.from('recommended_reverb_times').select('*').orderBy('id');
  },

  postReverbTimes(knex, data) {
    return knex
      .from('recommended_reverb_times')
      .update(data)
      .where('id', data.id);
  },

  addReverbTime(knex, data) {
    console.log(data);
    return knex.insert(data).into('recommended_reverb_times').returning('*');
  },

  postFloorMaterials(knex, data) {
    return knex.from('floor_materials').update(data).where('id', data.id);
  },

  addFloorMaterial(knex, data) {
    return knex.insert(data).into('floor_materials').returning('*');
  },

  postCeilingMaterials(knex, data) {
    return knex.from('ceiling_materials').update(data).where('id', data.id);
  },

  addCeilingMaterial(knex, data) {
    return knex.insert(data).into('ceiling_materials').returning('*');
  },

  postWallMaterials(knex, data) {
    return knex.from('wall_materials').update(data).where('id', data.id);
  },

  addWallMaterial(knex, data) {
    return knex.insert(data).into('wall_materials').returning('*');
  },

  postOtherMaterials(knex, data) {
    return knex.from('other_materials').update(data).where('id', data.id);
  },

  addOtherMaterial(knex, data) {
    return knex.insert(data).into('other_materials').returning('*');
  },

  postCeilingProducts(knex, data) {
    return knex.from('ceiling_products').update(data).where('id', data.id);
  },

  addCeilingProduct(knex, data) {
    return knex.insert(data).into('ceiling_products').returning('*');
  },

  postWallProducts(knex, data) {
    return knex.from('wall_products').update(data).where('id', data.id);
  },

  addWallProduct(knex, data) {
    return knex.insert(data).into('wall_products').returning('*').orderBy('id');
  },

  postBaffleUnits(knex, data) {
    return knex.from('baffle_units').update(data).where('id', data.id);
  },

  addBaffleUnit(knex, data) {
    return knex.insert(data).into('baffle_units').returning('*').orderBy('id');
  },

  getFloorMaterials(knex, userId) {
    return knex.from('floor_materials').select('*').orderBy('id');
  },

  getCeilingMaterials(knex, userId) {
    return knex.from('ceiling_materials').select('*').orderBy('id');
  },

  getWallMaterials(knex, userId) {
    return knex.from('wall_materials').select('*').orderBy('id');
  },

  getOtherMaterials(knex, userId) {
    return knex.from('other_materials').select('*').orderBy('id');
  },

  getCeilingProducts(knex, userId) {
    return knex.from('ceiling_products').select('*').orderBy('id');
  },

  getBaffleUnits(knex, userId) {
    return knex.from('baffle_units').select('*').orderBy('id');
  },

  getWallProducts(knex, userId) {
    return knex.from('wall_products').select('*').orderBy('id');
  },
};

module.exports = DataService;
