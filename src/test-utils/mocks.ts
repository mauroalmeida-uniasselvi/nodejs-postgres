export type SpyCall = { args: unknown[] };

export interface SpyFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  calls: SpyCall[];
}

export function createSpy<TArgs extends unknown[] = unknown[], TReturn = unknown>(
  implementation?: (...args: TArgs) => TReturn
): SpyFunction<TArgs, TReturn> {
  const spy = ((...args: TArgs) => {
    spy.calls.push({ args });
    if (implementation) {
      return implementation(...args);
    }
    return undefined as TReturn;
  }) as SpyFunction<TArgs, TReturn>;

  spy.calls = [];
  return spy;
}

export function createAsyncSpy<TArgs extends unknown[] = unknown[], TReturn = unknown>(
  implementation?: (...args: TArgs) => Promise<TReturn>
): SpyFunction<TArgs, Promise<TReturn>> {
  const spy = (async (...args: TArgs) => {
    spy.calls.push({ args });
    if (implementation) {
      return implementation(...args);
    }
    return undefined as TReturn;
  }) as SpyFunction<TArgs, Promise<TReturn>>;

  spy.calls = [];
  return spy;
}

export function createMockResponse() {
  const headers = new Map<string, string>();
  const bodyChunks: string[] = [];
  let statusCode = 200;
  let jsonPayload: unknown;
  let closeHandler: (() => void) | null = null;

  return {
    headers,
    bodyChunks,
    get statusCode() {
      return statusCode;
    },
    get jsonPayload() {
      return jsonPayload;
    },
    triggerClose() {
      if (closeHandler) {
        closeHandler();
      }
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      jsonPayload = payload;
      return this;
    },
    setHeader(key: string, value: string) {
      headers.set(key, value);
    },
    flushHeaders() {
      return undefined;
    },
    write(chunk: string) {
      bodyChunks.push(chunk);
      return true;
    },
    on(event: string, handler: () => void) {
      if (event === "close") {
        closeHandler = handler;
      }
      return this;
    },
    sendFile(_filePath: string) {
      return this;
    },
  };
}
