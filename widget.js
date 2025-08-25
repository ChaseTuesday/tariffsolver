// widget.js — TariffSolver Lite with History / Copy / Download
(() => {
  // ==================== CONFIG ====================
  const API_URL = "https://tslite-api.onrender.com/classify";
  const STORAGE_KEY = "tslite_history_v1";

  // ==================== DOM =======================
  const $ = (id) => document.getElementById(id);
  const inputEl = $("productInput");
  const cooEl = $("coo");
  const valEl = $("declaredValue");
  const btnEl = $("classifyBtn");
  const outEl = $("results");
  const toolsEl = $("tools");
  const statusEl = $("apiStatus");
  const echoEl = $("apiEcho");
  const copyBtn = $("copyBtn");
  const jsonBtn = $("jsonBtn");
  const csvBtn = $("csvBtn");
  const historyEl = $("history");
  const exportAllBtn = $("exportAllBtn");
  const clearHistoryBtn = $("clearHistoryBtn");

  if (echoEl) echoEl.textContent = API_URL;

  // ==================== STATE =====================
  let lastResult = null;
  let history = loadHistory();

  // ==================== HELPERS ===================
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg || ""; };
  const esc = (v) => (v == null ? "" : String(v));

  function download(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function toCSVRow(arr) {
    return arr
      .map((cell) => {
        const s = cell == null ? "" : String(cell);
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      })
      .join(",");
  }

  // ==================== RENDER ====================
  function renderError(message) {
    outEl.innerHTML = `<div class="error">${esc(message)}</div>`;
    toolsEl.style.display = "none";
  }

  function renderResults(data) {
    // Build rows from core fields
    const baseRows = [
      ["Product", esc(data.description ?? data.product_description)],
      ["HS / HTS Code", esc(data.hts_code)],
      ["Duty Rate", esc(data.duty_rate)],
      ["Rationale", esc(data.rationale)],
    ].filter(([, v]) => v && v !== "undefined");

    // Append items[] rows (label/value)
    const itemRows = Array.isArray(data.items)
      ? data.items.map((it) => [esc(it.label), esc(it.value)])
      : [];

    const rowsHTML = [...baseRows, ...itemRows]
      .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
      .join("");

    outEl.innerHTML = `
      <table class="table">
        <thead><tr><th colspan="2">Classification Result</th></tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    `;

    toolsEl.style.display = "flex";
  }

  // ==================== HISTORY ===================
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore quota errors
    }
  }

  function addToHistory(entry) {
    history.unshift(entry); // newest first
    // keep last 200 to avoid unbounded growth
    if (history.length > 200) history.length = 200;
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    if (!historyEl) return;
    if (!history.length) {
      historyEl.innerHTML = `<li class="tiny">No classifications yet.</li>`;
      return;
    }
    historyEl.innerHTML = history
      .map((h, idx) => {
        const ts = new Date(h.timestamp).toLocaleString();
        const desc =
          h.request?.product_description ??
          h.request?.description ??
          "(no description)";
        const code = h.response?.hts_code ?? "";
        return `
          <li class="history-item" data-idx="${idx}">
            <b>${esc(desc)}</b>
            <span class="tiny">${esc(ts)} • ${esc(code)}</span>
          </li>`;
      })
      .join("");
  }

  // click history item to re-open
  function onHistoryClick(e) {
    const li = e.target.closest(".history-item");
    if (!li) return;
    const idx = Number(li.getAttribute("data-idx"));
    const item = history[idx];
    if (!item) return;
    lastResult = item.response;
    renderResults(lastResult);
    // also repopulate inputs for convenience
    if (inputEl) inputEl.value =
      item.request?.product_description ?? item.request?.description ?? "";
    if (cooEl) cooEl.value = item.request?.country_of_origin ?? item.request?.coo ?? "";
    if (valEl) valEl.value =
      typeof item.request?.declared_value === "number" ? item.request.declared_value : "";
  }

  // ==================== EXPORTS ===================
  function currentJSON() {
    if (!lastResult) return;
    download("classification.json", JSON.stringify(lastResult, null, 2));
  }

  function currentCSV() {
    if (!lastResult) return;
    // Flatten common fields + items
    const header = ["product", "hts_code", "duty_rate", "rationale"];
    const row = [
      lastResult.description ?? lastResult.product_description ?? "",
      lastResult.hts_code ?? "",
      lastResult.duty_rate ?? "",
      lastResult.rationale ?? "",
    ];
    let csv = toCSVRow(header) + "\n" + toCSVRow(row);

    if (Array.isArray(lastResult.items) && lastResult.items.length) {
      csv += "\n\n" + toCSVRow(["label", "value"]) + "\n";
      csv += lastResult.items.map((it) => toCSVRow([it.label, it.value])).join("\n");
    }
    download("classification.csv", csv);
  }

  function exportAllCSV() {
    if (!history.length) return;
    const header = [
      "timestamp",
      "product",
      "coo",
      "declared_value",
      "hts_code",
      "duty_rate",
      "rationale",
    ];
    const rows = history.map((h) => {
      const r = h.response || {};
      const req = h.request || {};
      return toCSVRow([
        new Date(h.timestamp).toISOString(),
        req.product_description ?? req.description ?? "",
        req.country_of_origin ?? req.coo ?? "",
        req.declared_value ?? "",
        r.hts_code ?? "",
        r.duty_rate ?? "",
        r.rationale ?? "",
      ]);
    });
    const csv = toCSVRow(header) + "\n" + rows.join("\n");
    download("tariffsolver_history.csv", csv);
  }

  function copyCurrent() {
    if (!lastResult) return;
    const text = JSON.stringify(lastResult, null, 2);
    navigator.clipboard.writeText(text).then(
      () => setStatus("Copied to clipboard"),
      () => setStatus("Copy failed")
    );
  }

  // ==================== ACTION ====================
  async function classify() {
    const product = (inputEl?.value || "").trim();
    const coo = (cooEl?.value || "").trim();
    const declared = valEl?.value ? Number(valEl.value) : undefined;

    if (!product) {
      renderError("Please enter a short product description.");
      inputEl?.focus();
      return;
    }

    btnEl.disabled = true;
    const oldLabel = btnEl.textContent;
    btnEl.textContent = "Classifying…";
    setStatus("Calling API…");

    try {
      // Use the exact keys your API accepts (from Swagger success)
      const payload = {
        product_description: product,
        ...(coo ? { country_of_origin: coo } : {}),
        ...(Number.isFinite(declared) ? { declared_value: declared } : {})
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text || "Request failed"}`);
      }

      const data = await res.json();
      lastResult = data;
      renderResults(data);
      addToHistory({ timestamp: Date.now(), request: payload, response: data });
      setStatus("OK");
    } catch (err) {
      renderError(err?.message || "Request failed.");
      setStatus("Error");
      console.error(err);
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = oldLabel;
    }
  }

  // ==================== WIRING ====================
  if (btnEl) btnEl.addEventListener("click", classify);
  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) classify();
    });
  }
  if (copyBtn) copyBtn.addEventListener("click", copyCurrent);
  if (jsonBtn) jsonBtn.addEventListener("click", currentJSON);
  if (csvBtn) csvBtn.addEventListener("click", currentCSV);
  if (exportAllBtn) exportAllBtn.addEventListener("click", exportAllCSV);
  if (clearHistoryBtn)
    clearHistoryBtn.addEventListener("click", () => {
      history = [];
      saveHistory();
      renderHistory();
      setStatus("History cleared");
    });
  if (historyEl) historyEl.addEventListener("click", onHistoryClick);

  // Initial render
  renderHistory();
  cooEl.value = cooEl.value || "CN";
})();
