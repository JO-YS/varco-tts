const elMode = document.getElementById("mode");
const elApiKey = document.getElementById("apiKey");
const elVoice = document.getElementById("voice");
const elText = document.getElementById("text");
const elLanguage = document.getElementById("language");
const elSpeed = document.getElementById("speed");
const elPitch = document.getElementById("pitch");
const elNfm = document.getElementById("n_fm_steps");
const elSeed = document.getElementById("seed");
const elReturnMetadata = document.getElementById("return_metadata");

const elVoicesOut = document.getElementById("voicesOut");
const elSynthOut = document.getElementById("synthOut");
const elLog = document.getElementById("log");
const elPlayer = document.getElementById("player");
const elDownload = document.getElementById("download");

const elVoiceSearch = document.getElementById("voiceSearch");
const elVoiceFilterEmotion = document.getElementById("voiceFilterEmotion");
const elVoiceFilterGender = document.getElementById("voiceFilterGender");
const elVoiceFilterActor = document.getElementById("voiceFilterActor");
const elVoiceCount = document.getElementById("voiceCount");
const elVoiceSelect = document.getElementById("voiceSelect");
const elVoiceInfo = document.getElementById("voiceInfo");

const btnLoadVoices = document.getElementById("btnLoadVoices");
const btnUseFirstVoice = document.getElementById("btnUseFirstVoice");
const btnCopyVoice = document.getElementById("btnCopyVoice");
const btnSynthesize = document.getElementById("btnSynthesize");
const btnClear = document.getElementById("btnClear");

let allVoices = [];
let filteredVoices = [];
let selectedVoice = null;

let lastObjectUrl = null;

function log(line) {
  const ts = new Date().toISOString();
  elLog.textContent += `[${ts}] ${line}\n`;
  elLog.scrollTop = elLog.scrollHeight;
}

function setBusy(isBusy) {
  btnLoadVoices.disabled = isBusy;
  btnSynthesize.disabled = isBusy;
  btnUseFirstVoice.disabled = isBusy;
  btnCopyVoice.disabled = isBusy;

  elMode.disabled = isBusy;
  elVoiceSearch.disabled = isBusy;
  elVoiceFilterEmotion.disabled = isBusy;
  elVoiceFilterGender.disabled = isBusy;
  elVoiceFilterActor.disabled = isBusy;
  elVoiceSelect.disabled = isBusy;
}

function readMode() {
  return elMode.value;
}

function readApiKey() {
  return elApiKey.value.trim();
}

function updateStandardVisibility() {
  const isStandard = readMode() === "standard";
  document.querySelectorAll(".onlyStandard").forEach((node) => {
    node.style.display = isStandard ? "" : "none";
  });
}

function toNumberOrUndefined(value) {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return undefined;
  const numberValue = Number(trimmed);
  if (!Number.isFinite(numberValue)) return undefined;
  return numberValue;
}

function clearAudio() {
  elPlayer.removeAttribute("src");
  elPlayer.load();
  elDownload.setAttribute("href", "#");
  elDownload.style.pointerEvents = "none";
  elDownload.style.opacity = "0.6";
  if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
  lastObjectUrl = null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseNameEmotion(name) {
  const cleaned = String(name || "").trim();
  const match = cleaned.match(/^(.*?)(?:\(([^)]+)\))?$/);
  const baseName = (match?.[1] || "").trim();
  const emotion = (match?.[2] || "").trim();
  return { baseName: baseName || cleaned, emotion };
}

function normalizeVoice(item) {
  const uuid =
    item?.speaker_uuid ??
    item?.speakerUuid ??
    item?.uuid ??
    item?.id ??
    item?.speaker_name ??
    item?.speakerName ??
    item?.name ??
    "";

  const speakerName =
    item?.speaker_name ??
    item?.speakerName ??
    item?.name ??
    item?.display_name ??
    item?.displayName ??
    "";

  const saasName = item?.saas_name ?? item?.saasName ?? "";
  const description = item?.description ?? item?.desc ?? "";
  const tags = String(description)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const gender = tags.includes("남성")
    ? "남성"
    : tags.includes("여성")
      ? "여성"
      : "";

  const { baseName, emotion } = parseNameEmotion(speakerName);

  return {
    raw: item,
    uuid: String(uuid || ""),
    speakerName: String(speakerName || ""),
    baseName,
    emotion,
    saasName: saasName ? String(saasName) : "",
    description: description ? String(description) : "",
    tags,
    gender,
  };
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

function setOptions(selectEl, options, { placeholder = "(전체)" } = {}) {
  while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  for (const value of options) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    selectEl.appendChild(opt);
  }
}

function updateVoiceCount() {
  elVoiceCount.textContent = `전체 ${allVoices.length}개 · 표시 ${filteredVoices.length}개`;
}

