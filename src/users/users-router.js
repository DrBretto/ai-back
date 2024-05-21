/* eslint-disable strict */
const express = require('express');
const path = require('path');
const UsersService = require('./users-service');

const usersRouter = express.Router();
const jsonBodyParser = express.json();
usersRouter.post('/', jsonBodyParser, async (req, res) => {
  const { email, password } = req.body;
  console.log('Request body:', req.body);

  const db = req.app.get('db');
  console.log('Database connection object:', db);

  for (const field of ['email', 'password']) {
    if (!req.body[field]) {
      console.log(`Missing '${field}' in request body`);
      return res
        .status(400)
        .json({ error: `Missing '${field}' in request body` });
    }
  }

  try {
    console.log('Validating password...');
    const passwordError = UsersService.validatePassword(password);
    if (passwordError) {
      console.log('Password validation error:', passwordError);
      return res.status(400).json({ error: passwordError });
    }

    console.log('Checking if user exists...');
    const hasUserWithUserName = await UsersService.hasUserWithUserName(
      db,
      email
    );
    console.log('User exists:', hasUserWithUserName);
    if (!hasUserWithUserName) {
      console.log('Hashing password...');
      const hashedPassword = await UsersService.hashPassword(password);
      const newUser = {
        email,
        password: hashedPassword,
        date_created: 'now()',
      };

      console.log('Inserting new user...');
      const user = await UsersService.insertUser(db, newUser);
      console.log('Inserted user:', user);
      return res
        .status(201)
        .location(path.posix.join(req.originalUrl, `/${user.id}`))
        .json(UsersService.serializeUser(user));
    }
  } catch (error) {
    console.error('Error during user registration:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

usersRouter.get('/', (req, res) => {
  res.send('Hello, world!!');
});

module.exports = usersRouter;
