import _ from 'lodash';
import { action, observable, computed, decorate } from 'mobx';
import dfn from 'date-fns';
import request from '../utils/request';
import { rawPosToPixelPos } from '../utils/index';

const imageSize = {
  width: 2000,
  height: 740,
};
const mapScale = (window.innerWidth * 0.9) / imageSize.width;

class Store {
  constructor() {
    // for debug purposes:
    window.logout = this.logout.bind(this);
  }
  mapSize = imageSize;
  mapScale = mapScale;
  availableDates = [];

  selectedDate = null;
  positions = {};
  tags = {};
  illuminance = {};
  loadingData = false;

  loggedIn = false;

  get meanIlluminance() {
    return _.mean(_.flattenDeep(_.map(this.illuminance, (arr) => _.map(arr, 'value'))));
  }

  loadDateRange = async () => {
    this.loadingData = true;
    try {
      const result = await request.get('/api/daterange/');
      let nextDate = new Date(result.data.min);
      const lastDate = new Date(result.data.max);
      const availableDates = [];
      do {
        availableDates.push(dfn.format(nextDate, 'YYYY-MM-DD'));
        nextDate = dfn.addDays(nextDate, 1);
      } while (dfn.isBefore(nextDate, lastDate) || dfn.isSameDay(nextDate, lastDate));

      this.availableDates = availableDates;
      this.selectedDate = _.last(availableDates);
    } catch (error) {
      console.error(error);
    } finally {
      this.loadingData = false;
    }
  };

  loadData = async () => {
    if (this.selectedDate === null) return;
    this.loadingData = true;
    try {
      const params = {
        date: this.selectedDate,
      };
      const result = await request.get('/api/data/', { params });
      this.setPositions(_.get(result, 'data.employee_location', {}));
      this.illuminance = _.get(result.data, 'illuminance', {});
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
  }

  async checkLogin() {
    try {
      await request.get('/login');
      this.loggedIn = true;
      await this.loadDateRange();
      this.loadData();
    } catch (error) {
      console.error('No session');
      this.loggedIn = false;
    }
  }

  async login() {
    this.loggedIn = true;
    await this.loadDateRange();
    this.loadData();
  }
  logout() {
    this.loggedIn = false;
    request.delete('/login/');
  }
}

export default decorate(Store, {
  selectedDate: observable,
  positions: observable,
  tags: observable,
  illuminance: observable,
  loadingPositions: observable,
  loggedIn: observable,
  loadPositions: action,
  setPositions: action,
  login: action,
  logout: action,
  loadDateRange: action,
  meanIlluminance: computed,
});
