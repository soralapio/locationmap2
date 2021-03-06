const knex = require('knex');
const path = require('path');
const dfn = require('date-fns');
const _ = require('lodash');

const knexfile = require('./knexfile');
const sensorDataTables = require('../src/sensorDataTables.js');

// Switch database config based on env variable
const databaseConfig = process.env.NODE_ENV === 'production' ? knexfile.production : knexfile.development;

// Connect to database:
const db = knex(databaseConfig);

// Get data points from a table between two timestamps
function getData(tableName, startTs, endTs) {
  const startDate = new Date(startTs).toISOString();
  const endDate = new Date(endTs).toISOString();

  // For sensor data, we just want time and value
  let targetCols = ['time', 'value'];

  // For employee_location, we want x,y and accuracy
  if (tableName === 'employee_location') {
    targetCols = ['time', 'x', 'y', 'accuracy'];
  }
  const cols = _.map(targetCols, (col) => `last_measurement_${col} as ${col}`);

  return db
    .select(['id', ...cols])
    .from(tableName)
    .orderBy('last_measurement_time', 'asc')
    .whereBetween('last_measurement_time', [startDate, endDate]);
}

function getUsers() {
  return db('users');
}

// Get the timestamps of the first and last data points from ANY table
function getAvailableDateRange() {
  const tables = ['employee_location', ...sensorDataTables];
  const promises = _.map(tables, (tableName) =>
    db(tableName)
      .min({ min: 'last_measurement_time' })
      .max({ max: 'last_measurement_time' }),
  );

  return Promise.all(promises).then((rows) => {
    const res = rows[0];
    const min = _.minBy(res, 'min').min;
    const max = _.maxBy(res, 'max').max;
    return { min: dfn.format(new Date(min), 'YYYY-MM-DD'), max: dfn.format(new Date(max), 'YYYY-MM-DD') };
  });
}

module.exports = {
  db,
  getData,
  getUsers,
  getAvailableDateRange,
};
