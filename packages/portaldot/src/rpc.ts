import { SeamTransportError } from "@seam/core";
import WebSocket from "ws";

export interface JsonRpcClient {
  call<T>(method: string, params?: unknown[]): Promise<T>;
  close(): Promise<void>;
}

export async function createRpc(url: string, timeoutMs = 20_000): Promise<JsonRpcClient> {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return createHttpRpc(url, timeoutMs);
  }
  return createWsRpc(url, timeoutMs);
}

function createHttpRpc(url: string, timeoutMs: number): JsonRpcClient {
  let id = 0;
  return {
    async call<T>(method: string, params: unknown[] = []): Promise<T> {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
          signal: controller.signal,
        });
        const json = (await res.json()) as { result?: T; error?: { message: string } };
        if (json.error) throw new SeamTransportError(json.error.message, { method });
        return json.result as T;
      } catch (e) {
        throw new SeamTransportError(e instanceof Error ? e.message : "HTTP RPC failed", {
          method,
          url,
        });
      } finally {
        clearTimeout(t);
      }
    },
    async close() {},
  };
}

function createWsRpc(url: string, timeoutMs: number): Promise<JsonRpcClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map<
      number,
      { resolve: (v: unknown) => void; reject: (e: Error) => void }
    >();
    const timer = setTimeout(() => {
      ws.close();
      reject(new SeamTransportError("WebSocket connect timeout", { url }));
    }, timeoutMs);
    ws.on("open", () => {
      clearTimeout(timer);
      resolve({
        async call<T>(method: string, params: unknown[] = []): Promise<T> {
          const reqId = ++id;
          return new Promise<T>((res, rej) => {
            const t = setTimeout(() => {
              pending.delete(reqId);
              rej(new SeamTransportError("RPC timeout", { method }));
            }, timeoutMs);
            pending.set(reqId, {
              resolve: (v) => {
                clearTimeout(t);
                res(v as T);
              },
              reject: (e) => {
                clearTimeout(t);
                rej(e);
              },
            });
            ws.send(JSON.stringify({ jsonrpc: "2.0", id: reqId, method, params }));
          });
        },
        async close() {
          ws.close();
        },
      });
    });
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(String(data)) as {
          id?: number;
          result?: unknown;
          error?: { message: string };
        };
        if (msg.id == null) return;
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        if (msg.error) p.reject(new SeamTransportError(msg.error.message));
        else p.resolve(msg.result);
      } catch {
        /* ignore malformed */
      }
    });
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(new SeamTransportError(err.message, { url }));
    });
  });
}
