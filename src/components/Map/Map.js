import React, { Component } from 'react';
import _ from 'lodash';
import dfn from 'date-fns';
import autobind from 'auto-bind';
import './Map.css';

import ZoomPan from '../ZoomPan/ZoomPan';

import { extractPropsFromStores } from '../../utils';
import store from '../../stores';

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

const Avatar = React.memo(({ person }) => (
  <div
    className="PersonTag"
    style={{
      backgroundImage: `url(${_.get(person, 'avatarURL', `https://api.adorable.io/avatars/150/${person.id}.png`)})`,
      transform: `scale(${1 / store.mapScale})`,
    }}
  >
    <div className="PersonName">{_.get(person, 'fullName', _.get(person, 'id', 'unk'))}</div>
  </div>
));

const Tag = ({ tag, x, y }) => (
  <div className="Tag" style={{ transform: `translate(${x}px, ${y}px)` }}>
    {_.get(tag, 'type') === 'person' && <Avatar person={{ ...tag, x, y }} />}
  </div>
);

class Map extends Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTime: 0,
      startTime: 0,
      endTime: 0,
      currentPositions: {},
      currentIlluminance: {},
      playing: false,
      timeMultiplier: 10,
    };

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
    const minTime = _.min(_.map(props.positions, (positions) => _.first(positions).time));
    const maxTime = _.max(_.map(props.positions, (positions) => _.last(positions).time));

    if (minTime && maxTime && (minTime !== this.state.startTime || maxTime !== this.state.endTime)) {
      this.setState({
        currentTime: minTime,
        startTime: minTime,
        endTime: maxTime,
        currentPositions: this.positionsAtTime(minTime, props),
        currentIlluminance: this.illuminanceAtTime(minTime, props),
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

  illuminanceAtTime(time, props = this.props) {
    return _.reduce(
      props.illuminance,
      (res, values, id) => {
        const index = _.sortedIndexBy(values, { time }, 'time');

        // not found
        if (index === 0) {
          res[id] = null;
          return res;
        }

        res[id] = values[index - 1];
        return res;
      },
      {},
    );
  }

  setCurrentTime(time) {
    const currentTime = time > this.state.endTime ? this.state.startTime : time;
    const currentPositions = this.positionsAtTime(currentTime);
    const currentIlluminance = this.illuminanceAtTime(currentTime);
    this.setState({ currentPositions, currentIlluminance, currentTime });
  }

  handleTimeSliderChange(event) {
    const currentTime = parseInt(event.target.value, 10);

    this.setCurrentTime(currentTime);
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
    this.setCurrentTime(this.state.currentTime + deltaTime * this.state.timeMultiplier);

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
    this.prevRafTime = null;
    this.setState({ playing: false });
  }

  handleTimeMultiplierChange(event) {
    const timeMultiplier = parseInt(event.target.value);
    this.setState({ timeMultiplier });
  }

  handleDateChange(event) {
    store.selectedDate = event.target.value;
    store.loadData();
  }

  render() {
    const mapWidth = store.mapSize.width;
    const mapHeight = store.mapSize.height;

    const currentMeanIlluminance = _.mean(_.map(this.state.currentIlluminance, 'value')) || 0;
    const illuminanceVal = _.clamp(currentMeanIlluminance / store.meanIlluminance, 0.1, 1);
    const transitionSpeed = _.max([2000 / this.state.timeMultiplier, 96]);

    return (
      <div>
        <div
          className="MapContainer"
          style={{
            backgroundColor: `rgba(0, 0, 40, ${1 - illuminanceVal})`,
            transition: `background-color ${transitionSpeed}ms linear`,
          }}
        >
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
                const rect = event.target.getBoundingClientRect();
                console.log(event.pageX - rect.left, event.pageY - rect.top);
              }}
            >
              {_.map(this.state.currentPositions, (pos, tagId) =>
                pos ? <Tag key={tagId} tag={store.tags[tagId]} x={pos.x} y={pos.y} /> : null,
              )}
            </div>
          </ZoomPan>
        </div>
        <div className="ControlPanel">
          <div className="TagCount">Tags on map: {_.compact(_.values(this.state.currentPositions)).length}</div>
          <button className="PlayButton " onClick={this.togglePlaying}>
            {this.state.playing ? '❚❚' : '▶'}
          </button>
          <input
            className="TimeSlider"
            type="range"
            value={this.state.currentTime}
            min={this.state.startTime}
            max={this.state.endTime}
            onChange={this.handleTimeSliderChange}
          />
          <div className="CurrentTime">{dfn.format(new Date(this.state.currentTime), 'HH:mm:ss')}</div>
          <select value={this.state.timeMultiplier} onChange={this.handleTimeMultiplierChange}>
            {_.map(this.timeMultiplierOptions, (multiplier) => (
              <option key={multiplier} value={multiplier}>
                {multiplier}x
              </option>
            ))}
          </select>
          <select className="DateSelector" value={this.props.selectedDate || ''} onChange={this.handleDateChange}>
            {_.map(store.availableDates, (date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
}

const propsFromStore = {
  positions: 'positions',
  illuminance: 'illuminance',
  selectedDate: 'selectedDate',
};

export default extractPropsFromStores(propsFromStore)(Map);
