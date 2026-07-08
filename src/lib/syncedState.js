import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase.js";

// ============================================================================
// Synced state hooks — drop-in replacements for useLocalStorage that keep every
// signed-in client in sync through a shared Supabase (Postgres) backend.
//
//   * Same [value, setValue] signature as useLocalStorage, so App.jsx barely
//     changes. setValue accepts a value OR an updater function.
//   * Each domain row is stored as { id, data } where `data` is the ORIGINAL
//     app object, so the exact JSON shape (numeric ids, nested objects) is
//     preserved end to end.
//   * When Supabase is not configured, or `enabled` is false (e.g. logged out),
//     these behave exactly like a localStorage-backed state — the offline
//     portable demo and local dev keep working untouched.
// ============================================================================

function readCache(key, fallback) {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage may be blocked (private mode); the app still works in memory
  }
}

const idOf = (row) => String(row?.id ?? "");

/**
 * Synced ARRAY state (projects, tasks, comments, notifications, ...).
 * @param {string} table  Supabase table name.
 * @param {string} localKey  localStorage key used for the offline fallback/cache.
 * @param {Array}  initialValue
 * @param {{ enabled?: boolean }} options  enabled=false keeps it purely local.
 */
export function useSyncedTable(table, localKey, initialValue, options = {}) {
  const { enabled = true } = options;
  const active = isSupabaseConfigured && enabled;

  const [value, setValue] = useState(() =>
    active ? initialValue : readCache(localKey, initialValue),
  );

  // last-known server state, keyed by id — used to diff local writes
  const serverRef = useRef(new Map());

  // mirror to localStorage as an offline cache (harmless when purely local)
  useEffect(() => {
    writeCache(localKey, value);
  }, [localKey, value]);

  // Push the delta between the previous and next array to Supabase.
  const pushDiff = useCallback(
    async (prev, next) => {
      const server = serverRef.current;
      const nextMap = new Map(next.map((o) => [idOf(o), o]));

      const upserts = [];
      for (const [id, obj] of nextMap) {
        const known = server.get(id);
        if (!known || JSON.stringify(known) !== JSON.stringify(obj)) {
          upserts.push({ id, data: obj });
        }
      }
      const deletes = [];
      for (const id of server.keys()) {
        if (!nextMap.has(id)) deletes.push(id);
      }

      serverRef.current = nextMap; // optimistic: assume our write wins
      try {
        if (upserts.length) {
          const { error } = await supabase.from(table).upsert(upserts);
          if (error) throw error;
        }
        if (deletes.length) {
          const { error } = await supabase.from(table).delete().in("id", deletes);
          if (error) throw error;
        }
      } catch (error) {
        console.error(`[sync] write ${table} failed`, error);
      }
    },
    [table],
  );

  const setSynced = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        if (active) pushDiff(prev, resolved);
        return resolved;
      });
    },
    [active, pushDiff],
  );

  // Initial load + realtime subscription
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from(table)
        .select("id, data, created_at")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error(`[sync] load ${table} failed`, error);
        return;
      }
      serverRef.current = new Map(data.map((r) => [r.id, r.data]));
      setValue(data.map((r) => r.data));
    })();

    const channel = supabase
      .channel(`sync:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const server = serverRef.current;
          if (payload.eventType === "DELETE") {
            const id = String(payload.old.id);
            server.delete(id);
            setValue((prev) => prev.filter((o) => idOf(o) !== id));
            return;
          }
          const id = String(payload.new.id);
          const obj = payload.new.data;
          server.set(id, obj);
          setValue((prev) => {
            const i = prev.findIndex((o) => idOf(o) === id);
            if (i === -1) return [obj, ...prev];
            const copy = prev.slice();
            copy[i] = obj;
            return copy;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, table]);

  return [value, setSynced];
}

/**
 * Synced SINGLETON object/array stored as one row in `app_state`
 * (used for dailyBaseline and removedUserIds).
 */
export function useSyncedObject(key, localKey, initialValue, options = {}) {
  const { enabled = true } = options;
  const active = isSupabaseConfigured && enabled;

  const [value, setValue] = useState(() =>
    active ? initialValue : readCache(localKey, initialValue),
  );
  const skipPush = useRef(false);

  useEffect(() => {
    writeCache(localKey, value);
  }, [localKey, value]);

  const setSynced = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        if (active && !skipPush.current) {
          supabase
            .from("app_state")
            .upsert({ key, data: resolved })
            .then(({ error }) => {
              if (error) console.error(`[sync] write app_state/${key} failed`, error);
            });
        }
        return resolved;
      });
    },
    [active, key],
  );

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("app_state")
        .select("data")
        .eq("key", key)
        .maybeSingle();
      if (cancelled || error || !data) return;
      skipPush.current = true;
      setValue(data.data);
      skipPush.current = false;
    })();

    const channel = supabase
      .channel(`sync-obj:${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_state", filter: `key=eq.${key}` },
        (payload) => {
          if (payload.new?.data === undefined) return;
          skipPush.current = true;
          setValue(payload.new.data);
          skipPush.current = false;
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  return [value, setSynced];
}
