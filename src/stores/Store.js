import _ from 'lodash';
import { action, observable, computed, decorate } from 'mobx';
import { createTransformer } from 'mobx-utils';
import dfn from 'date-fns';
import request from '../utils/request';
import { rawPosToPixelPos } from '../utils/index';
import { sRandom } from '../utils';
import autobind from 'auto-bind';

const LIVE_DELAY = 5000;

const imageSize = {
  width: 2000,
  height: 740,
};
const mapScale = (window.innerWidth * 0.9) / imageSize.width;

class Store {
  constructor() {
    // for debug purposes:
    window.logout = this.logout.bind(this);
    autobind(this);

    this.liveInterval = null;
  }
  mapSize = imageSize;
  mapScale = mapScale;
  minDate = null;
  maxDate = null;

  seekbarStartTime = 0;
  seekbarEndTime = 0;
  seekbarCurrentTime = 0;

  isLive = false;
  lastLiveLoadTime = null;

  selectedDate = null;
  users = {};
  tags = {};

  positions = {};
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

  get liveStartTime() {
    // get the time of latest data or max 5 minutes ago
    let lastDataTime = dfn.subMinutes(new Date(), 5).valueOf();

    const keys = ['positions', 'illuminance', 'temperature', 'humidity', 'airpressure'];

    for (const key of keys) {
      const data = _.get(this, key, {});
      _.forEach(data, (array) => {
        const lastTime = _.get(_.last(array), 'time', 0);
        if (lastTime > lastDataTime) {
          lastDataTime = lastTime;
        }
      });
    }

    return lastDataTime;
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

  loadDataForSelectedDate = async () => {
    if (this.selectedDate === null) return;
    this.loadingData = true;
    try {
      const params = {
        date: this.selectedDate,
      };
      const result = await request.get('/api/data/', { params });

      this.positions = this.parsePositions(_.get(result.data, 'employee_location', {}));
      this.illuminance = _.get(result.data, 'illuminance', {});
      this.temperature = _.get(result.data, 'temperature', {});
      this.humidity = _.get(result.data, 'humidity', {});
      this.airpressure = _.get(result.data, 'airpressure', {});

      this.seekbarStartTime = dfn.startOfDay(this.selectedDate).valueOf();
      this.seekbarEndTime = Math.min(dfn.endOfDay(this.selectedDate).valueOf(), Date.now() + LIVE_DELAY);
      this.seekbarCurrentTime = this.seekbarStartTime;
    } catch (error) {
      console.error(error);
    } finally {
      this.loadingData = false;
    }
  };

  loadLiveData = async () => {
    if (this.lastLiveLoadTime === null) return;
    const now = Date.now();
    const params = {
      start: this.liveStartTime,
      end: now,
    };
    this.lastLiveLoadTime = now;

    console.log(dfn.format(new Date(this.liveStartTime), 'DD.MM. HH:mm:ss'));

    try {
      const result = await request.get('/api/data/', { params });

      this.appendData(this.positions, this.parsePositions(_.get(result.data, 'employee_location', {})));
      this.appendData(this.illuminance, _.get(result.data, 'illuminance', {}));
      this.appendData(this.temperature, _.get(result.data, 'temperature', {}));
      this.appendData(this.humidity, _.get(result.data, 'humidity', {}));
      this.appendData(this.airpressure, _.get(result.data, 'airpressure', {}));

      this.seekbarEndTime = params.end;
      this.seekbarCurrentTime = params.start;
    } catch (error) {
      console.error(error);
    }
  };

  appendData(target, newData) {
    _.reduce(
      newData,
      (acc, array, tagId) => {
        if (_.has(acc, tagId)) {
          acc[tagId] = _.uniqBy([...acc[tagId], ...array], 'time');
        } else {
          acc[tagId] = _.uniqBy(array, 'time');
        }

        return acc;
      },
      target,
    );
  }

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

    const hue = Math.round(sRandom(`${id}-${user.name}`) * 360);
    user.color = `hsla(${hue}, 75%, 45%, 1)`;

    user.initials = user.name
      ? user.name
          .split(' ')
          .map(_.first)
          .join('')
      : 'UNK';

    return user;
  });

  parsePositions(apiPositions) {
    return _.reduce(
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
  }

  goLive = async () => {
    this.isLive = true;

    this.selectedDate = dfn.format(new Date(), 'YYYY-MM-DD');
    await this.loadDataForSelectedDate();

    this.liveInterval = setInterval(this.loadLiveData, LIVE_DELAY);

    this.lastLiveLoadTime = Date.now() - LIVE_DELAY;

    await this.loadLiveData();
  };

  stopLive() {
    this.isLive = false;
    this.lastLiveLoadTime = null;
    clearInterval(this.liveInterval);
    this.liveInterval = null;
  }

  async loadInitialData() {
    this.loadConfiguration();
    await this.loadDateRange();
    this.loadDataForSelectedDate();
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
  seekbarStartTime: observable,
  seekbarEndTime: observable,
  seekbarCurrentTime: observable,
  selectedDate: observable,
  loadingData: observable,
  positions: observable,
  users: observable,
  tags: observable,
  isLive: observable,
  lastLiveLoadTime: observable,
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
  appendData: action,
  loadInitialData: action,
  login: action,
  logout: action,
  loadDateRange: action,
  goLive: action,
  stopLive: action,
  loadLiveData: action,
  meanIlluminance: computed,
  liveStartTime: computed,
});
