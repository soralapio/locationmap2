import _ from 'lodash';
import { action, observable, decorate, runInAction } from 'mobx';
import axios from 'axios';

// TODO: better way to see what data is available
const availableDates = _.range(5, 15).map((date) => `2019-3-${date}`);

const rawBounds = {
  minX: 5,
  maxX: 32,
  minY: 15,
  maxY: 6, // y seems to be flipped, so maxY < minY
};
const pixBounds = {
  minX: 150,
  maxX: 750,
  minY: 450,
  maxY: 640,
};

const mapToRange = (val, inMin, inMax, outMin, outMax) =>
  ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

const rawPosToPixelPos = (rawX, rawY) => ({
  x: mapToRange(rawX, rawBounds.minX, rawBounds.maxX, pixBounds.minX, pixBounds.maxX),
  y: mapToRange(rawY, rawBounds.minY, rawBounds.maxY, pixBounds.minY, pixBounds.maxY),
});

const pixelPosToRawPos = (pixelX, pixelY) => ({
  x: mapToRange(pixelX, pixBounds.minX, pixBounds.maxX, rawBounds.minX, rawBounds.maxX),
  y: mapToRange(pixelY, pixBounds.minY, pixBounds.maxY, rawBounds.minY, rawBounds.maxY),
});

class Store {
  mapSize = { width: 800, height: 800 };
  availableDates = availableDates;

  selectedDate = _.last(availableDates);
  positions = {};
  tags = {};
  loadingData = false;

  loadData = async () => {
    this.loadingData = true;
    try {
      const params = {
        date: this.selectedDate,
      };
      const result = await axios.get('/api/data/', { params });
      console.log(result.data);
      this.setPositions(_.get(result, 'data.employee_location', {}));
    } catch (error) {
      console.error(error);
    } finally {
      this.loadingData = false;
    }
  };

  setPositions(apiPositions) {
    const positions = _.reduce(
      apiPositions,
      (res, rawPositions, id) => {
        res[id] = _.map(rawPositions, (pos) => {
          return {
            id: pos.id,
            time: pos.time,
            accuracy: pos.accuracy,
            ...rawPosToPixelPos(pos.x, pos.y),
          };
        });
        return res;
      },
      {},
    );

    runInAction('set positions', () => {
      this.positions = positions;
      this.tags = _.reduce(
        this.positions,
        (res, arr, id) => {
          res[id] = {
            type: 'person',
            id,
          };
          return res;
        },
        {},
      );
    });
  }
}

export default decorate(Store, {
  selectedDate: observable,
  positions: observable,
  tags: observable,
  loadingPositions: observable,
  loadPositions: action,
  setPositions: action,
});

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