function renderVoiceInfo(voice) {
  if (!voice) {
    elVoiceInfo.hidden = true;
    elVoiceInfo.innerHTML = "";
    return;
  }

  const titlePieces = [];
  if (voice.emotion) titlePieces.push(voice.emotion);
  if (voice.saasName) titlePieces.push(voice.saasName);
  if (voice.gender) titlePieces.push(voice.gender);

  const titleLine = titlePieces.length ? titlePieces.join(" · ") : "";
  const tagsHtml = voice.tags.length
    ? `<div class="pillRow">${voice.tags
        .map((t) => `<span class="pill">${escapeHtml(t)}</span>`)
        .join("")}</div>`
    : "";

  elVoiceInfo.hidden = false;
  elVoiceInfo.innerHTML = `
    <div>
      <div style="font-weight: 700">${escapeHtml(voice.speakerName || voice.uuid)}</div>
      <div class="muted" style="margin-top: 2px">${escapeHtml(voice.uuid)}${
        titleLine ? ` · ${escapeHtml(titleLine)}` : ""
      }</div>
      ${
        voice.description
          ? `<div class="muted" style="margin-top: 8px">${escapeHtml(voice.description)}</div>`
          : ""
      }
      ${tagsHtml}
    </div>
  `;
}

function setVoiceSelectOptions(voices) {
  while (elVoiceSelect.firstChild) elVoiceSelect.removeChild(elVoiceSelect.firstChild);

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "(보이스를 선택하세요)";
  elVoiceSelect.appendChild(placeholder);

  for (const v of voices) {
    if (!v.uuid) continue;
    const opt = document.createElement("option");
    opt.value = v.uuid;
    opt.textContent = v.saasName ? `${v.speakerName} · ${v.saasName}` : v.speakerName;
    opt.title = `${v.uuid}${v.description ? `\n${v.description}` : ""}`;
    elVoiceSelect.appendChild(opt);
  }
}

function applyVoiceFilters() {
  const q = elVoiceSearch.value.trim().toLowerCase();
  const emotion = elVoiceFilterEmotion.value;
  const gender = elVoiceFilterGender.value;
  const actor = elVoiceFilterActor.value;

  filteredVoices = allVoices.filter((v) => {
    if (emotion && v.emotion !== emotion) return false;
    if (gender && v.gender !== gender) return false;
    if (actor && v.saasName !== actor) return false;

    if (!q) return true;
    const haystack = [
      v.uuid,
      v.speakerName,
      v.baseName,
      v.emotion,
      v.saasName,
      v.description,
      ...v.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const current = elVoiceSelect.value;
  setVoiceSelectOptions(filteredVoices);
  updateVoiceCount();

  if (current && filteredVoices.some((v) => v.uuid === current)) {
    elVoiceSelect.value = current;
  } else {
    elVoiceSelect.value = "";
    selectedVoice = null;
    renderVoiceInfo(null);
  }
}

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    const message =
      data?.error ||
      data?.statusText ||
      `Request failed: ${res.status} ${res.statusText}`;
    const err = new Error(message);
    err.details = data;
    throw err;
  }
  return data.data;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    const message =
      data?.error ||
      data?.statusText ||
      `Request failed: ${res.status} ${res.statusText}`;
    const err = new Error(message);
    err.details = data;
    throw err;
  }
  return data.data;
}

