const bunyan = require('bunyan');
const path = require('path');
const options = { name: 'smartroom' };

if (process.env.NODE_ENV === 'production') {
  options.streams = [{ path: path.join(__dirname, 'serverlog.log') }];
}

const logger = bunyan.createLogger(options);

module.exports = logger;
