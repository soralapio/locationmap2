import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import autobind from 'auto-bind';

import './Seekbar.css';
import { getMouseXInElement, mapToRange } from '../../utils';

export default class Seekbar extends React.Component {
  static propTypes = {
    setTime: PropTypes.func.isRequired,
    start: PropTypes.number.isRequired,
    end: PropTypes.number.isRequired,
    currentTime: PropTypes.number.isRequired,
    disabled: PropTypes.bool,
  };

  static defaultProps = {
    disabled: false,
  };

  constructor(props) {
    super(props);
    autobind(this);

    this.seekbarElement = React.createRef();
    this.keyDownCount = 1;
    this.previousPressedKey = null;
  }

  handleMouseMove(event) {
    const { start, end, setTime } = this.props;

    const mouseX = getMouseXInElement(event.pageX, this.seekbarElement.current);

    const width = this.seekbarElement.current.offsetWidth;

    const value = mapToRange(mouseX, 0, width, start, end);

    const clampedValue = Math.floor(_.clamp(value, start, end));

    setTime(clampedValue);
  }

  handleMouseUp(event) {
    this.handleMouseMove(event);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  handleMouseDown() {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  handleKeyDown(event) {
    const pressedRight = event.key === 'ArrowRight';
    const pressedLeft = event.key === 'ArrowLeft';
    if (pressedRight || pressedLeft) {
      if (event.key !== this.previousPressedKey) {
        this.keyDownCount = 1;
      }
      event.preventDefault();
      const direction = pressedRight ? 1000 : -1000;
      this.keyDownCount += 1;
      const speedMultiplier = Math.log2(this.keyDownCount) ** 3;
      const delta = _.round(speedMultiplier * direction);
      this.props.setTime(this.props.currentTime + delta);
      this.previousPressedKey = event.key;
    }
  }

  handleKeyUp(event) {
    const letGoRight = event.key === 'ArrowRight';
    const letGoLeft = event.key === 'ArrowLeft';
    if (letGoRight || letGoLeft) {
      this.keyDownCount = 1;
      this.previousPressedKey = null;
    }
  }

  render() {
    const { start, end, currentTime, disabled } = this.props;

    const progress = (currentTime - start) / (end - start);
    const handleX = _.get(this.seekbarElement, 'current.offsetWidth', 0) * progress;
    return (
      <div
        className={cx('Seekbar', { disabled })}
        onMouseDown={this.handleMouseDown}
        ref={this.seekbarElement}
        tabIndex={0}
        onKeyDown={this.handleKeyDown}
        onKeyUp={this.handleKeyUp}
      >
        <div className="SeekbarBar" />
        <div className="SeekbarBar SeekbarProgress" style={{ transform: `scaleX(${progress})` }} />
        <div className="SeekbarHandle" style={{ transform: `translateX(${handleX}px)` }} />
      </div>
    );
  }
}
