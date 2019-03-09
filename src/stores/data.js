import dfn from 'date-fns';
import _ from 'lodash';

import fakeUsers from './users.json'; // from randomuser.me

export const mapWidth = 800;
export const mapHeight = 600;

const minX = 281;
const minY = 104;
const maxX = 747;
const maxY = 534;

const MAX_LOCATION_COUNT = 1000;
const PERSON_COUNT = 20;
const FURNITURE_COUNT = 10;

const MIN_GAP_MS = 500;
const MAX_GAP_MS = 1000 * 60; //minute
const MAX_START_OFFSET = 1000 * 60 * 5; // five minutes

const MAX_STEP_PIXELS = 50;

const startTime = new Date(2019, 1, 1);

const getRandomXorY = (prev, min, max) => {
  const next = prev + _.random(-MAX_STEP_PIXELS, MAX_STEP_PIXELS);
  return _.clamp(next, min, max);
};

const getColor = (ratio) => `hsla(${ratio * 360}, 100%, 50%, 0.66`;

const people = _.reduce(
  _.times(PERSON_COUNT),
  (res, nah, i) => {
    const tagName = `person${i + 1}`;

    const user = fakeUsers[i];

    res[tagName] = {
      tagName,
      type: 'person',
      fullName: `${_.capitalize(user.name.first)} ${_.capitalize(user.name.last)}`,
      avatarURL: user.picture.medium,
    };

    return res;
  },
  {},
);

export const tags = { ...people };

export const positionsByTag = _.reduce(
  tags,
  (res, tag, tagName) => {
    const count = _.random(MAX_LOCATION_COUNT / 2, MAX_LOCATION_COUNT);

    let prevPos = {
      tag: tagName,
      timestamp: dfn.addMilliseconds(startTime, _.random(0, MAX_START_OFFSET)).valueOf(),
      x: _.random(minX, maxX),
      y: _.random(minY, maxY),
    };
    res[tagName] = _.times(count, (i) => {
      const pos = {
        tag: tagName,
        timestamp: dfn.addMilliseconds(prevPos.timestamp, _.random(MIN_GAP_MS, MAX_GAP_MS)).valueOf(),
        x: getRandomXorY(prevPos.x, minX, maxX),
        y: getRandomXorY(prevPos.y, minY, maxY),
      };
      prevPos = _.clone(pos);
      return pos;
    });

    return res;
  },
  {},
);

/*
export const tags = {
  tag1: {
    tagName: 'tag1',
    type: 'person',
    color: getColor(1),
  },
};

const timeStep = 1000 * 60;
export const positionsByTag = {
  tag1: _.map(
    [
      { x: 66, y: 317 },
      { x: 314, y: 313 },
      { x: 302, y: 131 },
      { x: 739, y: 117 },
      { x: 735, y: 525 },
      { x: 532, y: 334 },
      { x: 368, y: 529 },
      { x: 79, y: 527 },
      { x: 62, y: 333 },
    ],
    (pos, idx) => ({
      ...pos,
      timestamp: dfn.addMilliseconds(startTime, timeStep * idx).valueOf(),
    }),
  ),
};
*/
