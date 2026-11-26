/* Core: helpers, tool registry, router, navigation. */
(function () {
  "use strict";

  var FF = window.FF = {
    tools: [],
    groups: ["Tracking", "Cargo", "Time and dates", "Converters", "Reference"],
    ticks: []
  };

  FF.register = function (tool) { FF.tools.push(tool); };
  FF.onTick = function (fn) { FF.ticks.push(fn); };

  /* ---------- DOM helpers ---------- */
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); }
    else if (c.nodeType) { el.appendChild(c); }
    else { el.appendChild(document.createTextNode(String(c))); }
  }

  var h = FF.h = function (tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "value") el.value = v;
        else if (k === "checked") el.checked = !!v;
        else if (k.indexOf("on") === 0 && typeof v === "function") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };

  FF.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  FF.select = function (options, value, attrs) {
    var s = h("select", attrs || {});
    options.forEach(function (o) {
      if (typeof o === "string") o = { v: o, t: o };
      s.appendChild(h("option", { value: o.v, text: o.t }));
    });
    if (value != null) s.value = value;
    return s;
  };

  FF.numBox = function (value, attrs) {
    var a = { type: "text", inputmode: "decimal", autocomplete: "off", value: value == null ? "" : String(value) };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return h("input", a);
  };

  FF.field = function (label, control, hint) {
    return h("label", { class: "field" },
      h("span", { class: "cap", text: label }),
      control,
      hint ? h("span", { class: "hint", text: hint }) : null);
  };

  FF.checkbox = function (label, checked, onchange) {
    var box = h("input", { type: "checkbox", checked: !!checked });
    if (onchange) box.addEventListener("change", onchange);
    return { el: h("label", { class: "check" }, box, h("span", { text: label })), box: box };
  };

  FF.split = function (left, right) {
    return h("div", { class: "split" },
      h("div", { class: "inputs" }, left),
      h("aside", { class: "result", "aria-live": "polite" }, right));
  };

  FF.stat = function (label, value, cls) {
    return h("div", { class: "stat" + (cls ? " " + cls : "") },
      h("span", { class: "cap", text: label }),
      h("strong", { class: "val" }, value));
  };

  FF.table = function (headers, rows, cls) {
    var thead = h("thead", null, h("tr", null, headers.map(function (t) { return h("th", { scope: "col", text: t }); })));
    var tbody = h("tbody", null, rows.map(function (r) {
      return h("tr", null, r.map(function (c) { return h("td", null, c); }));
    }));
    return h("div", { class: "tablewrap" }, h("table", { class: cls || "" }, thead, tbody));
  };

  FF.chips = function (options, selected, onChange, single) {
    var wrap = h("div", { class: "chips", role: "group" });
    var set = {};
    selected.forEach(function (k) { set[k] = true; });
    function paint() {
      Array.prototype.forEach.call(wrap.children, function (b) {
        b.setAttribute("aria-pressed", set[b.getAttribute("data-key")] ? "true" : "false");
      });
    }
    options.forEach(function (o) {
      if (typeof o === "string") o = { v: o, t: o };
      wrap.appendChild(h("button", {
        type: "button", class: "chip", "data-key": o.v, text: o.t,
        onclick: function () {
          if (single) { set = {}; set[o.v] = true; }
          else if (set[o.v]) delete set[o.v]; else set[o.v] = true;
          paint();
          onChange(Object.keys(set));
        }
      }));
    });
    paint();
    wrap.getSelected = function () { return Object.keys(set); };
    return wrap;
  };

  FF.tabs = function (items, initial) {
    var bar = h("div", { class: "tabs", role: "tablist" });
    var body = h("div", { class: "tabbody" });
    var btns = {};
    function open(id) {
      Object.keys(btns).forEach(function (k) {
        btns[k].setAttribute("aria-selected", k === id ? "true" : "false");
      });
      FF.clear(body);
      items.forEach(function (it) { if (it.id === id) body.appendChild(typeof it.render === "function" ? it.render() : it.render); });
    }
    items.forEach(function (it) {
      btns[it.id] = h("button", { type: "button", role: "tab", class: "tab", text: it.title, onclick: function () { open(it.id); } });
      bar.appendChild(btns[it.id]);
    });
    open(initial || items[0].id);
    return h("div", { class: "tabset" }, bar, body);
  };

  /* ---------- numbers ---------- */
  FF.parse = function (t) {
    if (typeof t === "number") return t;
    var s = String(t == null ? "" : t).trim().replace(/\s/g, "");
    if (!s) return NaN;
    if (s.indexOf(",") > -1 && s.indexOf(".") === -1) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  };
  FF.val = function (el) { return FF.parse(el.value); };

  FF.fmt = function (n, max) {
    if (n == null || !isFinite(n)) return "—";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: max == null ? 2 : max }).format(n);
  };

  FF.copy = function (text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = old; }, 1400);
    };
    try { navigator.clipboard.writeText(text).then(done, done); } catch (e) { /* clipboard unavailable */ }
  };

  /* ---------- exchange rates (shared with freight cost) ---------- */
  /* Rates: the repo file (ECB, refreshed daily by the workflow) is the base.
     On top of it the page asks a free live-market rate service each time it opens,
     so the numbers follow the market (like Google or xe.com). If that service is
     unreachable, the ECB file is used. LBP keeps the rate set in manual-rates.json. */
  var LIVE_URL = "https://open.er-api.com/v6/latest/EUR";
  FF.loadRates = function () {
    if (!FF._rates) {
      FF._rates = fetch("data/rates.json?v=" + Date.now(), { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) {
          var rates = {};
          Object.keys(d.rates).forEach(function (k) { rates[k] = d.rates[k]; });
          rates[d.base] = 1;
          var out = { base: d.base, rates: rates, date: d.date, sample: !!d.sample, live: false, source: "ECB reference rates for " + d.date, notes: d.notes, updated_at: d.updated_at };
          var ctl = typeof AbortController === "function" ? new AbortController() : null;
          var timer = ctl ? setTimeout(function () { ctl.abort(); }, 6000) : null;
          return fetch(LIVE_URL, { cache: "no-store", signal: ctl ? ctl.signal : undefined })
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(function (j) {
              if (timer) clearTimeout(timer);
              if (!j || j.result !== "success" || !j.rates || !j.rates.USD || j.base_code !== "EUR") return out;
              var live = {}, lbpPerUsd = d.rates.LBP && d.rates.USD ? d.rates.LBP / d.rates.USD : null;
              Object.keys(rates).forEach(function (k) { live[k] = j.rates[k] > 0 ? j.rates[k] : rates[k]; });
              live.EUR = 1;
              if (lbpPerUsd) live.LBP = lbpPerUsd * live.USD;
              var when = j.time_last_update_unix ? new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10) : "today";
              out.rates = live; out.live = true; out.date = when;
              out.source = "Market rates for " + when + " (open.er-api.com), the same kind of rate as Google and xe.com. Fallback: ECB " + d.date + ".";
              return out;
            })
            .catch(function () { if (timer) clearTimeout(timer); return out; });
        })
        .catch(function () { return null; });
    }
    return FF._rates;
  };

  /* ---------- storage (optional) ---------- */
  FF.store = {
    get: function (k, dflt) {
      try { var v = localStorage.getItem("ff." + k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; }
    },
    set: function (k, v) { try { localStorage.setItem("ff." + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ---------- router ---------- */
  var view, current = null, HOME = { id: "home", title: "Freight toolbox" };

  function byId(id) {
    if (id === "home") return HOME;
    for (var i = 0; i < FF.tools.length; i++) if (FF.tools[i].id === id) return FF.tools[i];
    return null;
  }

  function ensureSection(tool) {
    var el = document.getElementById("tool-" + tool.id);
    if (!el) {
      el = h("section", { class: "tool", id: "tool-" + tool.id });
      el.hidden = true;
      view.appendChild(el);
    }
    if (!el.getAttribute("data-ready")) {
      if (tool.id !== "home") {
        el.insertBefore(h("header", { class: "tool-head" },
          h("h2", { text: tool.title }),
          tool.desc ? h("p", { text: tool.desc }) : null), el.firstChild);
      }
      if (tool.render) tool.render(el);
      el.setAttribute("data-ready", "1");
    }
    return el;
  }

  function route() {
    var id = location.hash.replace(/^#\/?/, "") || "home";
    var tool = byId(id);
    if (!tool) { id = "home"; tool = HOME; }
    if (current && current.onHide) { try { current.onHide(); } catch (e) { /* ignore */ } }
    var el = ensureSection(tool);
    Array.prototype.forEach.call(view.children, function (s) { s.hidden = s !== el; });
    current = tool;
    if (tool.onShow) tool.onShow();
    document.title = (tool.id === "home" ? "Freight toolbox" : tool.title + " | Freight toolbox");
    Array.prototype.forEach.call(document.querySelectorAll("#nav a, .brand-side"), function (a) {
      var on = a.getAttribute("data-id") === id;
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    closeMenu();
    window.scrollTo(0, 0);
  }

  function buildNav() {
    var nav = document.getElementById("nav");
    FF.groups.forEach(function (g) {
      var list = FF.tools.filter(function (t) { return t.group === g; });
      if (!list.length) return;
      nav.appendChild(h("div", { class: "nav-group" },
        h("div", { class: "nav-title", text: g }),
        list.map(function (t) {
          return h("a", { href: "#/" + t.id, "data-id": t.id, text: t.nav || t.title });
        })));
    });
    document.querySelector(".brand-side").setAttribute("data-id", "home");
  }

  function buildDirectory() {
    var dir = document.getElementById("directory");
    FF.groups.forEach(function (g) {
      var list = FF.tools.filter(function (t) { return t.group === g; });
      if (!list.length) return;
      dir.appendChild(h("section", { class: "dir-group" },
        h("h2", { text: g }),
        h("ul", null, list.map(function (t) {
          return h("li", null, h("a", { href: "#/" + t.id },
            h("span", { class: "dir-title", text: t.title }),
            h("span", { class: "dir-desc", text: t.desc })));
        }))));
    });
  }

  /* ---------- mobile menu ---------- */
  function closeMenu() {
    document.body.classList.remove("nav-open");
    var b = document.getElementById("menu-btn");
    if (b) b.setAttribute("aria-expanded", "false");
    var s = document.getElementById("scrim");
    if (s) s.hidden = true;
  }
  function toggleMenu() {
    var open = !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", open);
    document.getElementById("menu-btn").setAttribute("aria-expanded", open ? "true" : "false");
    document.getElementById("scrim").hidden = !open;
  }

  FF.start = function () {
    view = document.getElementById("view");
    buildNav();
    buildDirectory();
    document.getElementById("menu-btn").addEventListener("click", toggleMenu);
    document.getElementById("scrim").addEventListener("click", closeMenu);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    window.addEventListener("hashchange", route);
    route();
    setInterval(function () {
      FF.ticks.forEach(function (fn) { try { fn(); } catch (e) { /* keep ticking */ } });
    }, 1000);
    FF.ticks.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
  };
})();
