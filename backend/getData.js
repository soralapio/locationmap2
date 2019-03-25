const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const cache = {};

function getData(type, date) {
  const fileName = `${type}-${date}.json`;

  if (cache[fileName] !== undefined) return cache[fileName];

  const filePath = path.join(__dirname, '../data', fileName);

  return fs.readFile(filePath, 'utf-8').then((fileData) => {
    const jsonString = `[${fileData
      .split('\n')
      .join(',')
      .slice(0, -1)}]`;

    const rawData = JSON.parse(jsonString);

    const dataArray = _.map(rawData, (obj) => ({
      id: obj.id,
      ...obj.last_measurement,
    }));

    const result = {
      [type]: _.groupBy(dataArray, 'id'),
    };

    cache[fileName] = result;

    return result;
  });
}

module.exports = {
  getData,
};
