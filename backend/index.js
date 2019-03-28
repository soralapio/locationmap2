require('dotenv').config();
const express = require('express');
const _ = require('lodash');
const dfn = require('date-fns');
const logger = require('./logger.js');
const { db, getData, getAvailableDateRange } = require('./database.js');

const app = express();
const port = process.env.SERVER_PORT || 8001;

app.use((req, res, next) => {
  logger.info(req.method, req.url);
  next();
});

app.use('/', express.static('build'));

function convertTimesToMilliseconds(array) {
  return _.map(array, (val) => ({ ...val, time: new Date(val.time).valueOf() }));
}

app.get('/api/daterange', (req, res) => {
  getAvailableDateRange()
    .then((daterange) => {
      console.log(daterange);
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

  console.log('start', startTs, ' - end', endTs);

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
