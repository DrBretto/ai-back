/* eslint-disable strict */
const express = require('express');
const path = require('path');
const UsersService = require('./users-service');

const usersRouter = express.Router();
const jsonBodyParser = express.json();


usersRouter.post('/', jsonBodyParser, (req, res, next) => {
  const { password, email } = req.body;
  console.log(req.body);
  for (const field of ['email', 'password'])
    if (!req.body[field])
      return res.status(400).json({
        error: `Missing '${field}' in request body`,
      });

  const passwordError = UsersService.validatePassword(password);

  if (passwordError) return res.status(400).json({ error: passwordError });

  UsersService.hasUserWithUserName(req.app.get('db'), email)
    .then((hasUserWithUserName) => {
      if (hasUserWithUserName)
        return res.status(400).json({ error: 'Username already taken' });

      return UsersService.hashPassword(password).then((hashedPassword) => {
        const newUser = {
          email,
          password: hashedPassword,
          date_created: 'now()',
        };

        return UsersService.insertUser(req.app.get('db'), newUser)
          .then((user) => {
            res
              .status(201)
              .location(path.posix.join(req.originalUrl, `/${user.id}`))
              .json(UsersService.serializeUser(user));
          })
          .catch((error) => {
            console.error('Error inserting user:', error);
            res.status(500).json({ error: 'Internal server error' });
          });
      });
    })
    .catch(next);
});

usersRouter.get('/', (req, res) => {
  res.send('Hello, world!!');
});

module.exports = usersRouter;
