export class IdSet<T = Function> {
  #idNum = 0;
  #data = new Map<T, number>();
  constructor() {}

  get(key: T): number | null {
    return this.#data.get(key) || null;
  }

  add(key: T): number {
    if (this.#data.has(key)) {
      return this.#data.get(key)!;
    }
    const id = ++this.#idNum;
    this.#data.set(key, id);
    return id;
  }
}
