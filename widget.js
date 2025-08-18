// widget.js — TSLite hotfix v1
(function () {
  const API_URL = "https://tslite-api.onrender.com/classify";

  const $ = (s, r=document) => r.querySelector(s);
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
    // Map to the exact fields your API returns
    const out = {
      hts_code:   data.hts_code ?? "",
      product:    data.product ?? "",
      duty_rate:  data.duty_rate ?? "",
      vat:        data.vat ?? "",
      tlc:        data.tlc ?? "",
      rationale:  data.rationale ?? ""
    };
    return out;
  }

  function render(outEl, d) {
    setHTML(outEl, `
      <div class="ts-card">
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
      console.error(err);
      renderError(out, err.message || "Unknown error");
    } finally {
      btn.disabled = false; setText(btn, "Classify Product");
    }
  }

  // Bind once, replacing any old handler
  const form = $("#ts-form");
  if (form) {
    form.replaceWith(form.cloneNode(true)); // drop old listeners
    (document.querySelector("#ts-form") || document.body).addEventListener("submit", onSubmit);
  } else {
    console.warn("TSLite hotfix: #ts-form not found.");
  }
})();
