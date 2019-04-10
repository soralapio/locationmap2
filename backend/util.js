const _ = require('lodash');

function convertTimesToMilliseconds(array) {
  return _.map(array, (val) => ({ ...val, time: new Date(val.time).valueOf() }));
}

module.exports = {
  convertTimesToMilliseconds,
};
