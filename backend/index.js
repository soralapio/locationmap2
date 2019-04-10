require('dotenv').config();
const express = require('express');
const _ = require('lodash');
const dfn = require('date-fns');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const logger = require('./logger.js');
const { db, getData, getAvailableDateRange } = require('./database.js');
function convertTimesToMilliseconds(array) {
  return _.map(array, (val) => ({ ...val, time: new Date(val.time).valueOf() }));
}
const app = express();

app.use(express.json());

app.set('trust proxy', 1); // trust first proxy

app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_KEY1, process.env.SESSION_KEY2],
  }),
);

const port = process.env.SERVER_PORT || 8001;

// log each request
app.use((req, res, next) => {
  logger.info(req.method, req.url, req.session);
  next();
});

// check session for API-calls
app.use('/api/', (req, res, next) => {
  if (!req.session.loggedIn === true) {
    res.status(401).json({
      status: 401,
      message: 'UNAUTHORIZED',
    });
  } else {
    next();
  }
});

app.use('/', express.static('build'));

app.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.json({ message: 'Logged in' });
  } else {
    res.status(401).json({ status: 401, message: 'Not logged in' });
  }
});

app.post('/login', (req, res) => {
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

app.delete('/login', (req, res) => {
  req.session.loggedIn = false;
  res.json({
    message: 'Logged out',
  });
});

app.get('/api/daterange', (req, res) => {
  getAvailableDateRange()
    .then((daterange) => {
      logger.info(daterange);
      res.json(daterange);
    })
    .catch((error) => {
      logger.error(error);
      res.status(500).json({
        status: 500,
        message: error.message,
      });
    });
});

// Get all data types at once
app.get('/api/data', (req, res) => {
  const date = req.query.date;
  const types = ['airpressure', 'humidity', 'illuminance', 'temperature', 'employee_location'];

  const startTs = dfn.startOfDay(new Date(date));
  const endTs = dfn.endOfDay(new Date(date));

  logger.info('start', startTs, ' - end', endTs);

  const promises = _.map(types, (type) => getData(type, startTs, endTs));
  Promise.all(promises)
    .then((results) => {
      const resultObj = _.reduce(
        results,
        (acc, array, idx) => {
          const msArray = convertTimesToMilliseconds(array);
          acc[types[idx]] = _.groupBy(msArray, 'id');
          return acc;
        },
        {},
      );
      res.json(resultObj);
    })
    .catch((error) => {
      logger.error(error);
      res.status(500).json({
        status: 500,
        message: error.message,
      });
    });
});

app.listen(port, () => logger.info(`Server listening on port ${port}!`));

process.on('uncaughtException', function(error) {
  logger.error(error);
  console.error(error.stack);
  process.exit(1);
});
