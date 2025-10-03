declare global {
  interface ExtendableEvent extends Event {
    waitUntil(fn: Promise<any>): void;
  }

  interface FetchEvent extends Event {
    request: Request;
    respondWith(response: Promise<Response> | Response): Promise<Response>;
  }

  interface SyncEvent extends Event {
    tag: string;
    waitUntil(fn: Promise<any>): void;
  }

  interface WindowEventMap {
    install: ExtendableEvent;
    activate: ExtendableEvent;
    fetch: FetchEvent;
    sync: SyncEvent;
  }

  interface ServiceWorkerGlobalScope {
    skipWaiting(): Promise<void>;
    clients: Clients;
    addEventListener(
      type: keyof WindowEventMap,
      listener: (event: WindowEventMap[keyof WindowEventMap]) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
  }

  interface Collection {
    id: string;
    [key: string]: any;
  }

  var self: ServiceWorkerGlobalScope;
}

export {};