import { type MaskSensitiveDataOptions, maskSensitiveData } from "@infrastructure/utils";
import { isProductionLikeEnv } from "@/config/env";
import { ConsoleLogger } from "./console-logger";
import type { LogContextSanitizer, Logger } from "./logger.types";

export type CreateLoggerOptions = Readonly<{
  productionLike?: boolean;
  maskSensitiveContext?: boolean;
  maskOptions?: MaskSensitiveDataOptions;
  sanitizeContext?: LogContextSanitizer;
}>;

function createContextSanitizer(options: CreateLoggerOptions): LogContextSanitizer | undefined {
  if (options.sanitizeContext) {
    return options.sanitizeContext;
  }

  if (options.maskSensitiveContext === false) {
    return undefined;
  }

  return (context) => maskSensitiveData(context, options.maskOptions);
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  return new ConsoleLogger({
    suppressDebugAndInfo: options.productionLike ?? isProductionLikeEnv(),
    sanitizeContext: createContextSanitizer(options),
  });
}
