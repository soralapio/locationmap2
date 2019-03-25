import React, { Component } from 'react';
import _ from 'lodash';
import dfn from 'date-fns';
import autobind from 'auto-bind';
import './Map.css';

import ZoomPan from '../ZoomPan/ZoomPan';

import { extractPropsFromStores } from '../../utils';
import store from '../../stores';

const SECONDS_SINCE_LAST_POSITION_THRESHOLD = 45;

// binary search, positions are sorted
const findPositionIndexAtTime = (positions, time) => {
  if (_.first(positions).time > time) return null;
  if (_.last(positions).time <= time) return _.last(positions);

  let min = 0;
  let max = positions.length - 1;
  while (true) {
    const idx = _.floor((min + max) / 2);
    const pos = positions[idx];
    const nextPos = positions[idx + 1];
    if (pos.time <= time && nextPos.time > time) {
      return idx;
    } else if (pos.time <= time) {
      min = idx + 1;
    } else {
      max = idx - 1;
    }
  }
};

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
    }}
  >
    <div className="PersonName">{_.get(person, 'fullName', _.get(person, 'id', 'unk'))}</div>
  </div>
));

const Tag = ({ tag, x, y }) => (
  <div className="Tag" style={{ transform: `translate(${x}px, ${y}px)` }}>
    {_.get(tag, 'type') === 'person' && <Avatar person={tag} />}
  </div>
);

class Map extends Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTime: 0,
      startTime: 0,
      endTime: 0,
      currentPositions: [],
      playing: false,
      timeMultiplier: 10,
    };

    this.timeMultiplierOptions = [1, 10, 100, 1000];

    this.prevRafTime = null;

    autobind(this);
  }

  componentDidMount() {
    this.handleNewPositions(this.props);
  }

  componentWillUpdate(nextProps) {
    this.handleNewPositions(nextProps);
  }

  handleNewPositions(props) {
    const minTime = _.min(_.map(props.positions, (positions) => _.first(positions).time));
    const maxTime = _.max(_.map(props.positions, (positions) => _.last(positions).time));

    if (minTime && maxTime && (minTime !== this.state.startTime || maxTime !== this.state.endTime)) {
      this.setState({
        currentTime: minTime,
        startTime: minTime,
        endTime: maxTime,
        currentPositions: this.positionsAtTime(minTime, props),
      });
    }
  }

  positionsAtTime(time, props = this.props) {
    return _.reduce(
      props.positions,
      (res, positions, tagId) => {
        const index = findPositionIndexAtTime(positions, time);

        // not found
        if (index === null) {
          res[tagId] = null;
          return res;
        }

        const prevPos = positions[index];
        const nextPos = positions[index + 1];

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

  setCurrentTime(time) {
    const currentTime = time > this.state.endTime ? this.state.startTime : time;
    const currentPositions = this.positionsAtTime(currentTime);
    this.setState({ currentPositions, currentTime });
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
    //console.log(JSON.parse(JSON.stringify(this.props.positions || null)));
    return (
      <div>
        <div className="MapContainer">
          <ZoomPan>
            <div
              className="MapImage"
              style={{
                width: mapWidth,
                height: mapHeight,
                backgroundSize: `${mapWidth}px ${mapHeight}px`,
                left: `calc(50% - ${mapWidth / 2}px)`,
                top: `calc(50% - ${mapHeight / 1.5}px)`,
              }}
              onClick={(event) => {
                console.log(event.pageX - event.target.offsetLeft, event.pageY - event.target.offsetTop);
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
          <select className="DateSelector" value={this.props.selectedDate} onChange={this.handleDateChange}>
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
  selectedDate: 'selectedDate',
};

export default extractPropsFromStores(propsFromStore)(Map);
