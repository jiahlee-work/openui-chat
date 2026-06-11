import type { AppError } from "@shared/errors";
import { isAbortError, isAppError } from "@shared/guards";
import type {
  FetchImplementation,
  HttpClient,
  HttpClientConfig,
  HttpQueryParams,
  HttpQueryValue,
  HttpRequestBody,
  HttpRequestConfig,
  HttpResponse,
  NextFetchOptions,
  RetryContext,
  RetryPolicy,
} from "./http-client.types";
import { HTTP_METHOD } from "./http-method";
import { HTTP_STATUS } from "./http-status";
import { NetworkError } from "./network-error";
import { normalizeNetworkError } from "./normalize-network-error";
import {
  applyRequestInterceptors,
  createAuthorizationRequestInterceptor,
} from "./request-interceptor";
import { applyResponseInterceptors } from "./response-interceptor";

type RequestExecution = {
  signal?: AbortSignal;
  didTimeout: () => boolean;
  dispose: () => void;
};

function resolveURL(baseURL: string | undefined, url: string): string {
  if (!baseURL || /^[a-z][a-z\d+\-.]*:/i.test(url) || url.startsWith("//")) {
    return url;
  }

  return `${baseURL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

function serializeQueryValue(value: Exclude<HttpQueryValue, null | undefined>): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function appendQueryParams(url: string, query: HttpQueryParams | undefined): string {
  if (!query) {
    return url;
  }

  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      if (value !== null && value !== undefined) {
        searchParams.append(key, serializeQueryValue(value));
      }
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return url;
  }

  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const urlWithoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const separator = urlWithoutHash.includes("?") ? "&" : "?";

  return `${urlWithoutHash}${separator}${queryString}${hash}`;
}

function mergeHeaders(defaultHeaders: HeadersInit | undefined, headers: HeadersInit | undefined) {
  const mergedHeaders = new Headers(defaultHeaders);

  new Headers(headers).forEach((value, key) => {
    mergedHeaders.set(key, value);
  });

  return mergedHeaders;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    isFormData(value) ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) ||
    (typeof ArrayBuffer !== "undefined" &&
      (value instanceof ArrayBuffer || ArrayBuffer.isView(value))) ||
    (typeof ReadableStream !== "undefined" && value instanceof ReadableStream)
  );
}

function serializeBody(body: HttpRequestBody | undefined, headers: Headers): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (isFormData(body)) {
    headers.delete("Content-Type");
    return body;
  }

  if (isBodyInit(body)) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

function createRequestExecution(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): RequestExecution {
  if (signal === undefined && (timeoutMs === undefined || timeoutMs <= 0)) {
    return {
      signal: undefined,
      didTimeout: () => false,
      dispose: () => undefined,
    };
  }

  const controller = new AbortController();
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const abortFromSignal = () => {
    controller.abort(signal?.reason);
  };

  if (signal?.aborted) {
    abortFromSignal();
  } else {
    signal?.addEventListener("abort", abortFromSignal, { once: true });
  }

  if (timeoutMs !== undefined && timeoutMs > 0) {
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      signal?.removeEventListener("abort", abortFromSignal);
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    },
  };
}

function toFetchOptions(config: HttpRequestConfig): NextFetchOptions {
  return {
    cache: config.cache,
    next:
      config.next === undefined
        ? undefined
        : {
            revalidate: config.next.revalidate,
            tags: config.next.tags === undefined ? undefined : [...config.next.tags],
          },
  };
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  if (response.status === HTTP_STATUS.NO_CONTENT || response.status === HTTP_STATUS.RESET_CONTENT) {
    return undefined as T;
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type")?.toLowerCase();
  if (contentType?.includes("application/json") || contentType?.includes("+json")) {
    return JSON.parse(responseText) as T;
  }

  return responseText as T;
}

function createHttpStatusError(response: Response, responseBody: unknown): NetworkError {
  return new NetworkError({
    message: response.statusText || `HTTP request failed with status ${response.status}.`,
    status: response.status,
    retryable: response.status === HTTP_STATUS.REQUEST_TIMEOUT || response.status >= 500,
    metadata: {
      responseBody,
      responseURL: response.url,
    },
  });
}

function getRetryDelay(policy: RetryPolicy, error: AppError, context: RetryContext): number {
  const delay =
    typeof policy.delayMs === "function" ? policy.delayMs(error, context) : policy.delayMs;
  return Math.max(0, delay ?? 0);
}

function createAbortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function waitForRetry(delayMs: number, signal: AbortSignal | undefined): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const onAbort = () => {
      clearTimeout(timeout);
      reject(createAbortError());
    };

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function shouldRetry(
  policy: RetryPolicy,
  error: AppError,
  context: RetryContext,
): Promise<boolean> {
  if (context.attempt > policy.maxRetries || isAbortError(error.cause)) {
    return false;
  }

  return policy.shouldRetry ? policy.shouldRetry(error, context) : error.retryable;
}

function createFetchImplementation(fetchFn: FetchImplementation | undefined): FetchImplementation {
  if (fetchFn) {
    return fetchFn;
  }

  return (input, init) => fetch(input, init);
}

export function createHttpClient(clientConfig: HttpClientConfig = {}): HttpClient {
  const fetchFn = createFetchImplementation(clientConfig.fetchFn);
  const requestInterceptors = [
    ...(clientConfig.tokenProvider
      ? [createAuthorizationRequestInterceptor(clientConfig.tokenProvider)]
      : []),
    ...(clientConfig.requestInterceptors ?? []),
  ];
  const responseInterceptors = clientConfig.responseInterceptors ?? [];

  async function executeRequest<T>(requestConfig: HttpRequestConfig): Promise<HttpResponse<T>> {
    let attempt = 0;

    while (true) {
      attempt += 1;

      const initialConfig: HttpRequestConfig = {
        ...requestConfig,
        method: requestConfig.method ?? HTTP_METHOD.GET,
        headers: mergeHeaders(clientConfig.defaultHeaders, requestConfig.headers),
        timeoutMs: requestConfig.timeoutMs ?? clientConfig.timeoutMs,
        retryPolicy: requestConfig.retryPolicy ?? clientConfig.retryPolicy,
      };

      let interceptedConfig: HttpRequestConfig;
      try {
        interceptedConfig = await applyRequestInterceptors(initialConfig, requestInterceptors);
      } catch (error) {
        throw normalizeNetworkError(error);
      }

      const headers = new Headers(interceptedConfig.headers);
      const body = serializeBody(interceptedConfig.body, headers);
      const requestURL = appendQueryParams(
        resolveURL(clientConfig.baseURL, interceptedConfig.url),
        interceptedConfig.query,
      );
      const execution = createRequestExecution(
        interceptedConfig.signal,
        interceptedConfig.timeoutMs,
      );

      try {
        let response: Response;

        try {
          response = await fetchFn(requestURL, {
            ...toFetchOptions(interceptedConfig),
            method: interceptedConfig.method,
            headers,
            body,
            signal: execution.signal,
          });
        } catch (error) {
          if (execution.didTimeout()) {
            throw new NetworkError({
              message: "The request timed out.",
              cause: error,
              timeout: true,
              retryable: true,
            });
          }

          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "TimeoutError"
          ) {
            throw error;
          }

          if (interceptedConfig.signal?.aborted) {
            throw createAbortError();
          }

          if (isAbortError(error)) {
            throw error;
          }

          throw new NetworkError({
            message: "A network error occurred.",
            cause: error,
            retryable: true,
          });
        }

        let responseData: T;
        try {
          responseData = await parseResponseBody<T>(response);
        } catch (error) {
          throw new NetworkError({
            message: "The response body could not be parsed.",
            cause: error,
            status: response.status,
            retryable: false,
          });
        }

        if (!response.ok) {
          throw createHttpStatusError(response, responseData);
        }

        return await applyResponseInterceptors(
          {
            data: responseData,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            url: response.url || requestURL,
          },
          interceptedConfig,
          responseInterceptors,
        );
      } catch (error) {
        execution.dispose();

        const appError = isAppError(error) ? error : normalizeNetworkError(error);
        const retryPolicy = interceptedConfig.retryPolicy;
        const retryContext: RetryContext = {
          attempt,
          request: interceptedConfig,
        };

        if (!retryPolicy || !(await shouldRetry(retryPolicy, appError, retryContext))) {
          throw appError;
        }

        try {
          await waitForRetry(
            getRetryDelay(retryPolicy, appError, retryContext),
            interceptedConfig.signal,
          );
        } catch (retryError) {
          throw normalizeNetworkError(retryError);
        }
      } finally {
        execution.dispose();
      }
    }
  }

  return {
    request: executeRequest,
    get: (url, config) =>
      executeRequest({
        ...config,
        method: HTTP_METHOD.GET,
        url,
      }),
    post: (url, body, config) =>
      executeRequest({
        ...config,
        method: HTTP_METHOD.POST,
        url,
        body,
      }),
    put: (url, body, config) =>
      executeRequest({
        ...config,
        method: HTTP_METHOD.PUT,
        url,
        body,
      }),
    patch: (url, body, config) =>
      executeRequest({
        ...config,
        method: HTTP_METHOD.PATCH,
        url,
        body,
      }),
    delete: (url, config) =>
      executeRequest({
        ...config,
        method: HTTP_METHOD.DELETE,
        url,
      }),
  };
}
