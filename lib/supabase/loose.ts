type LooseError = {
  message: string;
  code?: string;
};

export type LooseQueryResult<T = unknown> = {
  data: T | null;
  error: LooseError | null;
  count?: number | null;
};

type LooseQueryBuilder<T = unknown> = PromiseLike<LooseQueryResult<T>> & {
  select<TResult = unknown>(columns?: string, options?: unknown): LooseQueryBuilder<TResult>;
  insert(values: unknown, options?: unknown): LooseQueryBuilder<T>;
  upsert(values: unknown, options?: unknown): LooseQueryBuilder<T>;
  update(values: unknown, options?: unknown): LooseQueryBuilder<T>;
  delete(options?: unknown): LooseQueryBuilder<T>;
  eq(column: string, value: unknown): LooseQueryBuilder<T>;
  gt(column: string, value: unknown): LooseQueryBuilder<T>;
  gte(column: string, value: unknown): LooseQueryBuilder<T>;
  lt(column: string, value: unknown): LooseQueryBuilder<T>;
  lte(column: string, value: unknown): LooseQueryBuilder<T>;
  neq(column: string, value: unknown): LooseQueryBuilder<T>;
  or(filters: string, options?: unknown): LooseQueryBuilder<T>;
  in(column: string, values: unknown[]): LooseQueryBuilder<T>;
  is(column: string, value: unknown): LooseQueryBuilder<T>;
  not(column: string, operator: string, value: unknown): LooseQueryBuilder<T>;
  order(column: string, options?: unknown): LooseQueryBuilder<T>;
  limit(count: number): LooseQueryBuilder<T>;
  single(): Promise<LooseQueryResult<T>>;
  maybeSingle(): Promise<LooseQueryResult<T>>;
};

type LooseFrom = {
  from(table: string): LooseQueryBuilder;
  rpc<T = unknown>(fn: string, args?: unknown): Promise<LooseQueryResult<T>>;
};

export function asLooseSupabaseClient<TClient>(client: TClient): Omit<TClient, "from"> & LooseFrom {
  return client as unknown as Omit<TClient, "from"> & LooseFrom;
}
