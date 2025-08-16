/* TariffSolver Lite - widget.js (complete)
   - Calls POST /classify (and falls back to /classify/)
   - Shows spinner, handles timeouts & errors cleanly
   - Auto-initializes on DOMContentLoaded

   Expected HTML (if you already have it):
     <div id="tslite-widget">
       <form id="tslite-form">
         <input id="tslite-input" type="text" placeholder="Describe the product…" required />
         <button id="tslite-submit" type="submit">Classify</button>
       </form>
       <div id="tslite-status"></div>
       <pre id="tslite-result"></pre>
       <pre id="tslite-error" style="color:red;"></pre>
     </div>

   If those elements do NOT exist, this script will create a minimal UI automatically.
*/

(() => {
  // ======== CONFIG ========
  const API_BASE = "https://tslite-api.onrender.com"; // Render service base
  const ENDPOINTS = ["/classify", "/classify/"];      // try both (no slash, then slash)
  const REQUEST_TIMEOUT_MS = 15000;                   // 15s

  // ======== UTILITIES ========
  const $ = (id) => document.getElementById(id);
  const setText = (id, msg) => { const el = $(id); if (el) el.textContent = msg ?? ""; };
  const setHTML = (id, html) => { const el = $(id); if (el) el.innerHTML = html ?? ""; };
  const show = (id, on = true) => { const el = $(id); if (el) el.style.display = on ? "" : "none"; };
  const disable = (id, on = true) => { const el = $(id); if (el) el.disabled = !!on; };

  function ensureMinimalUI() {
    let root = $("tslite-widget");
    if (!root) {
      root = document.createElement("div");
      root.id = "tslite-widget";
      root.style.maxWidth = "680px";
      root.style.margin = "1rem auto";
      root.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
      document.body.appendChild(root);
    }

    if (!$("tslite-form")) {
      root.innerHTML = `
        <form id="tslite-form" style="display:flex;gap:.5rem;align-items:center;">
          <input id="tslite-input" type="text" placeholder="Describe the product…" required
                 style="flex:1;padding:.7rem;border:1px solid #ccc;border-radius:6px;" />
          <button id="tslite-submit" type="submit" style="padding:.7rem 1rem;border:0;border-radius:6px;cursor:pointer;">
            Classify
          </button>
        </form>
        <div id="tslite-status" style="margin:.5rem 0;font-size:.9rem;color:#555"></div>
        <pre id="tslite-result" style="background:#0b1220;color:#cfe3ff;padding:12px;border-radius:8px;white-space:pre-wrap;"></pre>
        <pre id="tslite-error"  style="color:#b00020;white-space:pre-wrap;"></pre>
      `;
    } else {
      // Ensure placeholders for status/result/error exist
      if (!$("tslite-status")) {
        const status = document.createElement("div"); status.id = "tslite-status"; root.appendChild(status);
      }
      if (!$("tslite-result")) {
        const r = document.createElement("pre"); r.id = "tslite-result"; root.appendChild(r);
      }
      if (!$("tslite-error")) {
        const e = document.createElement("pre"); e.id = "tslite-error"; e.style.color = "red"; root.appendChild(e);
      }
    }
  }

  function spinner(on) {
    const el = $("tslite-status");
    if (!el) return;
    if (on) {
      el.innerHTML = `⏳ <em>Classifying…</em>`;
    } else {
      el.textContent = "";
    }
  }

  function toJSONSafe(textOrObj) {
    // Accept object or JSON string; try to parse if needed
    if (typeof textOrObj === "object") return textOrObj;
    try { return JSON.parse(textOrObj); } catch { return textOrObj; }
  }

  async function tryFetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(t);
    }
  }

  async function postClassify(description) {
    const options = {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    };

    let lastErr = null;

    // Try /classify then /classify/
    for (const ep of ENDPOINTS) {
      const url = API_BASE + ep;
      try {
        const res = await tryFetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);
        if (!res.ok) {
          // if 404, try the next endpoint; otherwise surface the error
          if (res.status === 404) {
            lastErr = new Error(`HTTP 404 at ${ep}`);
            continue;
          }
          let extra = "";
          try { extra = JSON.stringify(await res.json()); } catch {}
          throw new Error(`HTTP ${res.status} ${res.statusText}${extra ? " — " + extra : ""}`);
        }

        // Some backends return JSON, others return a JSON string; handle both
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return await res.json();
        } else {
          const text = await res.text();
          return toJSONSafe(text);
        }
      } catch (err) {
        lastErr = err;
        // If aborted (timeout), don't keep retrying endpoints endlessly
        if (String(err).includes("AbortError")) break;
      }
    }
    throw lastErr || new Error("Request failed");
  }

  function pretty(obj) {
    if (typeof obj === "string") return obj;
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const input = $("tslite-input");
    const btn = $("tslite-submit");

    setText("tslite-error", "");
    setText("tslite-result", "");

    const desc = (input?.value || "").trim();
    if (!desc) {
      setText("tslite-error", "Please enter a product description.");
      return;
    }

    spinner(true);
    disable("tslite-submit", true);

    try {
      const data = await postClassify(desc);
      setText("tslite-result", pretty(data));
    } catch (err) {
      setText("tslite-error", (err && err.message) ? err.message : String(err));
    } finally {
      spinner(false);
      disable("tslite-submit", false);
    }
  }

  function init() {
    ensureMinimalUI();
    const form = $("tslite-form");
    if (!form) {
      console.error("[TariffSolver Lite] Missing #tslite-form; could not initialize.");
      return;
    }
    form.addEventListener("submit", handleSubmit);
    // Optional: health ping to surface backend readiness quickly
    setHTML("tslite-status", `Ready.`);
  }

  // Auto-init on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
