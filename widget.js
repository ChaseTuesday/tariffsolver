// widget.js — TSLite hotfix v3
(function () {
  const API_URL = "https://tslite-api.onrender.com/classify";
  const VERSION = "TSLite hotfix v3";

  const $ = (s, r = document) => r.querySelector(s);
  const setHTML = (el, html) => { if (el) el.innerHTML = html; };
  const setText = (el, t) => { if (el) el.textContent = t; };

  async function classify(desc) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc })
    });
    const text = await res.text();
    let data = null; try { data = JSON.parse(text); } catch {}
    if (!res.ok || !data) {
      const msg = (data && (data.detail || data.error || data.message)) || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return {
      hts_code:   data.hts_code ?? "",
      product:    data.product ?? "",
      duty_rate:  data.duty_rate ?? "",
      vat:        data.vat ?? "",
      tlc:        data.tlc ?? "",
      rationale:  data.rationale ?? ""
    };
  }

  function render(outEl, d) {
    setHTML(outEl, `
      <div class="ts-card">
        <div style="font-size:12px;opacity:.65;margin-bottom:8px">${VERSION}</div>
        <table class="ts-table">
          <tr><th>HTS Code</th><td>${d.hts_code}</td></tr>
          <tr><th>Product</th><td>${d.product}</td></tr>
          <tr><th>Duty Rate</th><td>${d.duty_rate}</td></tr>
          <tr><th>VAT</th><td>${d.vat}</td></tr>
          <tr><th>TLC</th><td>${d.tlc}</td></tr>
          <tr><th>Rationale</th><td>${d.rationale}</td></tr>
        </table>
      </div>
    `);
  }

  function renderError(outEl, msg) {
    setHTML(outEl, `<div class="ts-error">Classification failed: ${msg}</div>`);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const input = $("#ts-input");
    const out = $("#ts-output");
    const btn = $("#ts-submit");
    const desc = (input?.value || "").trim();
    if (!desc) return renderError(out, "Please enter a description.");

    btn.disabled = true; setText(btn, "Classifying…");
    setHTML(out, `<div class="ts-loading">Working…</div>`);

    try {
      const data = await classify(desc);
      render(out, data);
    } catch (err) {
      console.error("TSLite:", err);
      renderError(out, err.message || "Unknown error");
    } finally {
      btn.disabled = false; setText(btn, "Classify Product");
    }
  }

  function bind() {
    const form = $("#ts-form");
    if (!form) { console.warn("TSLite: #ts-form not found."); return; }

    // Remove any old listeners by cloning, then re-select the new node explicitly
    const fresh = form.cloneNode(true);
    form.replaceWith(fresh);
    const newForm = $("#ts-form");
    if (!newForm) { console.warn("TSLite: fresh form not found after clone."); return; }

    newForm.addEventListener("submit", onSubmit);
    console.log(`${VERSION} ready (handler attached)`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
