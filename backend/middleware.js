const logger = require('./logger');

const SESSION_KEEP_ALIVE_TIME = 1000 * 60 * 60 * 24; // 24 hours

/* Check that
    1. user is logged in (session.loggedIn === true)
    2. session has not expired (ie. user has done something in the last 24 hours)
 */
function checkLoggedIn(req, res, next) {
  const sessionLifeTime = Date.now() - (req.session.sessionTime || 0);
  const isSessionAlive = SESSION_KEEP_ALIVE_TIME > sessionLifeTime;

  if (!req.session.loggedIn === true || !isSessionAlive) {
    req.session.loggedIn = false;
    req.session.sessionTime = undefined;
    res.status(401).json({
      status: 401,
      message: 'UNAUTHORIZED',
    });
  } else {
    // Refresh sessionTime on each request
    req.session.sessionTime = Date.now();
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
