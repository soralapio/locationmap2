import React, { Component } from 'react';
import _ from 'lodash';
import dfn from 'date-fns';
import { observer } from 'mobx-react';
import autobind from 'auto-bind';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import 'react-day-picker/lib/style.css';
import './Map.scss';

import sensorDataTables from '../../sensorDataTables.js';

import { MdPlayArrow, MdPause } from 'react-icons/md';
import { FaCalendarAlt } from 'react-icons/fa';

import ZoomPan from '../ZoomPan/ZoomPan';
import Seekbar from '../Seekbar/Seekbar';

import { extractPropsFromStores, pixelPosToRawPos } from '../../utils';
import store from '../../stores';
import HeatMap from '../HeatMap/HeatMap';
import Preloader from '../Preloader/Preloader';

const SECONDS_SINCE_LAST_POSITION_THRESHOLD = 45;

const lerp = (prevPos, nextPos, time) => {
  if (!prevPos) return null;
  if (!nextPos) return prevPos;
  const ratio = (nextPos.time - time) / (nextPos.time - prevPos.time);
  return {
    x: ratio * prevPos.x + (1 - ratio) * nextPos.x,
    y: ratio * prevPos.y + (1 - ratio) * nextPos.y,
  };
};

// The user icons:
const Avatar = React.memo(({ user }) => {
  const style = {
    transform: `scale(${Math.min(3, 1 / store.mapScale)})`,
  };
  if (user.imageURL) {
    style.backgroundImage = `url(${user.imageURL})`;
  } else {
    style.backgroundColor = user.color;
  }

  const maxFontSize = 22;
  const initialsFontSize = Math.min(maxFontSize / (user.initials.length * 0.7), maxFontSize);

  const userName = user.name ? user.name : `Unknown (${user.id})`;

  return (
    <div className="UserTag" style={style}>
      {!user.imageURL && (
        <span className="UserInitials" style={{ fontSize: `${initialsFontSize}px` }}>
          {user.initials}
        </span>
      )}
      <div className="UserName">{userName}</div>
    </div>
  );
});

// Generic tag component, currently only supports user-type tags
const Tag = ({ tag, x, y }) => (
  <div className="Tag" style={{ transform: `translate(${x}px, ${y}px)` }}>
    {_.get(tag, 'type') === 'user' && <Avatar user={{ ...tag, x, y }} />}
  </div>
);

class Map extends Component {
  constructor(props) {
    super(props);

    this.state = {
      currentPositions: {},
      visibleHeatMaps: {
        temperature: true,
        airpressure: false,
        humidity: false,
      },
      playing: false,
      timeMultiplier: 10,
    };

    _.forEach(sensorDataTables, (dataType) => {
      const currentKey = `current${_.capitalize(dataType)}`;
      this.state[currentKey] = {};
    });

    this.timeMultiplierOptions = [1, 10, 100, 1000, 5000];

    this.prevRafTime = null;

    autobind(this);
  }

  componentDidMount() {
    this.handleNewProps(this.props);
  }

  componentWillUpdate(nextProps) {
    this.handleNewProps(nextProps);
  }

  handleNewProps(props) {
    // Update current values when time changes
    if (props.seekbarStartTime !== this.props.seekbarStartTime) {
      const currentValues = this.getCurrentValues(props.seekbarStartTime, props);
      this.setState({
        ...currentValues,
        currentPositions: this.positionsAtTime(props.seekbarStartTime, props),
      });
    }
  }

  positionsAtTime(time, props = this.props) {
    return _.reduce(
      props.positions,
      (res, positions, tagId) => {
        const index = _.sortedIndexBy(positions, { time }, 'time');
        // not found
        if (index === 0) {
          res[tagId] = null;
          return res;
        }

        const prevPos = positions[index - 1];
        const nextPos = index < positions.length ? positions[index] : null;

        const secondsSinceLastPos = (time - _.get(prevPos, 'time', time)) / 1000;
        // too long since last position was received
        if (secondsSinceLastPos > SECONDS_SINCE_LAST_POSITION_THRESHOLD) {
          res[tagId] = null;
          return res;
        }

        // interpolate position
        res[tagId] = lerp(prevPos, nextPos, time);

        return res;
      },
      {},
    );
  }

