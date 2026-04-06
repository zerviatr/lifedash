// Simple Pub/Sub (Observer) Pattern for Global State Management
const PubSub = {
  events: {},
  
  subscribe(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    
    // Return an unsubscribe function
    return () => this.unsubscribe(event, listener);
  },
  
  unsubscribe(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  },
  
  publish(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(data));
  }
};

window.PubSub = PubSub;
