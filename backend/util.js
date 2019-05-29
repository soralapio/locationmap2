const _ = require('lodash');
const logger = require('./logger');

// Required vars are true
// Optional vars without default are false
// Optional vars with default are the default
const envConfig = {
  PORT: false,
  SERVER_PORT: 8001,
  DEBUG: false,
  DATABASE_USER: true,
  DATABASE_PASSWORD: true,
  SESSION_KEY1: true,
  SESSION_KEY2: true,
  PASSWORD_HASH: true,
};

const checkEnvVariables = () => {
  const errors = _.filter(_.keys(envConfig), (key) => {
    if (!_.has(process.env, key)) {
      const val = _.get(envConfig, key);
      if (val === true) {
        logger.error(`Missing required environment variable: "${key}"`);
        return key;
      } else if (val === false) {
        return false;
      } else {
        logger.info(`Optional environment variable not set: "${key}". Using default: "${val}"`);
        return false;
      }
    }
    return false;
  });
  if (errors.length > 0) {
    logger.error(`Shutting down due to missing environment variables: ${errors.join(', ')}`);
    process.exit(1);
  }
};

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

module.exports = {
  checkEnvVariables,
  envConfig,
  parseValues,
};