  valueAtTime(key, time, props = this.props) {
    return _.reduce(
      props[key],
      (res, values, id) => {
        // The -1 because we want the previous one
        const index = _.sortedIndexBy(values, { time }, 'time') - 1;

        // not found, return first one
        if (index === -1) {
          res[id] = values[0];
          return res;
        }

        res[id] = values[index];
        return res;
      },
      {},
    );
  }

  getCurrentValues(time, props = this.props) {
    return _.reduce(
      sensorDataTables,
      (acc, key) => {
        acc[`current${_.capitalize(key)}`] = this.valueAtTime(key, time, props);
        return acc;
      },
      {},
    );
  }

  handleSeekBarChange(time) {
    if (store.isLive) {
      store.stopLive();
    }
    this.setCurrentTime(time);
  }

  setCurrentTime(time) {
    if (time > this.props.seekbarEndTime && !store.isLive) {
      this.stopPlaying();
    }
    const currentTime = Math.min(time, this.props.seekbarEndTime);
    const currentPositions = this.positionsAtTime(currentTime);
    const currentValues = this.getCurrentValues(currentTime);
    store.seekbarCurrentTime = currentTime;
    this.setState({ ...currentValues, currentPositions });
  }

  togglePlaying() {
    if (!this.state.playing) {
      this.startPlaying();
    } else {
      this.stopPlaying();
    }
  }

  step(rafTime) {
    let deltaTime = 16;
    if (this.prevRafTime) {
      deltaTime = _.floor(rafTime - this.prevRafTime);
    }

    this.prevRafTime = rafTime;
    this.setCurrentTime(this.props.seekbarCurrentTime + deltaTime * this.state.timeMultiplier);

    if (this.state.playing) {
      requestAnimationFrame(this.step);
    }
  }

  startPlaying() {
    this.prevRafTime = null;
    requestAnimationFrame(this.step);

    this.setState({ playing: true });
  }

  stopPlaying() {
    if (store.isLive) {
      store.stopLive();
    }
    this.prevRafTime = null;
    this.setState({ playing: false });
  }

  handleTimeMultiplierChange(event) {
    const timeMultiplier = parseInt(event.target.value);
    this.setState({ timeMultiplier });
  }

  setDate(day) {
    store.selectedDate = dfn.format(day, 'YYYY-MM-DD');
    store.loadDataForSelectedDate();
  }

  async goLive() {
    this.stopPlaying();
    this.setState({ timeMultiplier: 1 });
    await store.goLive();
    this.startPlaying();
  }

  renderHeatMaps() {
    return (
      <>
        {this.state.visibleHeatMaps.temperature && (
          <HeatMap values={this.state.currentTemperature} label="°C" gradient={{ '.5': '#00FF00' }} />
        )}
        {this.state.visibleHeatMaps.airpressure && (
          <HeatMap values={this.state.currentAirpressure} label="mbar" gradient={{ '.5': '#8b8681' }} />
        )}
        {this.state.visibleHeatMaps.humidity && (
          <HeatMap
            values={this.state.currentHumidity}
            label="%"
            transformValue={(val) => val * 100}
            gradient={{ '.5': '#3db1ff' }}
          />
        )}
      </>
    );
  }

