
'use client';

/**
 * @fileOverview A simple, browser-safe event emitter to avoid Node.js 'events' dependency
 * in client components.
 */

type ErrorListener = (error: any) => void;

class SimpleEventEmitter {
  private listeners: Record<string, ErrorListener[]> = {};

  on(event: string, listener: ErrorListener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return () => this.off(event, listener);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => listener(data));
    }
  }

  off(event: string, listener: ErrorListener) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
    }
  }
}

export const errorEmitter = new SimpleEventEmitter();
