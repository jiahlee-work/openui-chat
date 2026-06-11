import type { AppError } from "@shared/errors";
import type { HttpMethod } from "./http-method";

export type MaybePromise<T> = T | Promise<T>;

export type HttpQueryValue = string | number | boolean | Date | null | undefined;

export type HttpQueryParams = Readonly<Record<string, HttpQueryValue | readonly HttpQueryValue[]>>;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export type HttpRequestBody = BodyInit | JsonValue;

export type NextFetchOptions = {
  cache?: RequestCache;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export type RetryContext = Readonly<{
  attempt: number;
  request: HttpRequestConfig;
}>;

export type RetryPolicy = Readonly<{
  maxRetries: number;
  shouldRetry?: (error: AppError, context: RetryContext) => MaybePromise<boolean>;
  delayMs?: number | ((error: AppError, context: RetryContext) => number);
}>;

export interface TokenProvider {
  getToken(): MaybePromise<string | null | undefined>;
}

export type HttpRequestConfig = NextFetchOptions & {
  url: string;
  method?: HttpMethod;
  headers?: HeadersInit;
  query?: HttpQueryParams;
  body?: HttpRequestBody;
  signal?: AbortSignal;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
};

export type HttpRequestOptions = Omit<HttpRequestConfig, "body" | "method" | "url">;

export type HttpResponse<T> = Readonly<{
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
}>;

export type HttpRequestInterceptor = (config: HttpRequestConfig) => MaybePromise<HttpRequestConfig>;

export type HttpResponseInterceptor = <T>(
  response: HttpResponse<T>,
  request: Readonly<HttpRequestConfig>,
) => MaybePromise<HttpResponse<T>>;

export type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit & NextFetchOptions,
) => Promise<Response>;

export type HttpClientConfig = {
  baseURL?: string;
  defaultHeaders?: HeadersInit;
  timeoutMs?: number;
  tokenProvider?: TokenProvider;
  retryPolicy?: RetryPolicy;
  requestInterceptors?: readonly HttpRequestInterceptor[];
  responseInterceptors?: readonly HttpResponseInterceptor[];
  fetchFn?: FetchImplementation;
};

export interface HttpClient {
  request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
  get<T>(url: string, config?: HttpRequestOptions): Promise<HttpResponse<T>>;
  post<T>(
    url: string,
    body?: HttpRequestBody,
    config?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;
  put<T>(
    url: string,
    body?: HttpRequestBody,
    config?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;
  patch<T>(
    url: string,
    body?: HttpRequestBody,
    config?: HttpRequestOptions,
  ): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: HttpRequestOptions): Promise<HttpResponse<T>>;
}
