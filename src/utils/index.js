import { observer } from 'mobx-react';
import React from 'react';
import _ from 'lodash';

import store from '../stores/';

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
