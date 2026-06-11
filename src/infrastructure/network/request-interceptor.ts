import type { HttpRequestConfig, HttpRequestInterceptor, TokenProvider } from "./http-client.types";

export async function applyRequestInterceptors(
  config: HttpRequestConfig,
  interceptors: readonly HttpRequestInterceptor[],
): Promise<HttpRequestConfig> {
  let interceptedConfig = config;

  for (const interceptor of interceptors) {
    interceptedConfig = await interceptor(interceptedConfig);
  }

  return interceptedConfig;
}

export function createAuthorizationRequestInterceptor(
  tokenProvider: TokenProvider,
): HttpRequestInterceptor {
  return async (config) => {
    const token = await tokenProvider.getToken();
    if (!token) {
      return config;
    }

    const headers = new Headers(config.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return {
      ...config,
      headers,
    };
  };
}
