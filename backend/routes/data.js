const express = require('express');
const dfn = require('date-fns');
const _ = require('lodash');
const logger = require('../logger');

const sensorDataTables = require('../../src/sensorDataTables.js');
const { getData, getUsers } = require('../database.js');
const { parseValues } = require('../util.js');

const router = express.Router();

// Get all data types at once
router.get('/', (req, res) => {
  let startTs = null;
  let endTs = null;

  // If query has a "date"-field, get data for that whole day
  if (_.has(req.query, 'date')) {
    const date = req.query.date;
    startTs = dfn.startOfDay(new Date(date));
    endTs = dfn.endOfDay(new Date(date));
  } else {
    // Otherwise query should have "start" and "end" fields as unix epoch time in milliseconds
    startTs = parseInt(req.query.start, 10);
    endTs = parseInt(req.query.end, 10);
  }

  logger.info('GET data: start', startTs, ' - end', endTs);

  // Create promises for all of the tables and fetch from database
  const tables = ['employee_location', ...sensorDataTables];
  const promises = _.map(tables, (type) => getData(type, startTs, endTs));
  Promise.all(promises)
    .then((results) => {
      // Construct result to send to frontend:
      const resultObj = _.reduce(
        results,
        (acc, rawArray, idx) => {
          const array = parseValues(rawArray);
          acc[tables[idx]] = _.groupBy(array, 'id');
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

router.get('/config', async (req, res) => {
  try {
    // Config file includes sensor locations
    const config = require('../configuration.json');

    // Get users from database and include them in the config
    const users = await getUsers();
    config.users = _.reduce(
      users,
      (acc, user) => {
        // Transform the user object to the format expected by the frontend
        acc[user.userid] = {
          name: user.name,
          imageURL: user.imageurl,
        };
        return acc;
      },
      {},
    );
    res.json(config);
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
});

module.exports = router;
