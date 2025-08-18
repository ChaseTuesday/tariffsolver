// widget.js — TariffSolver Lite (works with /classify JSON you showed)

(function () {
  // ===== CONFIG =====
  // Point this to your live API endpoint
  const API_URL = "https://tslite-api.onrender.com/classify";
  // If you later switch to your custom domain, change to:
  // const API_URL = "https://api.tariffsolver.com/classify";

  // ===== HELPERS =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const setHTML = (el, html) => { if (el) el.innerHTML = html; };
  const setText = (el, txt) => { if (el) el.textContent = txt; };

  async function postJSON(url, payload, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);

      const text = await res.text(); // read raw first for better error surfaces
      let data = null;
      try { data = JSON.parse(text); } catch { /* not JSON */ }

      if (!res.ok) {
        const detail = (data && (data.detail || data.error || data.message)) || text || `HTTP ${res.status}`;
        throw new Error(detail);
      }
      if (!data || typeof data !== "object") {
        throw new Error("API returned empty body or non-JSON.");
      }

      // Sanity check for the keys your API returns
      const expected = ["hts_code", "product", "duty_rate", "vat", "tlc", "rationale"];
      for (const k of expected) {
        if (!(k in data)) throw new Error(`Missing expected key: ${k}`);
      }
      return data;
    } catch (err) {
      if (err.name === "AbortError") throw new Error("Request timed out (cold start or network hiccup).");
      throw err;
    }
  }

  function renderResult(outEl, d) {
    const html = `
      <div class="ts-card">
        <table class="ts-table">
          <tr><th>HTS Code</th><td>${d.hts_code ?? ""}</td></tr>
          <tr><th>Product</th><td>${d.product ?? ""}</td></tr>
          <tr><th>Duty Rate</th><td>${d.duty_rate ?? ""}</td></tr>
          <tr><th>VAT</th><td>${d.vat ?? ""}</td></tr>
          <tr><th>TLC</th><td>${d.tlc ?? ""}</td></tr>
          <tr><th>Rationale</th><td>${d.rationale ?? ""}</td></tr>
        </table>
      </div>
    `;
    setHTML(outEl, html);
  }

  function renderError(outEl, message) {
    setHTML(outEl, `<div class="ts-error">Classification failed: ${message}</div>`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const input = $("#ts-input");
    const out = $("#ts-output");
    const btn = $("#ts-submit");

    if (!input || !out || !btn) {
      console.error("Missing #ts-input, #ts-output, or #ts-submit in the page.");
      return;
    }

    const desc = (input.value || "").trim();
    if (!desc) {
      renderError(out, "Please enter a description.");
      return;
    }

    setText(btn, "Classifying…");
    btn.disabled = true;
    setHTML(out, `<div class="ts-loading">Working…</div>`);

    try {
      const data = await postJSON(API_URL, { description: desc });
      renderResult(out, data);
    } catch (err) {
      console.error("Classify failed:", err);
      renderError(out, err.message || "Unknown error");
    } finally {
      setText(btn, "Classify Product");
      btn.disabled = false;
    }
  }

  function init() {
    const form = $("#ts-form");
    if (form) form.addEventListener("submit", handleSubmit);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
