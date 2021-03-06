require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const logger = require('./logger.js');
const middleware = require('./middleware');
const { checkEnvVariables, envConfig } = require('./util');

// Check that the environment variables are valid:
checkEnvVariables();

const port = process.env.SERVER_PORT || envConfig.SERVER_PORT;

// Create server object:
const router = express.Router();
const app = express();
app.use(express.json());
app.set('trust proxy', 1); // trust first proxy

// Use cookie-session middleware to handle sessions:
app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_KEY1, process.env.SESSION_KEY2],
  }),
);

app.use('/', router);

// log each request
app.use(middleware.logRequest);

// check session for API-calls
app.use('/api/', middleware.checkLoggedIn);

app.use('/', express.static('build'));
app.use('/login', require('./routes/login'));
app.use('/api/data', require('./routes/data'));
app.use('/api/daterange', require('./routes/daterange'));

// Start server:
app.listen(port, () => logger.info(`Server listening on port ${port}!`));

// Die on errors:
process.on('uncaughtException', function(error) {
  logger.error(error);
  console.error(error.stack);
  process.exit(1);
});
