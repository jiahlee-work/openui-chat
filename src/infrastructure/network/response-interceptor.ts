import type { HttpRequestConfig, HttpResponse, HttpResponseInterceptor } from "./http-client.types";

export async function applyResponseInterceptors<T>(
  response: HttpResponse<T>,
  request: Readonly<HttpRequestConfig>,
  interceptors: readonly HttpResponseInterceptor[],
): Promise<HttpResponse<T>> {
  let interceptedResponse = response;

  for (const interceptor of interceptors) {
    interceptedResponse = await interceptor(interceptedResponse, request);
  }

  return interceptedResponse;
}
