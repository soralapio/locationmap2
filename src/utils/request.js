import axios from 'axios';
import qs from 'qs';
import _ from 'lodash';

import store from '../stores';

const client = axios.create({
  baseURL: '/map/',
  timeout: 30 * 1000, // 30 seconds
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
});

// noop for now
const handleSuccess = (response) => response;

const handleError = async (error) => {
  const errorStatus = _.get(error, 'response.status');
  if (errorStatus === 401) {
    store.loggedIn = false;
  }

  throw error;
};

client.interceptors.response.use(handleSuccess, handleError);

export default client;
