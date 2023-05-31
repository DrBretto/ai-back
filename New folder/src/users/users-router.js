/* eslint-disable strict */
const express = require('express');
const path = require('path');
const { requireAuth } = require('../middleware/jwt-auth');
const UsersService = require('./users-service');

const usersRouter = express.Router();
const jsonBodyParser = express.json();

usersRouter.post('/', jsonBodyParser, (req, res, next) => {
  const { password, user_name, full_name, isadmin, active } = req.body;

  for (const field of ['full_name', 'user_name', 'password'])
    if (!req.body[field])
      return res.status(400).json({
        error: `Missing '${field}' in request body`,
      });

  const passwordError = UsersService.validatePassword(password);

  if (passwordError) return res.status(400).json({ error: passwordError });

  UsersService.hasUserWithUserName(req.app.get('db'), user_name)
    .then((hasUserWithUserName) => {
      if (hasUserWithUserName)
        return res.status(400).json({ error: 'Username already taken' });

      return UsersService.hashPassword(password).then((hashedPassword) => {
        const newUser = {
          user_name,
          password: hashedPassword,
          full_name,
          isadmin,
          active,
          date_modified: 'now()',
        };

        return UsersService.insertUser(req.app.get('db'), newUser).then(
          (user) => {
            res
              .status(201)
              .location(path.posix.join(req.originalUrl, `/${user.id}`))
              .json(UsersService.serializeUser(user));
          }
        );
      });
    })
    .catch(next);
});

usersRouter.get('/', requireAuth, (req, res, next) => {
  const knexInstance = req.app.get('db');

  UsersService.getUserList(knexInstance)
    .then((users) => {
      res.json(users);
    })
    .catch(next);
});

usersRouter.put('/', jsonBodyParser, (req, res, next) => {
  const knexInstance = req.app.get('db');

  UsersService.updateLastLogin(knexInstance, req.body.user_name)
    .then((users) => {
      res.json(users);
    })
    .catch(next);
});

usersRouter.put('/setadmin/', jsonBodyParser, (req, res, next) => {
  const knexInstance = req.app.get('db');
  UsersService.setAdmin(knexInstance, req.body.user_name)
    .then((users) => {
      res.json(users);
    })
    .catch(next);
});

usersRouter.put('/resetpw/', jsonBodyParser, (req, res, next) => {
  const knexInstance = req.app.get('db');
  const { password, user_name, full_name, isadmin, active } = req.body;

  for (const field of ['full_name', 'user_name', 'password'])
    if (!req.body[field])
      return res.status(400).json({
        error: `Missing '${field}' in request body`,
      });

  const passwordError = UsersService.validatePassword(password);

  if (passwordError) return res.status(400).json({ error: passwordError });

  UsersService.hashPassword(password).then((hashedPassword) => {
    const newUser = {
      user_name,
      password: hashedPassword,
      date_modified: 'now()',
    };
    console.log('thing:', hashedPassword, 'newuser', newUser);
    UsersService.setPW(knexInstance, req.body.user_name, hashedPassword)
      .then((users) => {
        res.json(users);
      })
      .catch(next);
  });
});

usersRouter.put('/setuser/', jsonBodyParser, (req, res, next) => {
  const knexInstance = req.app.get('db');

  UsersService.setUser(knexInstance, req.body.user_name)
    .then((users) => {
      res.json(users);
    })
    .catch(next);
});

usersRouter.put('/setactive/', jsonBodyParser, (req, res, next) => {
  const knexInstance = req.app.get('db');

  UsersService.setActive(knexInstance, req.body.user_name)
    .then((users) => {
      res.json(users);
    })
    .catch(next);
});

usersRouter.put('/setdisabled/', jsonBodyParser, (req, res, next) => {
  const knexInstance = req.app.get('db');

  UsersService.setDisabled(knexInstance, req.body.user_name)
    .then((users) => {
      res.json(users);
    })
    .catch(next);
});

// usersRouter.delete('/', (req, res) => {
//   UsersService.deleteUser(req.app.get('db')).then((user) => {
//     res
//       .status(201)
//       .location(path.posix.join(req.originalUrl, `/${user.id}`))
//       .json(UsersService.serializeUser(user));
//   });
// });

module.exports = usersRouter;
