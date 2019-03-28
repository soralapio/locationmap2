const knex = require('knex');
const path = require('path');
const dfn = require('date-fns');
const _ = require('lodash');

const knexfile = require('./knexfile');

const databaseConfig = process.env.NODE_ENV === 'production' ? knexfile.production : knexfile.development;

const db = knex(databaseConfig);

const tables = ['airpressure', 'humidity', 'illuminance', 'temperature', 'employee_location'];

const defaultTargetCols = ['time', 'value'];

function getData(tableName, startTs, endTs) {
  const startDate = new Date(startTs).toISOString();
  const endDate = new Date(endTs).toISOString();

  let targetCols = defaultTargetCols;
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

function getAvailableDateRange() {
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
  getAvailableDateRange,
};
