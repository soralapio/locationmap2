const express = require('express');
const crypto = require('crypto');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.loggedIn) {
    res.json({ message: 'Logged in' });
  } else {
    res.status(401).json({ status: 401, message: 'Not logged in' });
  }
});

router.post('/', (req, res) => {
  try {
    const testHash = crypto
      .createHash('sha256')
      .update(req.body.password)
      .digest('hex');

    if (testHash === process.env.PASSWORD_HASH) {
      req.session.loggedIn = true;
      res.json({
        message: 'Login succeeded',
      });
    } else {
      req.session.loggedIn = false;
      res.status(401).json({
        status: 401,
        message: 'Login failed',
      });
    }
  } catch (err) {
    throw err;
  }
});

router.delete('/', (req, res) => {
  req.session.loggedIn = false;
  res.json({
    message: 'Logged out',
  });
});

module.exports = router;
