const express = require('express');
const dfn = require('date-fns');
const _ = require('lodash');
const logger = require('../logger');

const { getData } = require('../database.js');

// Some values are stored as strings in database but we want them to be floats:
const parseValues = (array) => {
  const floatKeys = ['x', 'y', 'value', 'accuracy'];
  return _.map(array, (obj) => {
    const parsedObj = {};
    for (let key of floatKeys) {
      if (_.has(obj, key)) {
        parsedObj[key] = parseFloat(obj[key]);
      }
    }
    // also convert time to unix-time milliseconds
    parsedObj.time = new Date(obj.time).valueOf();
    return { ...obj, ...parsedObj };
  });
};

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
        (acc, rawArray, idx) => {
          const array = parseValues(rawArray);
          acc[types[idx]] = _.groupBy(array, 'id');
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

router.get('/config', (req, res) => {
  try {
    const config = require('../configuration.json');
    res.json(config);
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
});

module.exports = router;
