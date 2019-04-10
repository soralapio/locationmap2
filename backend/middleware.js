const logger = require('./logger');

function checkLoggedIn(req, res, next) {
  if (!req.session.loggedIn === true) {
    res.status(401).json({
      status: 401,
      message: 'UNAUTHORIZED',
    });
  } else {
    next();
  }
}

function logRequest(req, res, next) {
  logger.info(req.method, req.url, req.session);
  next();
}

module.exports = {
  checkLoggedIn,
  logRequest,
};
