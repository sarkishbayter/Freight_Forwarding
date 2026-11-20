(function () {
  "use strict";

  if (window.FF) {
    FF.register({
      id: "currency", group: "Converters", title: "Currency converter",
      desc: "Daily European Central Bank reference rates, plus the Lebanese pound at the rate you set."
    });
  }

  var amountEl = document.getElementById("amount");
  var fromEl = document.getElementById("from");
  var toEl = document.getElementById("to");
  var swapEl = document.getElementById("swap");
  var resultEl = document.getElementById("result-line");
  var rateEl = document.getElementById("rate-line");
  var sourceEl = document.getElementById("source-line");
  var bannerEl = document.getElementById("banner");

  var data = null; // { base, date, source, rates, notes, sample }
  var STORE_KEY = "calc.currency.v1";

  // ---------- helpers ----------
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function savePrefs() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        from: fromEl.value, to: toEl.value, amount: amountEl.value
      }));
    } catch (e) { /* storage unavailable: ignore */ }
  }

  var names;
  try { names = new Intl.DisplayNames(["en"], { type: "currency" }); }
  catch (e) { names = null; }
  function currencyName(code) {
    try { return names ? names.of(code) : code; } catch (e) { return code; }
  }

  // Accept "1,234.56", "1 234,56", "1234.5" etc.
  function parseAmount(text) {
    var s = String(text).trim().replace(/\s/g, "");
    if (!s) return NaN;
    var lastComma = s.lastIndexOf(",");
    var lastDot = s.lastIndexOf(".");
    if (lastComma > -1 && lastDot > -1) {
      // the later one is the decimal separator
      if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (lastComma > -1) {
      // single comma: decimal if followed by 1-2 digits, else thousands
      var after = s.length - lastComma - 1;
      s = (after <= 2 && s.indexOf(",") === lastComma) ? s.replace(",", ".") : s.replace(/,/g, "");
    }
    return /^-?\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN;
  }

  function fmt(value, code) {
    var abs = Math.abs(value);
    var max = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    if (code === "LBP" || code === "JPY" || code === "KRW" || code === "IDR" || code === "VND") {
      max = abs >= 1 ? 0 : 4;
    }
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(value);
  }

  // ---------- conversion ----------
  function rate(from, to) {
    // every rate is "units of currency per 1 base (EUR)"
    return data.rates[to] / data.rates[from];
  }

  function update() {
    if (!data) return;
    var from = fromEl.value;
    var to = toEl.value;
    var amount = parseAmount(amountEl.value);
    var r = rate(from, to);

    rateEl.textContent = "1 " + from + " = " + fmt(r, to) + " " + to +
      "   ·   1 " + to + " = " + fmt(1 / r, from) + " " + from;

    if (isNaN(amount)) {
      resultEl.textContent = "Enter a valid amount";
    } else {
      resultEl.textContent = fmt(amount, from) + " " + from + " = " + fmt(amount * r, to) + " " + to;
    }
    savePrefs();
  }

  // ---------- setup ----------
  function fillSelect(el, codes, selected) {
    el.innerHTML = "";
    codes.forEach(function (code) {
      var opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code + " — " + currencyName(code);
      el.appendChild(opt);
    });
    el.value = selected;
  }

  function init(json) {
    data = json;
    var rates = Object.assign({ [data.base]: 1 }, data.rates);
    data.rates = rates;
    var codes = Object.keys(rates).sort();

    var prefs = loadPrefs();
    var from = rates[prefs.from] ? prefs.from : "USD";
    var to = rates[prefs.to] ? prefs.to : (rates.LBP ? "LBP" : "EUR");
    if (prefs.amount) amountEl.value = prefs.amount;

    fillSelect(fromEl, codes, from);
    fillSelect(toEl, codes, to);

    var parts = [];
    if (data.date) parts.push("ECB reference rates for " + data.date);
    if (data.notes) {
      Object.keys(data.notes).forEach(function (k) { parts.push(k + ": " + data.notes[k]); });
    }
    sourceEl.textContent = parts.join(" · ");

    if (data.sample) {
      bannerEl.hidden = false;
      bannerEl.textContent = "These are sample rates. Live rates appear after the daily update workflow has run once.";
    } else if (data.date) {
      var ageDays = (Date.now() - new Date(data.date + "T00:00:00Z").getTime()) / 86400000;
      if (ageDays > 5) {
        bannerEl.hidden = false;
        bannerEl.textContent = "These rates are " + Math.floor(ageDays) + " days old. The daily update may have stopped.";
      }
    }
    update();
  }

  amountEl.addEventListener("input", update);
  fromEl.addEventListener("change", update);
  toEl.addEventListener("change", update);
  swapEl.addEventListener("click", function () {
    var f = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = f;
    update();
  });

  // cache-bust so the browser picks up each day's file
  fetch("data/rates.json?v=" + new Date().toISOString().slice(0, 10), { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(init)
    .catch(function (err) {
      resultEl.textContent = "Could not load exchange rates.";
      rateEl.textContent = String(err && err.message ? err.message : err);
    });
})();
