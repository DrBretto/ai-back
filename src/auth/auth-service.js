/* eslint-disable strict */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const AuthService = {
  getUserWithUsername(knex, username) {
    return knex('users')
      .where({ username }) // updated this line from user_name to username
      .first()
      .then((user) => {
        console.log(user); // Here log user object to verify that password field exists
        return user;
      })
      .catch((err) => {
        console.error('Error occurred:', err);
        throw err;
      });
  },
  comparePasswords(password, hash) {
    return bcrypt.compare(password, hash);
  },
  createJwt(subject, payload) {
    return jwt.sign(payload, config.JWT_SECRET, {
      subject,
      algorithm: 'HS256',
    });
  },
  verifyJwt(token) {
    return jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  },
  parseBasicToken(token) {
    return Buffer.from(token, 'base64').toString().split(':');
  },
};
module.exports = AuthService;
