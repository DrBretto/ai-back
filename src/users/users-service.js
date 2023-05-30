/* eslint-disable strict */
/* eslint-disable no-useless-escape */

const bcrypt = require('bcryptjs');
const xss = require('xss');

const REGEX_UPPER_LOWER_NUMBER_SPECIAL =
  /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/;

const UsersService = {
  hasUserWithUserName(db, user_name) {
    return db('users')
      .where({ user_name })
      .first()
      .then((user) => !!user);
  },
  insertUser(db, newUser) {
    return db
      .insert(newUser)
      .into('users')
      .returning('*')
      .then(([user]) => user);
  },
  deleteUser(db, user) {
    return db.delete(user).from('users').returning('*');
  },

  updateLastLogin(db, user) {
    return db
      .from('users')
      .where('user_name', user)
      .update({ 'date_modified': 'now()' });
  },

  setAdmin(db, user) {
    return db
      .from('users')
      .where('user_name', user)
      .update({ 'isadmin': 'true' });
  },

  setUser(db, user) {
    return db
      .from('users')
      .where('user_name', user)
      .update({ 'isadmin': 'false' });
  },

  setPW(db, user, pw) {
    console.log(user, pw);
    return db.from('users').where('user_name', user).update({ 'password': pw });
  },

  setActive(db, user) {
    return db
      .from('users')
      .where('user_name', user)
      .update({ 'active': 'true' });
  },
  setDisabled(db, user) {
    return db
      .from('users')
      .where('user_name', user)
      .update({ 'active': 'false' });
  },

  getUserList(db) {
    return db.from('users').select('*').orderBy('id');
  },

  postHistory(db, history) {
    return db.insert(history).into('projects').returning('*');
  },

  getHistory(db, user) {
    return db.from('projects').select('*').where('user_id', user).orderBy('id');
  },

  validatePassword(password) {
    if (password.length < 8) {
      return 'Password be longer than 8 characters';
    }
    if (password.length > 72) {
      return 'Password be less than 72 characters';
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces';
    }
    if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain one upper case, lower case, number and special character';
    }
    return null;
  },
  hashPassword(password) {
    return bcrypt.hash(password, 12);
  },
  serializeUser(user) {
    return {
      id: user.id,
      full_name: xss(user.full_name),
      user_name: xss(user.user_name),
      date_created: new Date(user.date_created),
      active: true,
      isadmin: user.isadmin,
    };
  },
};

module.exports = UsersService;