async function loadVoices({ reload = false } = {}) {
  setBusy(true);
  try {
    log(`loading local voices${reload ? " (reload)" : ""}...`);
    const raw = await getJson(reload ? "/api/voices?reload=1" : "/api/voices");
    elVoicesOut.textContent = JSON.stringify(raw, null, 2);

    if (!Array.isArray(raw)) throw new Error("voice.json 형식이 배열이 아닙니다.");

    allVoices = raw
      .map((v) => normalizeVoice(v))
      .filter((v) => v.uuid && v.speakerName);

    setOptions(
      elVoiceFilterEmotion,
      uniqueSorted(allVoices.map((v) => v.emotion)),
      { placeholder: "(감정: 전체)" },
    );
    setOptions(elVoiceFilterGender, uniqueSorted(allVoices.map((v) => v.gender)), {
      placeholder: "(성별: 전체)",
    });
    setOptions(elVoiceFilterActor, uniqueSorted(allVoices.map((v) => v.saasName)), {
      placeholder: "(saas_name: 전체)",
    });

    applyVoiceFilters();
    log(`voices loaded (${allVoices.length} items)`);
  } finally {
    setBusy(false);
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function copyToClipboardFallback(text) {
  const tmp = document.createElement("textarea");
  tmp.value = text;
  tmp.style.position = "fixed";
  tmp.style.left = "-9999px";
  document.body.appendChild(tmp);
  tmp.focus();
  tmp.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(tmp);
  }
}

btnClear.addEventListener("click", () => {
  elVoicesOut.textContent = "(아직 불러오지 않음)";
  elSynthOut.textContent = "(아직 요청 없음)";
  elLog.textContent = "";

  allVoices = [];
  filteredVoices = [];
  selectedVoice = null;

  elVoiceSearch.value = "";
  elVoice.value = "";

  setOptions(elVoiceFilterEmotion, [], { placeholder: "(감정: 전체)" });
  setOptions(elVoiceFilterGender, [], { placeholder: "(성별: 전체)" });
  setOptions(elVoiceFilterActor, [], { placeholder: "(saas_name: 전체)" });
  setVoiceSelectOptions([]);
  updateVoiceCount();
  renderVoiceInfo(null);

  clearAudio();
  log("cleared");
});

elMode.addEventListener("change", () => {
  updateStandardVisibility();
  clearAudio();
});

btnLoadVoices.addEventListener("click", async () => {
  try {
    await loadVoices({ reload: true });
  } catch (e) {
    elVoicesOut.textContent = e.details ? JSON.stringify(e.details, null, 2) : String(e);
    log(`voices error: ${e.message || e}`);
  }
});

elVoiceSearch.addEventListener("input", () => applyVoiceFilters());
elVoiceFilterEmotion.addEventListener("change", () => applyVoiceFilters());
elVoiceFilterGender.addEventListener("change", () => applyVoiceFilters());
elVoiceFilterActor.addEventListener("change", () => applyVoiceFilters());

elVoiceSelect.addEventListener("change", () => {
  const uuid = elVoiceSelect.value;
  if (!uuid) return;
  const v = filteredVoices.find((x) => x.uuid === uuid) || null;
  selectedVoice = v;
  elVoice.value = uuid;
  renderVoiceInfo(v);
  log(`voice selected: ${uuid}`);
});

btnUseFirstVoice.addEventListener("click", () => {
  if (!filteredVoices.length) {
    log("no voices to select");
    return;
  }
  const v = filteredVoices[0];
  elVoiceSelect.value = v.uuid;
  selectedVoice = v;
  elVoice.value = v.uuid;
  renderVoiceInfo(v);
  log(`voice set to first: ${v.uuid}`);
});

btnCopyVoice.addEventListener("click", async () => {
  const value = elVoice.value.trim();
  if (!value) return;
  const ok = (await copyToClipboard(value)) || copyToClipboardFallback(value);
  log(ok ? "UUID copied" : "copy failed");
});

btnSynthesize.addEventListener("click", async () => {
  try {
    clearAudio();
    const apiKey = readApiKey();
    const mode = readMode();
    const text = elText.value.trim();
    const language = elLanguage.value.trim();
    const voice = elVoice.value.trim();

    if (!apiKey) throw new Error("OPENAPI_KEY를 입력하세요.");
    if (!voice) throw new Error("voice를 선택하거나 UUID를 입력하세요.");
    if (!text) throw new Error("text를 입력하세요.");
    if (!language) throw new Error("language를 입력하세요.");

    setBusy(true);
    log(`synthesizing (${mode})...`);

    const payload = {
      apiKey,
      mode,
      text,
      language,
      voice,
      speed: toNumberOrUndefined(elSpeed.value),
      pitch: toNumberOrUndefined(elPitch.value),
      n_fm_steps: toNumberOrUndefined(elNfm.value),
      seed: toNumberOrUndefined(elSeed.value),
      return_metadata: elReturnMetadata.value === "true",
    };

    const data = await postJson("/api/synthesize", payload);
    elSynthOut.textContent = JSON.stringify(data, null, 2);

    const audioBase64 = data?.audio;
    if (typeof audioBase64 !== "string" || audioBase64.length === 0) {
      log("no audio field found in response");
      return;
    }

    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], { type: "audio/wav" });
    lastObjectUrl = URL.createObjectURL(blob);
    elPlayer.src = lastObjectUrl;
    elDownload.href = lastObjectUrl;
    elDownload.style.pointerEvents = "auto";
    elDownload.style.opacity = "1";
    log("audio ready");
  } catch (e) {
    elSynthOut.textContent = e.details ? JSON.stringify(e.details, null, 2) : String(e);
    log(`synthesize error: ${e.message || e}`);
  } finally {
    setBusy(false);
  }
});

updateStandardVisibility();
clearAudio();
setOptions(elVoiceFilterEmotion, [], { placeholder: "(감정: 전체)" });
setOptions(elVoiceFilterGender, [], { placeholder: "(성별: 전체)" });
setOptions(elVoiceFilterActor, [], { placeholder: "(saas_name: 전체)" });
setVoiceSelectOptions([]);
updateVoiceCount();
renderVoiceInfo(null);
elText.value = elText.value || "안녕하세요. VARCO 보이스로 텍스트를 합성합니다.";

loadVoices().catch((e) => {
  elVoicesOut.textContent = e.details ? JSON.stringify(e.details, null, 2) : String(e);
  log(`voices error: ${e.message || e}`);
});
