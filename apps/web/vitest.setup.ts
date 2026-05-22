// Node 25 ships a partial native `globalThis.localStorage` stub (an empty
// object with no `.clear`, `.getItem`, etc.). jsdom 29 detects it and
// defers to it instead of installing its own. Replace it with a working
// in-memory implementation before tests run.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

function installStorage(name: 'localStorage' | 'sessionStorage'): void {
  const storage = new MemoryStorage();
  const descriptor: PropertyDescriptor = {
    value: storage,
    writable: true,
    configurable: true,
  };
  Object.defineProperty(globalThis, name, descriptor);
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, name, descriptor);
  }
}

installStorage('localStorage');
installStorage('sessionStorage');
