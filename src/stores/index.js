import Store from './Store';

const store = new Store();

async function initStore() {
  await store.loadDateRange();
  store.loadData();
}

initStore();

export default store;
