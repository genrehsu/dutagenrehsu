const MAX_BODY_BYTES = 4500000;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Metode tidak diizinkan." });
  }

  const endpoint = process.env.APPS_SCRIPT_URL;
  if (!endpoint) {
    return res.status(503).json({
      ok: false,
      error: "Backend belum dikonfigurasi. Atur APPS_SCRIPT_URL di Vercel.",
    });
  }

  const payload =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  if (Buffer.byteLength(payload, "utf8") > MAX_BODY_BYTES) {
    return res.status(413).json({ ok: false, error: "Ukuran permintaan terlalu besar." });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      redirect: "follow",
    });
    const result = await upstream.json();
    return res.status(upstream.ok ? 200 : upstream.status).json(result);
  } catch (error) {
    console.error("Apps Script request failed:", error);
    return res.status(502).json({
      ok: false,
      error: "Tidak dapat menghubungi backend Google Apps Script.",
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: "5mb" },
  },
};
