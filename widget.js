// widget.js — TariffSolver Lite with History/Copy/Download
(() => {
  const API_URL = "https://tslite-api.onrender.com/classify";
  const STORAGE_KEY = "tslite_history_v1";

  // ==== DOM
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

  // ==== Helpers
  const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg || ""; };
  const esc = (v) => (v == null ? "" : String(v));

  const download = (filename, text) => {
    const a = document.createElement("a");
  }
