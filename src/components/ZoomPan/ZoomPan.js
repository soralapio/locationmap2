import React, { Component } from 'react';
import _ from 'lodash';
import autobind from 'auto-bind';
import './ZoomPan.css';

class ZoomPan extends Component {
  constructor(props) {
    super(props);

    this.state = {
      x: 0,
      y: 0,
      z: 1,
      isMousePressed: false,
      mouseX: null,
      mouseY: null,
    };

    this.zoomMultiplier = 1.3;
    this.minZ = 0.3;
    this.maxZ = 3;

    autobind(this);
  }

  componentDidMount() {
    document.addEventListener('mouseup', this.handleMapMouseUp);
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.handleMapMouseUp);
  }

  getStyle(state = this.state) {
    const { x, y, z } = state;
    const transform = `translate(${x}px, ${y}px) scale(${z})`;

    // No transition when panning, only on zoom:
    const transition = !this.state.isMousePressed ? 'transform 300ms ease-in-out' : null;

    return {
      transform,
      transition,
    };
  }

  handleZoomInClick() {
    this.setState((oldState) => ({ z: _.min([oldState.z * this.zoomMultiplier, this.maxZ]) }));
  }
  handleZoomOutClick() {
    this.setState((oldState) => ({ z: _.max([oldState.z / this.zoomMultiplier, this.minZ]) }));
  }

  handleMapMouseDown(event) {
    this.setState({ isMousePressed: true, mouseX: event.pageX, mouseY: event.pageY });
  }

  handleMapMouseMove(event) {
    if (!this.state.isMousePressed) return;
    const mouseX = event.pageX;
    const mouseY = event.pageY;
    this.setState((oldState) => {
      const deltaX = mouseX - oldState.mouseX;
      const deltaY = mouseY - oldState.mouseY;
      return {
        mouseX,
        mouseY,
        x: oldState.x + deltaX,
        y: oldState.y + deltaY,
      };
    });
  }

  handleMapMouseUp() {
    this.setState({ isMousePressed: false });
  }

  render() {
    const style = this.getStyle();
    return (
      <div
        className="ZoomPanContainer"
        onMouseDown={this.handleMapMouseDown}
        onMouseMove={this.handleMapMouseMove}
        onMouseUp={this.handleMapMouseUp}
        onDoubleClick={this.handleZoomInClick}
      >
        <div className="ZoomPanPlane" style={style}>
          {this.props.children}
        </div>
        <div className="ZoomControls">
          <button className="ZoomInButton" onClick={this.handleZoomInClick}>
            +
          </button>
          <button className="ZoomOutButton" onClick={this.handleZoomOutClick}>
            -
          </button>
        </div>
      </div>
    );
  }
}

export default ZoomPan;
