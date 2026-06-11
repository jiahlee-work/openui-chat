export type AppError = Error;

export type IdleState = {
  status: "idle";
};

export type LoadingState = {
  status: "loading";
};

export type SuccessState<T> = {
  status: "success";
  data: T;
};

export type ErrorState<E = AppError> = {
  status: "error";
  error: E;
};

export type AsyncState<T, E = AppError> =
  | IdleState
  | LoadingState
  | SuccessState<T>
  | ErrorState<E>;