  render() {
    const mapWidth = store.mapSize.width;
    const mapHeight = store.mapSize.height;

    // Use average illuminance to set the backgound brightness
    const currentMeanIlluminance = _.mean(_.map(this.state.currentIlluminance, 'value')) || 0;
    const illuminanceVal = _.clamp(currentMeanIlluminance / store.meanIlluminance, 0.1, 1);

    const transitionSpeed = _.max([2000 / this.state.timeMultiplier, 96]);

    const dayPickerProps = {
      firstDayOfWeek: 1,
      disabledDays: (date) =>
        dfn.isBefore(date, dfn.startOfDay(store.minDate)) || dfn.isAfter(date, dfn.endOfDay(store.maxDate)),
      todayButton: 'Go to Today',
      fromMonth: store.minDate,
      toMonth: new Date(),
    };

    return (
      <div>
        <div
          className="MapContainer"
          style={{
            backgroundColor: `rgba(0, 0, 40, ${1 - illuminanceVal})`,
            transition: `background-color ${transitionSpeed}ms linear`,
          }}
        >
          {store.loadingData && <Preloader />}
          <ZoomPan>
            <div
              className="MapImage"
              style={{
                width: mapWidth,
                height: mapHeight,
                backgroundSize: `${mapWidth}px ${mapHeight}px`,
                left: `calc(50% - ${mapWidth / 2}px)`,
                top: `calc(50% - ${mapHeight / 1.8}px)`,
                transform: `scale(${store.mapScale})`,
              }}
              onClick={(event) => {
                // Log coords of click for debug purposes
                const pos = {
                  x: event.nativeEvent.offsetX,
                  y: event.nativeEvent.offsetY,
                };
                console.log(pos, ' - raw:', pixelPosToRawPos(pos.x, pos.y));
              }}
            >
              {!this.props.loadingData && (
                <React.Fragment>
                  {this.renderHeatMaps()}
                  {_.map(this.state.currentPositions, (pos, tagId) =>
                    pos ? <Tag key={tagId} tag={store.getTag(tagId)} x={pos.x} y={pos.y} /> : null,
                  )}
                </React.Fragment>
              )}
            </div>
          </ZoomPan>
        </div>
        <div className="TopRightControl">
          <div className="LiveControl">
            {store.isLive ? (
              <div className="LiveIndicator">
                <div className="LiveIndicatorCircle" />
                LIVE
              </div>
            ) : (
              <button className="GoLiveButton" onClick={this.goLive}>
                Go live
              </button>
            )}
          </div>
          <DayPickerInput
            value={this.props.selectedDate || ''}
            onDayChange={this.setDate}
            dayPickerProps={dayPickerProps}
          />
          <FaCalendarAlt />
        </div>
        <div className="ControlPanel">
          <button className="PlayButton" onClick={this.togglePlaying} disabled={store.loadingData}>
            {this.state.playing ? <MdPause /> : <MdPlayArrow />}
          </button>
          <select
            className="TimeMultiplierSelect"
            value={this.state.timeMultiplier}
            onChange={this.handleTimeMultiplierChange}
            disabled={store.loadingData || store.isLive}
          >
            {_.map(this.timeMultiplierOptions, (multiplier) => (
              <option key={multiplier} value={multiplier}>
                {multiplier}x
              </option>
            ))}
          </select>
          <div className="SeekbarContainer">
            <Seekbar
              disabled={store.loadingData}
              setTime={this.handleSeekBarChange}
              start={this.props.seekbarStartTime}
              end={this.props.seekbarEndTime}
              currentTime={this.props.seekbarCurrentTime}
            />
          </div>
          <div className="CurrentTime">{dfn.format(new Date(this.props.seekbarCurrentTime), 'HH:mm:ss')}</div>
          <div className="VisibilityToggles">
            {_.map(this.state.visibleHeatMaps, (isVisible, key) => (
              <div key={key} className="VisibilityToggle">
                <input
                  id={key}
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => {
                    this.setState((oldState) => {
                      const visibleHeatMaps = { ...oldState.visibleHeatMaps, [key]: !isVisible };
                      return { visibleHeatMaps };
                    });
                  }}
                />
                <label htmlFor={key}>{_.capitalize(key)}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

const propsFromStore = {
  positions: 'positions',
  selectedDate: 'selectedDate',
  seekbarStartTime: 'seekbarStartTime',
  seekbarEndTime: 'seekbarEndTime',
  seekbarCurrentTime: 'seekbarCurrentTime',
};

_.forEach(sensorDataTables, (dataType) => (propsFromStore[dataType] = dataType));

export default extractPropsFromStores(propsFromStore)(observer(Map));
