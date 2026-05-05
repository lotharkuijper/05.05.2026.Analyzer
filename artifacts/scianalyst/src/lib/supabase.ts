// Lightweight Supabase-compatible shim that talks to our Express API.
// Mirrors only the surface used by this app:
//   .from(t).select('*').order(col) -> { data, error }
//   .from(t).insert(obj).select().single() -> { data, error }
//   .from(t).update(obj).eq(col, val).select().single() -> { data, error }
//   .from(t).delete().eq(col, val) -> { data, error }
//   .from(t).insert(obj) -> Promise<{ data, error }>  (fire-and-forget)

const BASE = `${import.meta.env.BASE_URL}api`;

type Result<T = any> = { data: T | null; error: { message: string } | null };

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<Result<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      return {
        data: null,
        error: { message: data?.error || res.statusText || "Request failed" },
      };
    }
    return { data: data as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}

interface QueryState {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  payload?: any;
  selectAfter?: boolean;
  single?: boolean;
  orderBy?: string;
  filters: Array<{ col: string; val: any }>;
}

function execute(state: QueryState): Promise<Result> {
  const { table, op, payload, single, orderBy, filters } = state;
  if (op === "select") {
    const qs = new URLSearchParams();
    if (orderBy) qs.set("order", orderBy);
    for (const f of filters) qs.set(`eq_${f.col}`, String(f.val));
    const q = qs.toString();
    return request("GET", `/${table}${q ? `?${q}` : ""}`);
  }
  if (op === "insert") {
    return request("POST", `/${table}`, { row: payload, single }).then((r) => {
      if (r.error || !r.data) return r;
      return { data: single ? (r.data as any).row : (r.data as any).rows, error: null };
    });
  }
  if (op === "update") {
    const id = filters.find((f) => f.col === "id")?.val;
    if (!id)
      return Promise.resolve({
        data: null,
        error: { message: "update requires .eq('id', ...)" },
      });
    return request("PATCH", `/${table}/${encodeURIComponent(id)}`, {
      row: payload,
      single,
    }).then((r) => {
      if (r.error || !r.data) return r;
      return { data: single ? (r.data as any).row : (r.data as any).rows, error: null };
    });
  }
  if (op === "delete") {
    const id = filters.find((f) => f.col === "id")?.val;
    if (!id)
      return Promise.resolve({
        data: null,
        error: { message: "delete requires .eq('id', ...)" },
      });
    return request("DELETE", `/${table}/${encodeURIComponent(id)}`);
  }
  return Promise.resolve({ data: null, error: { message: "unknown op" } });
}

class Builder implements PromiseLike<Result> {
  constructor(private state: QueryState) {}

  select(_cols?: string) {
    if (this.state.op === "insert" || this.state.op === "update") {
      this.state.selectAfter = true;
      this.state.single = false;
    } else {
      this.state.op = "select";
    }
    return this;
  }
  order(col: string) {
    this.state.orderBy = col;
    return this;
  }
  eq(col: string, val: any) {
    this.state.filters.push({ col, val });
    return this;
  }
  single() {
    this.state.single = true;
    return this;
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?:
      | ((value: Result) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return execute(this.state).then(onfulfilled as any, onrejected);
  }
  catch(onrejected: any) {
    return execute(this.state).catch(onrejected);
  }
}

class Table {
  constructor(private table: string) {}
  select(cols?: string) {
    return new Builder({ table: this.table, op: "select", filters: [] }).select(
      cols,
    );
  }
  insert(payload: any) {
    return new Builder({
      table: this.table,
      op: "insert",
      payload,
      filters: [],
    });
  }
  update(payload: any) {
    return new Builder({
      table: this.table,
      op: "update",
      payload,
      filters: [],
    });
  }
  delete() {
    return new Builder({ table: this.table, op: "delete", filters: [] });
  }
}

export const supabase = {
  from(table: string) {
    return new Table(table);
  },
};
