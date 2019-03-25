const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'smartroom' });

module.exports = logger;
