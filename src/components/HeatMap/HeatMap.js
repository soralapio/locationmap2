import React, { Component } from 'react';
import _ from 'lodash';
import autobind from 'auto-bind';
import h337 from 'heatmapjs';
import './HeatMap.scss';

import store from '../../stores';

export default class HeatMap extends Component {
  constructor(props) {
    super(props);

    autobind(this);
    this.containerElement = React.createRef();
    this.heatmap = null;
  }

  static defaultProps = {
    label: '',
    transformValue: (val) => val,
  };

  componentDidMount() {
    // Create heatmap object
    const config = {
      radius: 500,
      maxOpacity: 0.4,
      minOpacity: 0,
      blur: 0.9,
      container: this.containerElement.current,
    };
    if (this.props.gradient) {
      config.gradient = this.props.gradient;
    }
    this.heatmap = h337.create(config);

    this.heatmap.setData({
      min: 0,
      max: 300,
      data: this.getDataWithTags(),
    });
  }

  componentWillReceiveProps(nextProps) {
    // Update heatmap data only if values have actually changed
    const oldValues = _.map(this.props.values, 'value');
    const newValues = _.map(nextProps.values, 'value');

    if (!_.isEqual(oldValues, newValues)) {
      this.heatmap.setData({
        min: 0,
        max: 300,
        data: this.getDataWithTags(),
      });
    }
  }

  getDataWithTags() {
    return _.compact(
      _.map(this.props.values, (value) => {
        if (!value) return null;
        const tag = store.tags[value.id];
        return { ...tag, value };
      }),
    );
  }

  render() {
    console.log(JSON.stringify(this.props.values));
    return (
      <div className="HeatMap">
        <div className="HeatContainer" ref={this.containerElement} />
        {_.map(this.props.values, (value) => {
          if (!value) return null;
          const tag = store.tags[value.id];
          //console.log(JSON.stringify(tag));
          //if a tag does not exist for a reading (x and y coordinate) we avoid crashing here
          if(!tag) return null;
          return (
            <div key={value.id} style={{ transform: `translate(${tag.x}px, ${tag.y}px)` }} className="HeatValue">
              {_.round(this.props.transformValue(value.value), 2)} {this.props.label}
            </div>
          );
        })}
      </div>
    );
  }
}
