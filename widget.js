// widget.js — TSLite Prod v1
(function () {
  const SCRIPT = document.currentScript;
  const API_URL = (SCRIPT && SCRIPT.dataset.api)
    || 'https://tslite-api.onrender.com/classify';
  const REQUEST_TIMEOUT_MS = 90000;

  const $ = (s, r = document) => r.querySelector(s);
  const root = $("#tslite-root");

  if (!root) {
    console.warn("TSLite: #tslite-root not found. Insert <div id='tslite-root'></div>.");
    return;
  }

  root.innerHTML = `
    <div class="tslite-card">
      <h3 class="tslite-title">TariffSolver Lite — Quick Classify</h3>
      <form id="tslite-form" class="tslite-form" novalidate>
        <label>Description</label>
        <textarea id="tslite-desc" placeholder="e.g., Leather wallet with RFID blocking" required></textarea>
        <div class="tslite-row">
          <div class="tslite-col">
            <label>Country of Origin (optional)</label>
            <input id="tslite-coo" placeholder="China, Vietnam, USA..." />
          </div>
          <div class="tslite-col">
            <label>Declared Value (optional)</label>
            <input id="tslite-value" type="number" min="0" step="0.01" placeholder="25.00" />
          </div>
        </div>
        <button id="tslite-btn" type="submit">Classify</button>
      </form>
      <div id="tslite-status" class="tslite-status"></div>
      <div id="tslite-results" class="tslite-results"></div>
    </div>
  `;

  const form = $("#tslite-form", root);
  const btn = $("#tslite-btn", root);
  const descEl = $("#tslite-desc", root);
  const cooEl = $("#tslite-coo", root);
  const valEl = $("#tslite-value", root);
  const statusEl = $("#tslite-status", root);
  const resultsEl = $("#tslite-results", root);

  function setStatus(msg, type = "info") {
    statusEl.textContent = msg || "";
    statusEl.className = `tslite-status ${type}`;
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function isValidClassification(payload) {
    return payload && (payload.hts_code || payload.hs_code) && payload.ok !== false;
  }

  function renderResults(payload) {
    const rows = [
      ["Product", payload.product],
      ["HTS Code", payload.hts_code],
      ["Estimated Duty", payload.duty_rate],
      ["Estimated VAT", payload.vat_rate],
      ["Trade/FTA", payload.tlc],
    ];
    const warnings = (payload.warnings || []).map(w => `<li>${escapeHtml(w)}</li>`).join("");

    resultsEl.innerHTML = `
      <div class="tslite-table-wrap">
        <table class="tslite-table">
          <tbody>
            ${rows.map(([k, v]) => `
              <tr>
                <th>${escapeHtml(k)}</th><td>${escapeHtml(v || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="tslite-rationale">
        <h4>Why this code?</h4>
        <p>${escapeHtml(payload.rationale || "-")}</p>
      </div>
      ${warnings ? `<div class="tslite-warn"><ul>${warnings}</ul></div>` : ""}
      <div class="tslite-meta">Latency: ${escapeHtml(payload.latency_ms || 0)} ms</div>
    `;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    resultsEl.innerHTML = "";
    const product_description = (descEl.value || "").trim();
    const country_of_origin = (cooEl.value || "").trim() || null;
    const declared_value = valEl.value ? Number(valEl.value) : null;

    if (product_description.length < 3) {
      setStatus("Please enter a short description (3+ chars).", "error");
      return;
    }

    btn.disabled = true;
    setStatus("Classifying…", "loading");

    try {
      const res = await fetchWithTimeout(API_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ product_description, country_of_origin, declared_value })
      });

      const rawText = await res.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (jsonError) {
        data = null;
      }

      if (!res.ok) {
        const detail = data && (data.error || data.detail) ? JSON.stringify(data) : rawText;
        throw new Error(`API ${res.status}: ${detail || "Request failed"}`);
      }

      if (!isValidClassification(data)) {
        throw new Error(data && data.error ? data.error : "Unexpected API response.");
      }

      renderResults(data);
      setStatus("Done.", "success");
    } catch (err) {
      console.error(err);
      if (err && err.name === "AbortError") {
        setStatus("Request timed out. The classifier may be waking up — please try again.", "error");
      } else {
        setStatus(err && err.message ? err.message : "We couldn’t classify that. Please try again in a moment.", "error");
      }
    } finally {
      btn.disabled = false;
    }
  });
})();
