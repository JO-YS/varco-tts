const path = require("node:path");
const fs = require("node:fs/promises");
const express = require("express");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "public")));

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    const error = new Error(`${name} is required`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    const error = new Error("Invalid number");
    error.statusCode = 400;
    throw error;
  }
  return numberValue;
}

function getBaseUrl(mode) {
  if (mode === "lite") return "https://openapi.ai.nc.com/tts/lite/v1/api";
  if (mode === "standard") return "https://openapi.ai.nc.com/tts/standard/v1/api";
  const error = new Error("mode must be lite|standard");
  error.statusCode = 400;
  throw error;
}

let cachedVoices = null;

async function loadVoices({ reload = false } = {}) {
  if (reload) cachedVoices = null;
  if (cachedVoices) return cachedVoices;

  const voicesPath = path.join(__dirname, "voice.json");
  const raw = await fs.readFile(voicesPath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    const error = new Error("voice.json must be an array");
    error.statusCode = 500;
    throw error;
  }

  cachedVoices = data;
  return cachedVoices;
}

async function handleVoices(req, res) {
  try {
    const reload =
      req.query.reload === "1" ||
      req.query.reload === "true" ||
      req.body?.reload === true;

    const voices = await loadVoices({ reload });
    return res.json({ ok: true, data: voices });
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ ok: false, error: err.message || "Unknown error" });
  }
}

// Local voices (served from voice.json). Kept as both GET/POST for compatibility.
app.get("/api/voices", handleVoices);
app.post("/api/voices", handleVoices);

app.post("/api/synthesize", async (req, res) => {
  try {
    const apiKey = requireString(req.body.apiKey, "apiKey");
    const mode = requireString(req.body.mode, "mode");
    const baseUrl = getBaseUrl(mode);

    const text = requireString(req.body.text, "text");
    const language = requireString(req.body.language, "language");
    const voice = requireString(req.body.voice, "voice");
    const returnMetadata = Boolean(req.body.return_metadata);

    const speed = optionalNumber(req.body.speed);
    const pitch = optionalNumber(req.body.pitch);
    const nFmSteps = optionalNumber(req.body.n_fm_steps);
    const seed = optionalNumber(req.body.seed);

    const body = {
      text,
      language,
      voice,
      properties: {},
      return_metadata: returnMetadata,
    };
    if (speed !== undefined) body.properties.speed = speed;
    if (pitch !== undefined) body.properties.pitch = pitch;

    if (mode === "standard") {
      if (nFmSteps !== undefined) body.n_fm_steps = nFmSteps;
      if (seed !== undefined) body.seed = seed;
    }

    const upstream = await fetch(`${baseUrl}/synthesize`, {
      method: "POST",
      headers: {
        OPENAPI_KEY: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const rawText = await upstream.text();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        ok: false,
        status: upstream.status,
        statusText: upstream.statusText,
        contentType,
        body: rawText,
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    return res.json({ ok: true, data });
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ ok: false, error: err.message || "Unknown error" });
  }
});

const port = Number(process.env.PORT || 5178);
app.listen(port, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`VARCO TTS tester running on http://127.0.0.1:${port}`);
});
