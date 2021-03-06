import { observer } from 'mobx-react';
import React from 'react';
import _ from 'lodash';

import store from '../stores/';

export const mapToRange = (val, inMin, inMax, outMin, outMax) =>
  ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

// TODO: these need to come from some sort of config:
// Use these database coordinates to map to the pixel values below
const rawBounds = {
  minX: 6.71831,
  maxX: 30.94366,
  minY: 14.33607,
  maxY: 6.5164, // y seems to be flipped, so maxY < minY
};

// Use these pixel values to map to the raw database values above
const pixBounds = {
  minX: 64,
  maxX: 1981,
  minY: 82,
  maxY: 692,
};

// Convert raw database coordinates to pixel values
export const rawPosToPixelPos = (rawX, rawY) => ({
  x: mapToRange(rawX, rawBounds.minX, rawBounds.maxX, pixBounds.minX, pixBounds.maxX),
  y: mapToRange(rawY, rawBounds.minY, rawBounds.maxY, pixBounds.minY, pixBounds.maxY),
});

// Convert pixel coordinates to raw database values
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

// Convert mouse "screen" x-position to an x-position inside a DOM element
export const getMouseXInElement = (mouseX, element) => {
  let left = 0;
  try {
    left = element.getBoundingClientRect().left;
  } catch (error) {
    /* noop */
  }
  return mouseX - left;
};

/**
 * Seedable pseudorandom number generator
 * Can be seeded with whatever, seed is converted to number
 * If no seed is provided, returns Math.random()
 * @param seed
 * @returns {number}
 */
export const sRandom = (seed) => {
  if (_.isNil(seed)) return Math.random();
  /* Force seed to string and calculate hashcode */
  const seedStr = JSON.stringify(seed);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    const c = seedStr.charCodeAt(i);
    hash = (hash << 5) - hash + c;
  }

  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
};
