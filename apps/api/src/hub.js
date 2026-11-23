// Pelacak koneksi WebSocket per pengguna (satu proses).
export function createHub() {
  const conns = new Map();
  return {
    add(userId, ws) {
      if (!conns.has(userId)) conns.set(userId, new Set());
      conns.get(userId).add(ws);
    },
    remove(userId, ws) {
      const s = conns.get(userId);
      if (!s) return 0;
      s.delete(ws);
      if (s.size === 0) conns.delete(userId);
      return s.size;
    },
    isOnline: (userId) => (conns.get(userId)?.size ?? 0) > 0,
    send(userId, obj) {
      const s = conns.get(userId);
      if (!s) return 0;
      const data = JSON.stringify(obj);
      let n = 0;
      for (const ws of s) {
        if (ws.readyState === 1) {
          ws.send(data);
          n++;
        }
      }
      return n;
    },
    disconnectUser(userId, obj) {
      const s = conns.get(userId);
      if (!s) return;
      const data = obj ? JSON.stringify(obj) : null;
      for (const ws of [...s]) {
        try {
          if (data && ws.readyState === 1) ws.send(data);
          ws.close(4003, 'banned');
        } catch {
          /* abaikan */
        }
      }
      conns.delete(userId);
    },
    allSockets: () => [...conns.values()].flatMap((s) => [...s]),
  };
}
