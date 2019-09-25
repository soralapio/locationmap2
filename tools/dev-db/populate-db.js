'use strict';

/*

  THIS FILE CREATES THE SQLITE3 DATABASE USED FOR DEVELOPMENT
  We assume that there are datafiles (murmur backup json files) for the sensor values located in projectroot/data/

 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const dfn = require('date-fns');
const singleLineLog = require('single-line-log').stdout;

const sensorDataTables = require('../../src/sensorDataTables.js');

const db = new Database(path.join(__dirname, 'dev.db'));

const dataFilePath = path.join(__dirname, '../../data');

let prevPercentage = 0;
const logProgress = (percentage, prefix = '') => {
  percentage = _.ceil(percentage);
  if (percentage === prevPercentage) {
    return;
  }
  prevPercentage = percentage;

  const columns = _.defaultTo(process.stdout.columns, 80);
  const progressBarLength = _.clamp(columns - 14 - prefix.length, 10, 200);
  const divisor = 100 / progressBarLength;

  let progressBar = '';
  for (let i = 0; i <= progressBarLength; i++) {
    if (i === 0 || i === progressBarLength) progressBar += '|';
    else if (i <= percentage / divisor) progressBar += '█';
    else progressBar += ' ';
  }

  singleLineLog(prefix + _.padStart(percentage, 6) + ' % ' + progressBar);
};

function readFile(fileName) {
  const filePath = path.join(dataFilePath, fileName);

  return fs.readFile(filePath, 'utf-8').then((fileData) => {
    const jsonString = `[${fileData
      .split('\n')
      .join(',')
      .slice(0, -1)}]`;

    try {
      const data = JSON.parse(jsonString);
      return data;
    } catch (error) {
      console.error(`Reading ${fileName} failed:`, error);
      return [];
    }
  });
}

let files = null;
function getFileNames(type) {
  // only need to read once:
  if (files === null) {
    files = fs.readdirSync(dataFilePath);
  }

  return _.filter(files, (file) => file.startsWith(type));
}

const populate = async (type) => {
  console.log(`\nPopulating ${type}`);
  try {
    db.prepare('BEGIN').run();

    db.prepare(`DROP TABLE IF EXISTS ${type};`).run();
    db.prepare(
      `CREATE TABLE ${type} (id INTEGER, previous_measurement_time TEXT, previous_measurement_value NUMERIC, last_measurement_time TEXT, last_measurement_value NUMERIC, last_communication_time TEXT);`,
    ).run();

    db.prepare(`CREATE INDEX ${type}_id ON ${type} (id)`).run();
    db.prepare(`CREATE INDEX ${type}_last_measurement_time ON ${type} (last_measurement_time)`).run();

    const stmt = db.prepare(
      `INSERT INTO ${type} (id, previous_measurement_time, previous_measurement_value, last_measurement_time, last_measurement_value, last_communication_time) VALUES(?,?,?,?,?,?)`,
    );

    const files = getFileNames(type);
    for (let i in files) {
      const fileName = files[i];
      const data = await readFile(fileName);

      for (let row of data) {
        if (row.id && row.previous_measurement && row.last_measurement && row.last_communication_time) {
          stmt.run(
            row.id,
            new Date(row.previous_measurement.time).toISOString(),
            row.previous_measurement.value,
            new Date(row.last_measurement.time).toISOString(),
            row.last_measurement.value,
            new Date(row.last_communication_time).toISOString(),
          );
        }
      }
      logProgress((i / (files.length - 1)) * 100);
    }

    db.prepare('END').run();
  } catch (err) {
    console.log(err);
  }
};

const populateEmployeeLocation = async () => {
  const type = 'employee_location';
  console.log(`\nPopulating ${type}`);
  try {
    db.prepare('BEGIN').run();

    db.prepare(`DROP TABLE IF EXISTS ${type};`).run();
    db.prepare(
      `CREATE TABLE ${type} (id INTEGER, previous_measurement_x NUMERIC, previous_measurement_y NUMERIC, previous_measurement_z NUMERIC, previous_measurement_lat TEXT, previous_measurement_lon TEXT, previous_measurement_time TEXT, previous_measurement_accuracy NUMERIC, previous_measurement_floor_id INTEGER, previous_measurement_valid_for TEXT, last_measurement_time TEXT, last_measurement_x NUMERIC, last_measurement_y NUMERIC, last_measurement_z NUMERIC, last_measurement_floor_id INTEGER, last_measurement_lon TEXT, last_measurement_lat TEXT, last_measurement_accuracy NUMERIC, last_measurement_valid_for TEXT, last_communication_time TEXT);`,
    ).run();

    db.prepare(`CREATE INDEX ${type}_id ON ${type} (id)`).run();
    db.prepare(`CREATE INDEX ${type}_last_measurement_time ON ${type} (last_measurement_time)`).run();

    const stmt = db.prepare(
      `INSERT INTO ${type} (id, previous_measurement_x, previous_measurement_y, previous_measurement_z, previous_measurement_lat, previous_measurement_lon, previous_measurement_time, previous_measurement_accuracy, previous_measurement_floor_id, previous_measurement_valid_for, last_measurement_time, last_measurement_x, last_measurement_y, last_measurement_z, last_measurement_floor_id, last_measurement_lon, last_measurement_lat, last_measurement_accuracy, last_measurement_valid_for, last_communication_time) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    );

    const files = getFileNames(type);
    for (let i in files) {
      const fileName = files[i];
      const data = await readFile(fileName);

      for (let row of data) {
        if (row.id && row.previous_measurement && row.last_measurement && row.last_communication_time) {
          stmt.run(
            row.id,
            row.previous_measurement.x,
            row.previous_measurement.y,
            row.previous_measurement.z,
            row.previous_measurement.lat,
            row.previous_measurement.lon,
            new Date(row.previous_measurement.time).toISOString(),
            row.previous_measurement.accuracy,
            row.previous_measurement.floor_id,
            row.previous_measurement.valid_for,
            new Date(row.last_measurement.time).toISOString(),
            row.last_measurement.x,
            row.last_measurement.y,
            row.last_measurement.z,
            row.last_measurement.floor_id,
            row.last_measurement.lon,
            row.last_measurement.lat,
            row.last_measurement.accuracy,
            row.last_measurement.valid_for,
            new Date(row.last_communication_time).toISOString(),
          );
        }
      }
      logProgress((i / (files.length - 1)) * 100);
    }

    db.prepare('END').run();
  } catch (err) {
    console.log(err);
  }
};

const users = [
  {
    userid: '31105280',
    name: 'Rodrigo Borges',
  },
  {
    userid: '31105291',
    name: 'Timo Nummenmaa',
    imageurl: 'http://www.sis.uta.fi/abcde/uploads/images/cropped/370.jpg',
  },
  {
    userid: '31105303',
    name: 'Miikka Lehtonen',
  },
  {
    userid: '31105325',
    name: 'Maria Stratigi',
  },
  {
    userid: '31105336',
    name: 'Xu Wen',
  },
  {
    userid: '3129777',
    name: 'Panu Asikanius',
  },
  {
    userid: '31195921',
    name: 'Petri Kotiranta',
  },
  {
    userid: '3110527',
    name: 'Jyrki Nummenmaa',
  },
  {
    userid: '3110526',
    name: 'Kostas Stefanidis',
  },
];

const populateUsers = async () => {
  console.log(`\nPopulating users`);
  try {
    db.prepare('BEGIN').run();

    db.prepare(`DROP TABLE IF EXISTS users;`).run();
    db.prepare(`CREATE TABLE users (userid TEXT, name TEXT, imageurl TEXT);`).run();

    db.prepare(`CREATE INDEX user_userid ON users (userid)`).run();

    const stmt = db.prepare(`INSERT INTO users (userid, name, imageurl) VALUES(?,?,?)`);

    for (let row of users) {
      stmt.run(row.userid, row.name, row.imageurl || null);
    }

    db.prepare('END').run();
  } catch (err) {
    console.log(err);
  }
};

(async function main() {
  for (const type of sensorDataTables) {
    const start = Date.now();
    await populate(type);
    console.log(`\nPopulated ${type} data in ${(Date.now() - start) / 1000} seconds`);
  }

  const start = Date.now();
  await populateEmployeeLocation();
  console.log(`\nPopulated employee location data in ${(Date.now() - start) / 1000} seconds`);

  await populateUsers();
  console.log(`\nPopulated users`);
})();
