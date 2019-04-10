const express = require('express');
const dfn = require('date-fns');
const _ = require('lodash');
const logger = require('../logger');

const { getData } = require('../database.js');
const { convertTimesToMilliseconds } = require('../util');

const router = express.Router();

// Get all data types at once
router.get('/', (req, res) => {
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

module.exports = router;
