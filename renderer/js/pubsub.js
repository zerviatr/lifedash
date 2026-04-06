// ============ PUBSUB EVENT SYSTEM ============
const PubSub = {
  _events: {},

  subscribe(event, callback) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return () => {
      this._events[event] = this._events[event].filter(cb => cb !== callback);
    };
  },

  publish(event, data) {
    if (!this._events[event]) return;
    this._events[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`PubSub error [${event}]:`, e); }
    });
  },

  clear(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
  }
};
