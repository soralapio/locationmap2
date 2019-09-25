const express = require('express');
const logger = require('../logger');

const { getAvailableDateRange } = require('../database.js');

const router = express.Router();

router.get('/', (req, res) => {
  getAvailableDateRange()
    .then((daterange) => {
      logger.info(daterange);
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

module.exports = router;
