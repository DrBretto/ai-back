/* eslint-disable strict */
/* eslint-disable no-useless-escape */
const bcrypt = require('bcryptjs');
const xss = require('xss');

const UsersService = {
  hasUserWithUserName(db, email) {
    console.log('Checking if user exists');
    console.log(
      db('users')
        .where({ email })
        .first()
        .then((user) => !!user)
    );
    return db('users')
      .where({ email })
      .first()
      .then((user) => !!user);
  },

  validatePassword(password) {
    console.log('Validating password');
    if (password.length < 8) {
      return 'Password must be longer than 8 characters';
    }
    if (password.length > 72) {
      return 'Password must be less than 72 characters';
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces';
    }
    if (!/[0-9]/.test(password) || !/[a-z]/i.test(password)) {
      return 'Password must contain at least one number and one letter';
    }
    return null;
  },

  hashPassword(password) {
    console.log('Hashing password');
    return bcrypt.hash(password, 12);
  },

  insertUser(db, newUser) {
    console.log('Inserting new user');
    return db
      .insert(newUser)
      .into('users')
      .returning('*')
      .then(([user]) => user);
  },

  serializeUser(user) {
    console.log('Serializing user');
    return {
      id: user.id,
      email: xss(user.email),
      date_created: new Date(user.date_created),
    };
  },
};

module.exports = UsersService;
