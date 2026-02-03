import { cookies } from "next/headers";
import { cache } from "react";

type TRPCResponseEnvelope = Array<{
  result?: { data?: any };
  error?: { message?: string; data?: any };
}>;

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc";
}

async function buildCookieHeader() {
  const store = await cookies();
  const all = store.getAll();
  if (all.length === 0) return "";
  return all
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join("; ");
}

async function trpcFetch(url: string, init: RequestInit) {
  const cookieHeader = await buildCookieHeader();
  const headers = new Headers(init.headers);
  if (cookieHeader) headers.set("cookie", cookieHeader);
  const store = await cookies();
  const deviceId = store.get("mianshihou.device_id")?.value;
  if (deviceId) headers.set("x-device-id", deviceId);
  headers.set("accept", "application/json");
  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function trpcQuery<
  TInput extends Record<string, any> | undefined,
  TOutput = any,
>(path: string, input?: TInput): Promise<TOutput> {
  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/${path}`);
  url.searchParams.set("batch", "1");
  url.searchParams.set("input", JSON.stringify({ 0: input ?? {} }));

  const res = await trpcFetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as TRPCResponseEnvelope;
  const first = json[0];
  if (first?.error) {
    const message = first.error.message || "tRPC query failed";
    throw new Error(message);
  }
  return (first?.result?.data as TOutput) ?? (null as any);
}

export async function safeTrpcQuery<
  TInput extends Record<string, any> | undefined,
  TOutput = any,
>(path: string, input?: TInput): Promise<TOutput | null> {
  try {
    return await trpcQuery<TInput, TOutput>(path, input);
  } catch {
    return null;
  }
}

export async function trpcBatchQuery<TOutput = any>(
  calls: Array<{ path: string; input?: Record<string, any> }>,
): Promise<TOutput[]> {
  const apiUrl = getApiUrl().replace(/\/$/, "");
  const joinedPath = calls.map((c) => c.path).join(",");
  const url = new URL(`${apiUrl}/${joinedPath}`);
  url.searchParams.set("batch", "1");
  const inputObj: Record<string, any> = {};
  calls.forEach((c, idx) => {
    inputObj[String(idx)] = c.input ?? {};
  });
  url.searchParams.set("input", JSON.stringify(inputObj));

  const res = await trpcFetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as TRPCResponseEnvelope;

  return calls.map((_, idx) => {
    const item = json[idx];
    if (item?.error) {
      const message = item.error.message || "tRPC batch query failed";
      throw new Error(message);
    }
    return (item?.result?.data as TOutput) ?? (null as any);
  });
}

export async function safeTrpcBatchQuery<TOutput = any>(
  calls: Array<{ path: string; input?: Record<string, any> }>,
): Promise<Array<TOutput | null>> {
  try {
    return await trpcBatchQuery<TOutput>(calls);
  } catch {
    return calls.map(() => null);
  }
}

export async function trpcMutation<
  TInput extends Record<string, any>,
  TOutput = any,
>(path: string, input: TInput): Promise<TOutput> {
  const apiUrl = getApiUrl().replace(/\/$/, "");
  const url = new URL(`${apiUrl}/${path}`);
  url.searchParams.set("batch", "1");

  const res = await trpcFetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: input }),
  });

  const json = (await res.json()) as TRPCResponseEnvelope;
  const first = json[0];
  if (first?.error) {
    const message = first.error.message || "tRPC mutation failed";
    throw new Error(message);
  }
  return (first?.result?.data as TOutput) ?? (null as any);
}

export const getCurrentUser = cache(async () => {
  const res = await safeTrpcQuery("auth.getSession", {});
  return res?.data?.user ?? null;
});
