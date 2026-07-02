class AsyncStorageMock {
  constructor() {
    this.store = new Map();
  }

  getItem = async (key) => {
    return this.store.get(key) ?? null;
  };

  setItem = async (key, value) => {
    this.store.set(key, value);
  };

  removeItem = async (key) => {
    this.store.delete(key);
  };

  clear = async () => {
    this.store.clear();
  };

  getAllKeys = async () => {
    return Array.from(this.store.keys());
  };

  getMany = async (keys) => {
    return keys.reduce((result, key) => {
      result[key] = this.store.get(key) ?? null;
      return result;
    }, {});
  };

  setMany = async (entries) => {
    for (const [key, value] of Object.entries(entries)) {
      this.store.set(key, value);
    }
  };

  removeMany = async (keys) => {
    for (const key of keys) {
      this.store.delete(key);
    }
  };
}

export default new AsyncStorageMock();
