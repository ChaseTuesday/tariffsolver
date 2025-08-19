// widget.js — TSLite PROD v5 (live API, clean errors, no CSS opinion)
(function () {
  const API_URL = "https://tslite-api.onrender.com/classify";
  const VERSION = "TSLite PROD v5";

  const $ = (s, r=document) => r.querySelector(s);
  const setHTML = (el, html) => { if (el) el.innerHTML = html; };
  const setText = (el, t) => { if (el) el.textContent = t; };

  async function classify(desc) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc })
    });
    const text = await res.text();        // read raw first (better error surfacing)
    let data = null; try { data = JSON.parse(text); } catch {}
    if (!res.ok || !data) {
      const msg = (data && (data.detail || data.error || data.message)) || text || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    // Map the exact fields your API returns
    return {
      hts_code:  data.hts_code ?? "",
      product:   data.product ?? desc,
      duty_rate: data.duty_rate ?? "N/A",
      vat:       data.vat ?? "N/A",
      tlc:       data.tlc ?? "N/A",
      rationale: data.rationale ?? ""
    };
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
        <div style="font-size:12px;opacity:.6;margin-top:6px">${VERSION}</div>
      </div>
    `);
  }

  function renderError(outEl, msg) {
    setHTML(outEl, `<div class="ts-error">Classification failed: ${msg}</div>`);
  }

  function bind() {
    const form   = $("#ts-form");
    const outSel = "#ts-output";
    const btnSel = "#ts-submit";
    const inSel  = "#ts-input";

    if (!form || !$(outSel) || !$(btnSel) || !$(inSel)) {
      console.warn(`${VERSION}: required elements missing (#ts-form, #ts-input, #ts-submit, #ts-output)`);
      return;
    }

    // Avoid double-binding across SPA reloads
    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Always re-select in case DOM changed
      const input = $(inSel);
      const out   = $(outSel);
      const btn   = $(btnSel);

      const desc = (input?.value || "").trim();
      if (!desc) return renderError(out, "Please enter a description.");

      btn.disabled = true; setText(btn, "Classifying…");
      setHTML(out, `<div class="ts-loading">Working…</div>`);

      try {
        const data = await classify(desc);
        render(out, data);
      } catch (err) {
        console.error(VERSION, err);
        renderError(out, err.message || "Unknown error");
      } finally {
        btn.disabled = false; setText(btn, "Classify Product");
      }
    });

    console.log(`${VERSION} ready`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
