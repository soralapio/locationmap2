import _ from 'lodash';
import { action, observable, computed, decorate } from 'mobx';
import { createTransformer } from 'mobx-utils';
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
  minDate = null;
  maxDate = null;

  selectedDate = null;
  positions = {};
  users = {};
  tags = {};
  illuminance = {};
  temperature = {};
  humidity = {};
  airpressure = {};
  loadingFirstTime = true;
  loadingData = false;

  loggedIn = false;

  get meanIlluminance() {
    return _.mean(_.flattenDeep(_.map(this.illuminance, (arr) => _.map(arr, 'value'))));
  }

  loadDateRange = async () => {
    this.loadingData = true;
    try {
      const result = await request.get('/api/daterange/');
      this.minDate = new Date(result.data.min);
      this.maxDate = new Date(result.data.max);

      this.selectedDate = dfn.format(this.maxDate, 'YYYY-MM-DD');
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
      this.temperature = _.get(result.data, 'temperature', {});
      this.humidity = _.get(result.data, 'humidity', {});
      this.airpressure = _.get(result.data, 'airpressure', {});
    } catch (error) {
      console.error(error);
    } finally {
      this.loadingData = false;
    }
  };

  loadConfiguration = async () => {
    try {
      const result = await request.get('/api/data/config');
      this.users = _.mapValues(result.data.users, (user, id) => ({ ...user, id, type: 'user' }));
      this.tags = _.mapValues(result.data.tags, (tag, id) => ({ ...tag, id, ...rawPosToPixelPos(tag.x, tag.y) }));
    } catch (error) {
      console.error(error);
    }
  };

  getTag = createTransformer((id) => {
    // TODO: figure out why this:
    // the ids in the location data only have 8 numbers while the tag ids provided have 8
    // se we try also the first 7
    let user = this.users[id] || _.find(this.users, (user) => user.id.slice(0, -1) === String(id));

    if (!user) {
      user = {
        name: null,
        type: 'user',
        id,
      };
    }

    const hue = Math.floor(Math.abs(Math.sin(parseInt(user.id, 10))) * 360);
    user.color = `hsla(${hue}, 85%, 45%, 1)`;

    user.initials = user.name
      ? user.name
          .split(' ')
          .map(_.first)
          .join('')
      : 'UNK';

    return user;
  });

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
  }

  async loadInitialData() {
    this.loadConfiguration();
    await this.loadDateRange();
    this.loadData();
  }

  async checkLogin() {
    try {
      await request.get('/login');
      this.loggedIn = true;
      this.loadInitialData();
    } catch (error) {
      console.error('No session');
      this.loggedIn = false;
    } finally {
      this.loadingFirstTime = false;
    }
  }

  async login() {
    this.loggedIn = true;
    this.loadInitialData();
  }
  logout() {
    this.loggedIn = false;
    request.delete('/login/');
  }
}

export default decorate(Store, {
  selectedDate: observable,
  positions: observable,
  users: observable,
  tags: observable,
  illuminance: observable,
  temperature: observable,
  humidity: observable,
  airpressure: observable,
  loadingPositions: observable,
  loadingFirstTime: observable,
  loggedIn: observable,
  minDate: observable,
  maxDate: observable,
  loadData: action,
  loadInitialData: action,
  setPositions: action,
  login: action,
  logout: action,
  loadDateRange: action,
  meanIlluminance: computed,
});
