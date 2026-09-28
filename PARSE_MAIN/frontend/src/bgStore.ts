export const bgStore = {
  progress: 0,
  isDiving: false,
  listeners: new Set<() => void>(),
  _snapshot: { progress: 0, isDiving: false },
  set(progress: number, isDiving: boolean) {
    if (this.progress === progress && this.isDiving === isDiving) return;
    this.progress = progress;
    this.isDiving = isDiving;
    this._snapshot = { progress, isDiving };
    this.listeners.forEach(l => l());
  },
  setProgress(progress: number) {
    if (this.progress === progress) return;
    this.progress = progress;
    this._snapshot = { ...this._snapshot, progress };
    this.listeners.forEach(l => l());
  },
  setIsDiving(isDiving: boolean) {
    if (this.isDiving === isDiving) return;
    this.isDiving = isDiving;
    this._snapshot = { ...this._snapshot, isDiving };
    this.listeners.forEach(l => l());
  },
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  },
  getSnapshot() {
    return this._snapshot;
  }
};
