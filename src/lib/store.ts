type StoreListener<T> = (data: T) => void;

export class Store<Data, Action> {
  current: Data;
  reducer: (data: Data, action: Action) => Data;
  #listeners = new Set<StoreListener<Data>>();
  id = 0;

  constructor({
    initial,
    reducer,
  }: {
    initial: Data;
    reducer: (data: Data, action: Action) => Data;
  }) {
    this.current = initial;
    this.reducer = reducer;
    this.id = ++Store.idgen;
  }

  dispatch(action: Action) {
    this.current = this.reducer(this.current, action);
    for (const fn of this.#listeners) {
      fn(this.current);
    }
  }

  replace(newData: Data) {
    this.current = newData;
    for (const fn of this.#listeners) {
      fn(this.current);
    }
  }

  on(fn: StoreListener<Data>) {
    this.#listeners.add(fn);
  }
  off(fn: StoreListener<Data>) {
    this.#listeners.delete(fn);
  }

  static idgen = 0;
}
