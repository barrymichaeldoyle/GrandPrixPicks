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

// These tests drive React directly (`createRoot` + `act`) rather than through
// Testing Library, which would set this flag itself. Without it React logs
// "The current testing environment is not configured to support act(...)" for
// every render, and — more to the point — stops treating `act` as a boundary
// that flushes effects, so an assertion can run against a half-updated tree.
//
// It lives here rather than in each test file because it was in each test
// file: 32 of them set it by hand, three did not, and the three that did not
// were the ones printing the warning. Setting it once for the whole run means
// a new test file cannot forget it.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
