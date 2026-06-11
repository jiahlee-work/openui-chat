export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Maybe<T> = T | null | undefined;

export type ValueOf<T extends object> = T[keyof T];

export type Prettify<T> = {
  [Key in keyof T]: T[Key];
};

export type NonEmptyArray<T> = [T, ...T[]];
