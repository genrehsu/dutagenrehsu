const crypto = require("crypto");

function signParameters(parameters, secret) {
  const value = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(value + secret).digest("hex");
}

async function verifyAdmin(token) {
  try {
    const response = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verifySession", token }),
      redirect: "follow",
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      const error = new Error(result.error || "Sesi admin tidak valid.");
      error.status = 401;
      throw error;
    }
  } catch (error) {
    if (error.status) throw error;
    error.status = 502;
    throw error;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Metode tidak diizinkan." });
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!process.env.APPS_SCRIPT_URL || !cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({
      ok: false,
      error: "Konfigurasi Cloudinary belum lengkap di environment Vercel.",
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    await verifyAdmin(String(body.token || ""));
    const action = String(body.action || "");
    const timestamp = Math.floor(Date.now() / 1000);

    if (action === "sign-upload") {
      const parameters = {
        folder: "dutagenre-hsu",
        timestamp: String(timestamp),
        use_filename: "true",
        unique_filename: "true",
      };
      return res.status(200).json({
        ok: true,
        data: {
          cloudName,
          apiKey,
          folder: parameters.folder,
          timestamp,
          signature: signParameters(parameters, apiSecret),
        },
      });
    }

    if (action === "delete") {
      const publicId = String(body.publicId || "");
      const resourceType = String(body.resourceType || "");
      if (!/^dutagenre-hsu\/[\w./-]{1,230}$/.test(publicId) ||
          publicId.split("/").includes("..") ||
          !["image", "raw", "video"].includes(resourceType)) {
        return res.status(400).json({ ok: false, error: "Identitas file Cloudinary tidak valid." });
      }

      const parameters = {
        invalidate: "true",
        public_id: publicId,
        timestamp: String(timestamp),
      };
      const form = new URLSearchParams({
        api_key: apiKey,
        invalidate: "true",
        public_id: publicId,
        signature: signParameters(parameters, apiSecret),
        timestamp: String(timestamp),
      });
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/destroy`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form },
      );
      const result = await response.json();
      if (!response.ok || result.result !== "ok" && result.result !== "not found") {
        return res.status(502).json({
          ok: false,
          error: "Cloudinary gagal menghapus file. " + (result.error && result.error.message || ""),
        });
      }
      return res.status(200).json({ ok: true, data: { publicId, deleted: result.result === "ok" } });
    }

    return res.status(400).json({ ok: false, error: "Aksi Cloudinary tidak dikenali." });
  } catch (error) {
    console.error("Cloudinary operation failed:", error);
    return res.status(error.status || 502).json({
      ok: false,
      error: error.message || "Operasi Cloudinary gagal.",
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: "16kb" },
  },
};
