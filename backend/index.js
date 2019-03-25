const express = require('express');
const _ = require('lodash');
const logger = require('./logger.js');
const { getData } = require('./getData.js');

const app = express();
const port = 8001;

app.use((req, res, next) => {
  logger.info(req.method, req.url);
  next();
});

app.use('/static', express.static('public'));

// Get all data types at once
app.get('/api/data', (req, res) => {
  const date = req.query.date;
  const types = ['airpressure', 'humidity', 'illuminance', 'temperature', 'employee_location'];

  const promises = _.map(types, (type) => getData(type, date));
  Promise.all(promises)
    .then((results) => {
      const resultObj = Object.assign({}, ...results);
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

// Get just one type of data
app.get('/api/data/:type', (req, res) => {
  const type = req.params.type;
  const date = req.query.date;

  getData(type, date).then((data) => {
    res.json(data[type]);
  });
});

app.listen(port, () => logger.info(`Server listening on port ${port}!`));

process.on('uncaughtException', function(error) {
  logger.error(error);
  console.error(error.stack);
  process.exit(1);
});
