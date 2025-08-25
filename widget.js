// widget.js — TariffSolver Lite front-end
(() => {
  // ====== CONFIG =============================================================
  const API_URL = "https://tslite-api.onrender.com/classify";

  // ====== DOM ================================================================
  const $ = (id) => document.getElementById(id);
  const inputEl = $("productInput");
  const cooEl = $("coo");
  const valEl = $("declaredValue");
  const btnEl = $("classifyBtn");
  const outEl = $("results");
  const statusEl = $("apiStatus");
  const echoEl = $("apiEcho");

  if (echoEl) echoEl.textContent = API_URL;

  // ====== HELPERS ============================================================
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg || ""; };
  const esc = (v) => (v == null ? "" : String(v));

  const renderError = (message) => {
    outEl.innerHTML = `
      <div class="error">${esc(message)}</div>
    `;
  };

  const renderResults = (data) => {
    // Build rows from the top-level fields
    const baseRows = [
      ["Product", esc(data.description ?? data.product_description)],
      ["HS / HTS Code", esc(data.hts_code)],
      ["Duty Rate", esc(data.duty_rate)],
      ["Rationale", esc(data.rationale)],
    ].filter(([_, v]) => v && v !== "undefined");

    // Append items[] rows if supplied by API
    const itemRows = Array.isArray(data.items)
      ? data.items.map(it => [esc(it.label), esc(it.value)])
      : [];

    const rows = [...baseRows, ...itemRows]
      .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
      .join("");

    // Warnings (if any)
    const warnings = (data.warnings && data.warnings.length)
      ? `<div style="margin-top:8px"><span class="pill">${data.warnings.length} warning(s)</span></div>`
      : "";

    outEl.innerHTML = `
      <table class="table">
        <thead><tr><th colspan="2">Classification Result</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${warnings}
    `;
  };

  // ====== ACTION =============================================================
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
      const payload = {
        // Use the exact keys your API expects (as proven in Swagger)
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
      renderResults(data);
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

  // ====== WIRING =============================================================
  if (btnEl) btnEl.addEventListener("click", classify);
  if (inputEl) {
    // Cmd/Ctrl + Enter submits
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) classify();
    });
  }

  // Optional: prefill COO for faster testing
  cooEl.value = cooEl.value || "CN";
})();
