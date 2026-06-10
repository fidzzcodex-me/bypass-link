const crypto = require("crypto");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

module.exports = async (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const androidId = crypto.randomBytes(16).toString("hex");
    const deviceId = crypto.createHash("sha256").update(`bypasstools:${androidId}`).digest("hex");

    const initRes = await fetch("https://bypass.tools/api/mobile/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, platform: "android", appVersion: "1.0.0" }),
    });
    const initData = await initRes.json();
    const sessionToken = initData.sessionToken || initData.token || initData.data?.sessionToken;
    if (!sessionToken) return res.status(502).json({ error: "Failed to get session token", raw: initData });

    const bypassRes = await fetch("https://bypass.tools/api/mobile/bypass", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
        "X-Device-ID": deviceId,
      },
      body: JSON.stringify({ url, forceRefresh: false }),
    });
    const data = await bypassRes.json();

    if (!bypassRes.ok) return res.status(502).json({ error: data.message || "Bypass failed", raw: data });

    const result =
      data.result ||
      data.url ||
      data.destination ||
      data.redirectUrl ||
      data.bypassedUrl ||
      data.data?.result ||
      data.data?.url;

    if (!result) return res.status(502).json({ error: "No result in response", raw: data });

    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
