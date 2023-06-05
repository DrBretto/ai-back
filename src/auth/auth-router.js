/* eslint-disable strict */
const express = require('express');
const AuthService = require('./auth-service');
const authRouter = express.Router();
const jsonBodyParser = express.json();

authRouter.post('/login', jsonBodyParser, async (req, res, next) => {
  const { email, password } = req.body;
  const loginUser = { email, password };

  console.log('Login endpoint hit with:', loginUser);

  for (const [key, value] of Object.entries(loginUser)) {
    if (value == null)
      return res.status(400).json({
        error: `Missing '${key}' in request body`,
      });
  }

  try {
    const dbUser = await AuthService.getUserWithUserName(
      req.app.get('db'),
      loginUser.email
    );
    console.log('User fetched from DB:', dbUser);

    if (!dbUser) {
      return res.status(400).json({
        error: 'Incorrect email or password',
      });
    }

    console.log(loginUser.password, dbUser.password);
    const compareMatch = await AuthService.comparePasswords(
      loginUser.password,
      dbUser.password
    );
    console.log('Password compare result:', compareMatch);

    if (!compareMatch) {
      return res.status(400).json({
        error: 'Incorrect email or password',
      });
    }

    const sub = dbUser.email;
    const payload = { user_id: dbUser.id };
    res.send({
      authToken: AuthService.createJwt(sub, payload),
    });
  } catch (err) {
    console.error('Error during login:', err);
    next(err);
  }
});

module.exports = authRouter;
