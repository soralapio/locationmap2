import { observer } from 'mobx-react';
import React from 'react';
import _ from 'lodash';

import store from '../stores/';

export const mapToRange = (val, inMin, inMax, outMin, outMax) =>
  ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

// TODO: these need to come from some sort of config:
const rawBounds = {
  minX: 5,
  maxX: 32,
  minY: 15,
  maxY: 6, // y seems to be flipped, so maxY < minY
};

const pixBounds = {
  minX: 64,
  maxX: 1981,
  minY: 82,
  maxY: 692,
};

export const rawPosToPixelPos = (rawX, rawY) => ({
  x: mapToRange(rawX, rawBounds.minX, rawBounds.maxX, pixBounds.minX, pixBounds.maxX),
  y: mapToRange(rawY, rawBounds.minY, rawBounds.maxY, pixBounds.minY, pixBounds.maxY),
});

export const pixelPosToRawPos = (pixelX, pixelY) => ({
  x: mapToRange(pixelX, pixBounds.minX, pixBounds.maxX, rawBounds.minX, rawBounds.maxX),
  y: mapToRange(pixelY, pixBounds.minY, pixBounds.maxY, rawBounds.minY, rawBounds.maxY),
});

// Make WrappedComponent an observer, and extract some props from store as defined by propsFromStore
// This way we can rely on componentWillReceiveProps to be triggered on the extracted props
export const extractPropsFromStores = (propsFromStore) => (WrappedComponent) =>
  observer((props) => {
    const extractedProps = _.reduce(
      propsFromStore,
      (result, storeKey, propName) => {
        result[propName] = _.get(store, storeKey);
        return result;
      },
      {},
    );
    return <WrappedComponent {...props} {...extractedProps} />;
  });
