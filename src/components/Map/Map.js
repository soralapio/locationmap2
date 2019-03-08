import React, { Component } from 'react';
import _ from 'lodash';
import dfn from 'date-fns';
import autobind from 'auto-bind';
import './Map.css';

import { tags, positionsByTag, mapWidth, mapHeight } from '../../stores/data';

// binary search, positions are sorted
const findPositionIndexAtTime = (positions, time) => {
  if (_.first(positions).timestamp > time) return null;
  if (_.last(positions).timestamp <= time) return _.last(positions);

  let min = 0;
  let max = positions.length - 1;
  while (true) {
    const idx = _.floor((min + max) / 2);
    const pos = positions[idx];
    const nextPos = positions[idx + 1];
    if (pos.timestamp <= time && nextPos.timestamp > time) {
      return idx;
    } else if (pos.timestamp <= time) {
      min = idx + 1;
    } else {
      max = idx - 1;
    }
  }
};

const lerp = (prevPos, nextPos, time) => {
  if (!prevPos) return null;
  if (!nextPos) return prevPos;
  const ratio = (nextPos.timestamp - time) / (nextPos.timestamp - prevPos.timestamp);
  return {
    x: ratio * prevPos.x + (1 - ratio) * nextPos.x,
    y: ratio * prevPos.y + (1 - ratio) * nextPos.y,
  };
};

const Tag = ({ tag, x, y }) => (
  <div className="Tag" style={{ backgroundColor: tag.color, transform: `translate(${x}px, ${y}px)` }} />
);

class Map extends Component {
  constructor(props) {
    super(props);

    const minTime = _.min(_.map(positionsByTag, (positions) => _.first(positions).timestamp));
    const maxTime = _.max(_.map(positionsByTag, (positions) => _.last(positions).timestamp));

    this.state = {
      currentTime: minTime,
      startTime: minTime,
      endTime: maxTime,
      currentPositions: this.positionsAtTime(minTime),
      playing: false,
      timeMultiplier: 10,
    };

    this.timeMultiplierOptions = [1, 10, 100, 1000];

    this.prevRafTime = null;

    autobind(this);
  }

  positionsAtTime(time) {
    return _.reduce(
      positionsByTag,
      (res, positions, tagName) => {
        const index = findPositionIndexAtTime(positions, time);
        if (index === null) {
          res[tagName] = null;
          return res;
        }

        const prevPos = positions[index];
        const nextPos = positions[index + 1];
        res[tagName] = lerp(prevPos, nextPos, time);

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

  render() {
    return (
      <div>
        <div
          className="MapImage"
          style={{ width: mapWidth, height: mapHeight, backgroundSize: `${mapWidth}px ${mapHeight}px` }}
          onClick={(event) => {
            console.log(event.pageX - event.target.offsetLeft, event.pageY - event.target.offsetTop);
          }}
        >
          {_.map(this.state.currentPositions, (pos, tagName) =>
            pos ? <Tag key={tagName} tag={tags[tagName]} x={pos.x} y={pos.y} /> : null,
          )}
          <div className="TagCount">Tags on map: {_.compact(_.values(this.state.currentPositions)).length}</div>
        </div>
        <input
          className="TimeSlider"
          type="range"
          value={this.state.currentTime}
          min={this.state.startTime}
          max={this.state.endTime}
          onChange={this.handleTimeSliderChange}
        />
        <div>
          <span className="CurrentTime">{dfn.format(new Date(this.state.currentTime), 'HH:mm:ss')}</span>
          <select value={this.state.timeMultiplier} onChange={this.handleTimeMultiplierChange}>
            {_.map(this.timeMultiplierOptions, (multiplier) => (
              <option key={multiplier} value={multiplier}>
                {multiplier}x
              </option>
            ))}
          </select>
          <button onClick={this.togglePlaying}>{this.state.playing ? 'pause' : 'play'}</button>
        </div>
      </div>
    );
  }
}

export default Map;
