import Store from './Store';

const store = new Store();

async function initStore() {
  await store.checkLogin();
}

initStore();

export default store;
