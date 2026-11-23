// Notifikasi push lewat layanan Expo. Isi pesan tidak dikirim kecuali PUSH_PREVIEW=true.
export function createPush({ cfg, db, fetchImpl = fetch, log = console }) {
  return {
    async notify(userIds, { title, body, data }) {
      if (!userIds.length) return;
      const { rows } = await db.query('select push_token from devices where user_id = any($1::uuid[])', [userIds]);
      if (!rows.length) return;
      const messages = rows.map((r) => ({
        to: r.push_token,
        title: cfg.PUSH_PREVIEW ? title : 'XyinnCht',
        body: cfg.PUSH_PREVIEW ? body : 'Pesan baru',
        data,
        sound: 'default',
        channelId: 'messages',
      }));
      try {
        const res = await fetchImpl('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(messages),
        });
        const json = await res.json();
        const bad = [];
        (json.data ?? []).forEach((t, i) => {
          if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') bad.push(messages[i].to);
        });
        if (bad.length) await db.query('delete from devices where push_token = any($1::text[])', [bad]);
      } catch (err) {
        log.warn?.('Push gagal', err?.message);
      }
    },
  };
}
