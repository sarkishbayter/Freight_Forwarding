/* Time and date tools. */
(function () {
  "use strict";

  var h = FF.h, fmt = FF.fmt, val = FF.val;
  function z(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- time zone engine ---------- */
  var CITIES = [
    { id: "beirut", name: "Beirut", sub: "Lebanon", tz: "Asia/Beirut" },
    { id: "dubai", name: "Dubai", sub: "UAE", tz: "Asia/Dubai" },
    { id: "riyadh", name: "Riyadh", sub: "Saudi Arabia", tz: "Asia/Riyadh" },
    { id: "doha", name: "Doha", sub: "Qatar", tz: "Asia/Qatar" },
    { id: "cairo", name: "Cairo", sub: "Egypt", tz: "Africa/Cairo" },
    { id: "istanbul", name: "Istanbul", sub: "Turkey", tz: "Europe/Istanbul" },
    { id: "athens", name: "Athens", sub: "Greece", tz: "Europe/Athens" },
    { id: "frankfurt", name: "Frankfurt", sub: "Central Europe", tz: "Europe/Berlin" },
    { id: "rotterdam", name: "Rotterdam", sub: "Netherlands", tz: "Europe/Amsterdam" },
    { id: "london", name: "London", sub: "United Kingdom", tz: "Europe/London" },
    { id: "newyork", name: "New York", sub: "USA East", tz: "America/New_York" },
    { id: "chicago", name: "Chicago", sub: "USA Central", tz: "America/Chicago" },
    { id: "losangeles", name: "Los Angeles", sub: "USA West", tz: "America/Los_Angeles" },
    { id: "saopaulo", name: "São Paulo", sub: "Brazil", tz: "America/Sao_Paulo" },
    { id: "shanghai", name: "Shanghai", sub: "China", tz: "Asia/Shanghai" },
    { id: "hongkong", name: "Hong Kong", sub: "China", tz: "Asia/Hong_Kong" },
    { id: "singapore", name: "Singapore", sub: "Singapore", tz: "Asia/Singapore" },
    { id: "tokyo", name: "Tokyo", sub: "Japan", tz: "Asia/Tokyo" },
    { id: "seoul", name: "Seoul", sub: "South Korea", tz: "Asia/Seoul" },
    { id: "mumbai", name: "Mumbai", sub: "India", tz: "Asia/Kolkata" },
    { id: "nairobi", name: "Nairobi", sub: "Kenya", tz: "Africa/Nairobi" },
    { id: "lagos", name: "Lagos", sub: "Nigeria", tz: "Africa/Lagos" },
    { id: "johannesburg", name: "Johannesburg", sub: "South Africa", tz: "Africa/Johannesburg" },
    { id: "sydney", name: "Sydney", sub: "Australia", tz: "Australia/Sydney" }
  ];
  function city(id) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i].id === id) return CITIES[i]; return CITIES[0]; }
  FF.cities = CITIES;

  var cache = {};
  function dtf(tz) {
    if (!cache[tz]) {
      cache[tz] = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short"
      });
    }
    return cache[tz];
  }
  function parts(ms, tz) {
    var o = {};
    dtf(tz).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, mo: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, s: +o.second, wd: o.weekday };
  }
  function offsetMin(ms, tz) {
    var p = parts(ms, tz);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60000);
  }
  function zonedToUtc(y, mo, d, hh, mi, tz) {
    var guess = Date.UTC(y, mo - 1, d, hh, mi);
    var o1 = offsetMin(guess, tz), t = guess - o1 * 60000, o2 = offsetMin(t, tz);
    if (o2 !== o1) t = guess - o2 * 60000;
    return t;
  }
  function utcLabel(min) {
    var s = min < 0 ? "-" : "+", a = Math.abs(min);
    return "UTC" + s + z(Math.floor(a / 60)) + ":" + z(a % 60);
  }
  function deltaLabel(min, base) {
    if (min === 0) return "Same time as " + base;
    var a = Math.abs(min), hrs = Math.floor(a / 60), m = a % 60;
    var t = hrs + (m ? " h " + m + " min" : (hrs === 1 ? " hour" : " hours"));
    if (m) t = hrs + " h " + m + " min";
    return t + (min > 0 ? " ahead of " : " behind ") + base;
  }
  function isOpen(p) { return ["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(p.wd) > -1 && p.h >= 9 && p.h < 18; }

  /* ---------- home page clock strip ---------- */
  var heroIds = ["beirut", "dubai", "frankfurt", "shanghai", "newyork"];
  var heroEls = [];
  (function () {
    var box = document.getElementById("hero-clocks");
    if (!box) return;
    heroIds.forEach(function (id) {
      var c = city(id), t = h("div", { class: "time", text: "--:--" });
      box.appendChild(h("div", { class: "hero-clock" }, h("div", { class: "city", text: c.name }), t));
      heroEls.push({ tz: c.tz, el: t });
    });
    FF.onTick(function () {
      if (!box.offsetParent) return;
      var now = Date.now();
      heroEls.forEach(function (x) { var p = parts(now, x.tz); x.el.textContent = z(p.h) + ":" + z(p.mi); });
    });
  })();

  /* ---------- world clock ---------- */
  var worldClockTick = null;
  FF.register({
    id: "world-clock", group: "Time and dates", title: "World clock",
    desc: "Live local time in your cities.",
    onShow: function () { if (worldClockTick) worldClockTick(); },
    render: function (root) {
      var selected = FF.store.get("worldclock", ["beirut", "dubai", "frankfurt", "london", "newyork", "losangeles", "shanghai", "singapore"]);
      var grid = h("div", { class: "clocks" });
      var tiles = {};

      function build() {
        FF.clear(grid); tiles = {};
        CITIES.filter(function (c) { return selected.indexOf(c.id) > -1; }).forEach(function (c) {
          var t = {
            time: h("div", { class: "time" }), date: h("div", { class: "date" }),
            off: h("div", { class: "sub" }), state: h("div", { class: "state" })
          };
          t.el = h("div", { class: "clock" + (c.id === "beirut" ? " home" : "") },
            h("div", { class: "city", text: c.name }), h("div", { class: "sub", text: c.sub }),
            t.time, t.date, t.off, t.state);
          t.tz = c.tz; tiles[c.id] = t; grid.appendChild(t.el);
        });
        if (!grid.children.length) grid.appendChild(h("p", { class: "empty", text: "Choose at least one city above." }));
        tick();
      }

      function tick() {
        if (root.hidden && root.getAttribute("data-ready")) return; /* skip work while another page is open */
        var now = Date.now(), base = offsetMin(now, "Asia/Beirut");
        Object.keys(tiles).forEach(function (id) {
          var t = tiles[id], p = parts(now, t.tz), off = offsetMin(now, t.tz);
          t.time.textContent = z(p.h) + ":" + z(p.mi) + ":" + z(p.s);
          t.date.textContent = p.wd + " " + p.d + "/" + z(p.mo) + "/" + p.y;
          t.off.textContent = utcLabel(off) + ", " + (id === "beirut" ? "your base" : deltaLabel(off - base, "Beirut"));
          var open = isOpen(p);
          t.el.className = "clock" + (id === "beirut" ? " home" : "") + (open ? " open" : "");
          t.state.textContent = open ? "Likely office hours" : (p.h >= 18 || p.h < 6 ? "Night" : "Outside office hours");
        });
      }
      worldClockTick = tick;
      FF.onTick(tick);

      var chips = FF.chips(CITIES.map(function (c) { return { v: c.id, t: c.name }; }), selected, function (sel) {
        selected = sel; FF.store.set("worldclock", sel); build();
      });
      root.appendChild(h("div", { class: "panel", style: "margin-top:0" },
        h("h3", { text: "Cities" }), chips));
      root.appendChild(grid);
      build();
    }
  });

  /* ---------- time zone converter ---------- */
  FF.register({
    id: "time-zones", group: "Time and dates", title: "Time zone converter",
    desc: "Compare the same moment across cities.",
    render: function (root) {
      var src = FF.select(CITIES.map(function (c) { return { v: c.id, t: c.name + " (" + c.sub + ")" }; }), "beirut");
      var inst = Date.now();
      function stamp(ms, tz) { var p = parts(ms, tz); return p.y + "-" + z(p.mo) + "-" + z(p.d) + "T" + z(p.h) + ":" + z(p.mi); }
      var when = h("input", { type: "datetime-local", value: stamp(inst, "Asia/Beirut") });
      var targets = FF.store.get("tzTargets", ["dubai", "shanghai", "frankfurt", "london", "newyork", "losangeles"]);
      var out = h("div", { class: "zonelist" });

      function update() {
        FF.clear(out);
        var s = city(src.value), m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(when.value);
        if (!m) { out.appendChild(h("p", { class: "empty", text: "Pick a date and time." })); return; }
        inst = zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], s.tz);
        var sp = parts(inst, s.tz), sOff = offsetMin(inst, s.tz);
        var list = [s].concat(CITIES.filter(function (c) { return targets.indexOf(c.id) > -1 && c.id !== s.id; }));
        list.forEach(function (c) {
          var p = parts(inst, c.tz), off = offsetMin(inst, c.tz);
          var dd = Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(sp.y, sp.mo - 1, sp.d)) / 864e5);
          var lab = dd === 0 ? "same day" : (dd > 0 ? "next day" : "previous day");
          out.appendChild(h("div", { class: "zone" + (c.id === s.id ? " source" : "") },
            h("div", null, h("div", { class: "city", text: c.name }), h("div", { class: "sub", text: c.sub })),
            h("div", { class: "time", text: z(p.h) + ":" + z(p.mi) }),
            h("div", { class: "when" },
              h("div", { text: p.wd + " " + p.d + "/" + z(p.mo) + "/" + p.y + ", " + lab }),
              h("div", { class: "sub" }, h("span", { class: "dot" + (isOpen(p) ? " on" : "") }), utcLabel(off) + (c.id === s.id ? "" : ", " + deltaLabel(off - sOff, s.name))))));
        });
      }

      src.addEventListener("change", function () { when.value = stamp(inst, city(src.value).tz); update(); });
      when.addEventListener("input", update);
      var now = h("button", { type: "button", class: "btn ghost", text: "Use current time", onclick: function () { inst = Date.now(); when.value = stamp(inst, city(src.value).tz); update(); } });
      var chips = FF.chips(CITIES.map(function (c) { return { v: c.id, t: c.name }; }), targets, function (sel) { targets = sel; FF.store.set("tzTargets", sel); update(); });

      root.appendChild(FF.split([
        FF.field("Time is in", src),
        FF.field("Date and time", when),
        h("div", { class: "btn-row" }, now),
        h("div", { class: "field" }, h("span", { class: "cap", text: "Show these cities" }), chips)
      ], out));
      update();
    }
  });

  /* ---------- date helpers (UTC midnight dates) ---------- */
  function pISO(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(d, n) { return new Date(d.getTime() + n * 864e5); }
  function todayUTC() { var n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
  var longFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var shortFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
  function longD(d) { return longFmt.format(d); }
  function shortD(d) { return shortFmt.format(d); }
  function diffDays(a, b) { return Math.round((b.getTime() - a.getTime()) / 864e5); }
  function addMonths(d, n) {
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(day, last)));
  }
  var WEEKENDS = { "sat-sun": [6, 0], "fri-sat": [5, 6], none: [] };
  var WEEKEND_OPTIONS = [{ v: "sat-sun", t: "Saturday and Sunday" }, { v: "fri-sat", t: "Friday and Saturday" }, { v: "none", t: "No weekends" }];
  function isoInput(d) { return h("input", { type: "date", value: d ? iso(d) : "" }); }
  function dayWord(n) { return fmt(n, 0) + (Math.abs(n) === 1 ? " day" : " days"); }
  function relToday(d) {
    var n = diffDays(todayUTC(), d);
    if (n === 0) return "today";
    return n > 0 ? "in " + dayWord(n) : dayWord(-n) + " ago";
  }
  function onAll(list, fn) { list.forEach(function (i) { i.addEventListener("input", fn); i.addEventListener("change", fn); }); }

  /* ---------- date calculator ---------- */
  FF.register({
    id: "date-calculator", group: "Time and dates", title: "Date calculator",
    desc: "Days between dates, or add and subtract days.",
    render: function (root) {
      /* tab 1: between */
      var d1 = isoInput(todayUTC()), d2 = isoInput(addDays(todayUTC(), 30));
      var both = FF.checkbox("Count both the first and the last day", false);
      var wk1 = FF.select(WEEKEND_OPTIONS, "sat-sun");
      var out1 = h("div");
      function upd1() {
        FF.clear(out1);
        var a = pISO(d1.value), b = pISO(d2.value);
        if (!a || !b) { out1.appendChild(h("p", { class: "empty", text: "Pick two dates." })); return; }
        var swapped = b < a; if (swapped) { var t = a; a = b; b = t; }
        var days = diffDays(a, b), total = days + (both.box.checked ? 1 : 0);
        var wk = Math.floor(total / 7), rem = total % 7;
        var months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
        if (addMonths(a, months) > b) months--;
        var md = diffDays(addMonths(a, months), b) + (both.box.checked ? 1 : 0);
        var work = 0, skip = WEEKENDS[wk1.value];
        for (var d = both.box.checked ? a : addDays(a, 1); d <= b; d = addDays(d, 1)) if (skip.indexOf(d.getUTCDay()) === -1) work++;
        out1.appendChild(h("div", { class: "headline" }, h("span", { class: "cap", text: "Calendar days" }),
          h("div", { class: "big" }, fmt(total, 0), h("small", { text: total === 1 ? "day" : "days" }))));
        out1.appendChild(h("div", { class: "stats" },
          FF.stat("Weeks and days", wk + " w " + rem + " d"),
          FF.stat("Months and days", months + " m " + md + " d"),
          FF.stat("Working days", fmt(work, 0), "accent")));
        if (swapped) out1.appendChild(h("p", { class: "meta", text: "The end date is before the start date, so the difference is shown as a positive number." }));
      }
      onAll([d1, d2, both.box, wk1], upd1);
      var tab1 = FF.split([
        h("div", { class: "row" }, FF.field("Start date", d1), FF.field("End date", d2)),
        FF.field("Weekend days", wk1), both.el], out1);

      /* tab 2: add / subtract */
      var d3 = isoInput(todayUTC()), n3 = FF.numBox(30), dir = FF.select([{ v: "add", t: "Add days" }, { v: "sub", t: "Subtract days" }], "add");
      var wk2 = FF.select([{ v: "cal", t: "Calendar days" }, { v: "work-sat-sun", t: "Working days, weekend Saturday and Sunday" }, { v: "work-fri-sat", t: "Working days, weekend Friday and Saturday" }], "cal");
      var out2 = h("div");
      function upd2() {
        FF.clear(out2);
        var a = pISO(d3.value), n = Math.round(val(n3));
        if (!a || !isFinite(n)) { out2.appendChild(h("p", { class: "empty", text: "Pick a date and enter the number of days." })); return; }
        var step = dir.value === "add" ? 1 : -1, res;
        if (wk2.value === "cal") res = addDays(a, step * n);
        else {
          var skip = WEEKENDS[wk2.value.slice(5)], left = Math.abs(n); res = a;
          while (left > 0) { res = addDays(res, step); if (skip.indexOf(res.getUTCDay()) === -1) left--; }
        }
        out2.appendChild(h("div", { class: "headline" }, h("span", { class: "cap", text: "Result" }), h("div", { class: "big", style: "font-size:2.4rem", text: longD(res) })));
        out2.appendChild(h("div", { class: "stats" }, FF.stat("From today", relToday(res)), FF.stat("Calendar days apart", fmt(Math.abs(diffDays(a, res)), 0))));
      }
      onAll([d3, n3, dir, wk2], upd2);
      var tab2 = FF.split([
        FF.field("Start date", d3),
        h("div", { class: "row" }, FF.field("Action", dir), FF.field("Number of days", n3)),
        FF.field("Count as", wk2)], out2);

      root.appendChild(FF.tabs([
        { id: "between", title: "Days between dates", render: function () { return tab1; } },
        { id: "add", title: "Add or subtract days", render: function () { return tab2; } }
      ]));
      upd1(); upd2();
    }
  });

  /* ---------- ETA calculator ---------- */
  FF.register({
    id: "eta", group: "Time and dates", title: "ETA calculator",
    desc: "Arrival date from departure and transit time.",
    render: function (root) {
      var etd = isoInput(todayUTC()), tt = FF.numBox(30), buf = FF.numBox(0), out1 = h("div");
      function upd1() {
        FF.clear(out1);
        var a = pISO(etd.value), t = val(tt), b = val(buf) || 0;
        if (!a || !(t >= 0)) { out1.appendChild(h("p", { class: "empty", text: "Enter the departure date and transit days." })); return; }
        var eta = addDays(a, Math.round(t));
        out1.appendChild(h("div", { class: "headline" }, h("span", { class: "cap", text: "Estimated arrival" }),
          h("div", { class: "big", style: "font-size:2.4rem", text: longD(eta) })));
        var stats = [FF.stat("From today", relToday(eta)), FF.stat("Transit", dayWord(Math.round(t)))];
        if (b > 0) stats.push(FF.stat("Latest with delay", shortD(addDays(eta, Math.round(b))), "accent"));
        out1.appendChild(h("div", { class: "stats" }, stats));
      }
      onAll([etd, tt, buf], upd1);
      var tab1 = FF.split([
        FF.field("ETD (departure date)", etd),
        h("div", { class: "row" }, FF.field("Transit time (days)", tt), FF.field("Delay buffer (days)", buf, "Optional. For congestion or rollover."))], out1);

      var eta2 = isoInput(addDays(todayUTC(), 45)), tt2 = FF.numBox(30), buf2 = FF.numBox(0), out2 = h("div");
      function upd2() {
        FF.clear(out2);
        var a = pISO(eta2.value), t = val(tt2), b = val(buf2) || 0;
        if (!a || !(t >= 0)) { out2.appendChild(h("p", { class: "empty", text: "Enter the arrival date and transit days." })); return; }
        var etd2 = addDays(a, -Math.round(t) - Math.round(b));
        var left = diffDays(todayUTC(), etd2);
        out2.appendChild(h("div", { class: "headline" }, h("span", { class: "cap", text: "Latest departure date" }),
          h("div", { class: "big", style: "font-size:2.4rem", text: longD(etd2) })));
        out2.appendChild(h("span", { class: "pill" + (left < 0 ? " bad" : " good"), text: left < 0 ? "Already passed " + dayWord(-left) + " ago" : (left === 0 ? "Departs today" : dayWord(left) + " from today") }));
      }
      onAll([eta2, tt2, buf2], upd2);
      var tab2 = FF.split([
        FF.field("Target arrival date", eta2),
        h("div", { class: "row" }, FF.field("Transit time (days)", tt2), FF.field("Delay buffer (days)", buf2, "Optional."))], out2);

      root.appendChild(FF.tabs([
        { id: "fwd", title: "ETD to ETA", render: function () { return tab1; } },
        { id: "rev", title: "Arrival date to ETD", render: function () { return tab2; } }
      ]));
      upd1(); upd2();
    }
  });

  /* ---------- transit time ---------- */
  var TRANSIT_PRESETS = {
    sea: { t: "Sea freight, FCL", legs: [["Pickup and gate-in at origin port", 3], ["Wait for vessel", 3], ["Ocean transit", 25], ["Transshipment wait", 4], ["Discharge and customs", 4], ["Delivery to consignee", 2]] },
    lcl: { t: "Sea freight, LCL", legs: [["Collection and CFS cut-off", 4], ["Consolidation and loading", 5], ["Ocean transit", 28], ["Deconsolidation at CFS", 5], ["Customs and delivery", 3]] },
    air: { t: "Air freight", legs: [["Pickup and airline acceptance", 1], ["Flight and connections", 2], ["Customs clearance", 1], ["Delivery", 1]] },
    road: { t: "Road freight", legs: [["Loading and departure", 1], ["Driving", 4], ["Border and customs", 1], ["Delivery", 1]] },
    custom: { t: "Custom, start empty", legs: [["Leg 1", 1]] }
  };
  var SEG_COLORS = ["#14559f", "#1b6fd1", "#0a2a52", "#2f7fdc", "#0f4a8a", "#3b78b8", "#1d5fae"];

  FF.register({
    id: "transit-time", group: "Time and dates", title: "Transit time",
    desc: "Total transit days across legs.",
    render: function (root) {
      var preset = FF.select(Object.keys(TRANSIT_PRESETS).map(function (k) { return { v: k, t: TRANSIT_PRESETS[k].t }; }), "sea");
      var start = isoInput(todayUTC());
      var legsBox = h("div", { class: "lines" }), legs = [];
      var out = h("div");

      function addLeg(name, days) {
        var r = { name: h("input", { type: "text", value: name, "aria-label": "Leg name" }), days: FF.numBox(days, { "aria-label": "Days" }) };
        r.x = h("button", { type: "button", class: "x", "aria-label": "Remove leg", text: "×", onclick: function () { legs.splice(legs.indexOf(r), 1); legsBox.removeChild(r.el); update(); } });
        r.el = h("div", { class: "line", style: "grid-template-columns:minmax(0,2fr) 90px 36px" },
          h("label", { class: "cell" }, h("span", { class: "cap", text: "Leg" }), r.name),
          h("label", { class: "cell" }, h("span", { class: "cap", text: "Days" }), r.days), r.x);
        r.name.addEventListener("input", update); r.days.addEventListener("input", update);
        legs.push(r); legsBox.appendChild(r.el);
      }
      function load(k) { FF.clear(legsBox); legs = []; TRANSIT_PRESETS[k].legs.forEach(function (l) { addLeg(l[0], l[1]); }); update(); }

      function update() {
        FF.clear(out);
        var items = legs.map(function (l) { return { n: l.name.value || "Leg", d: Math.max(0, val(l.days) || 0) }; }).filter(function (x) { return x.d > 0; });
        var total = items.reduce(function (s, x) { return s + x.d; }, 0);
        if (!total) { out.appendChild(h("p", { class: "empty", text: "Enter the days for each leg." })); return; }
        out.appendChild(h("div", { class: "headline" }, h("span", { class: "cap", text: "Total transit time" }),
          h("div", { class: "big" }, fmt(total, 0), h("small", { text: "days" }))));
        var a = pISO(start.value);
        if (a) out.appendChild(h("div", { class: "stat accent" }, h("span", { class: "cap", text: "Estimated arrival" }), h("strong", { class: "val", text: longD(addDays(a, total)) })));
        out.appendChild(h("div", { class: "timeline", role: "img", "aria-label": "Transit time by leg" }, items.map(function (x, i) {
          return h("div", { class: "seg", style: "flex:" + x.d + ";background:" + SEG_COLORS[i % SEG_COLORS.length], title: x.n + ": " + x.d + " days", text: x.d / total > 0.07 ? String(x.d) : "" });
        })));
        out.appendChild(h("div", { class: "legend" }, items.map(function (x, i) {
          return h("span", null, h("i", { style: "background:" + SEG_COLORS[i % SEG_COLORS.length] }), x.n + " (" + x.d + ")");
        })));
      }

      preset.addEventListener("change", function () { load(preset.value); });
      start.addEventListener("input", update);
      root.appendChild(FF.split([
        h("div", { class: "row" }, FF.field("Shipment type", preset), FF.field("Departure date (ETD)", start)),
        legsBox,
        h("div", { class: "btn-row" }, h("button", { type: "button", class: "btn ghost", text: "Add a leg", onclick: function () { addLeg("New leg", 1); update(); } }))
      ], out));
      load("sea");
    }
  });

  /* ---------- free time (demurrage and detention) ---------- */
  FF.register({
    id: "free-time", group: "Time and dates", title: "Free time",
    desc: "Last free day and charges for demurrage and detention.",
    render: function (root) {
      var weekend = FF.select([{ v: "none", t: "Count every calendar day" }, { v: "sat-sun", t: "Skip Saturday and Sunday" }, { v: "fri-sat", t: "Skip Friday and Saturday" }], "none");
      var hol = h("input", { type: "text", placeholder: "2026-12-25, 2027-01-01", "aria-label": "Days to skip" });
      var first = FF.checkbox("The first day counts as day 1", false);
      var out = h("div");

      function block(title, startLabel, retLabel, free) {
        var b = {
          start: isoInput(null), free: FF.numBox(free), ret: isoInput(null),
          rate: FF.numBox(""), tierAfter: FF.numBox(""), rate2: FF.numBox("")
        };
        b.el = h("div", { class: "panel", style: "margin:0;padding:16px;background:var(--fog)" },
          h("h3", { text: title }),
          h("div", { class: "row", style: "margin-top:10px" }, FF.field(startLabel, b.start), FF.field("Free days", b.free)),
          h("div", { class: "row", style: "margin-top:12px" }, FF.field(retLabel, b.ret, "Optional. Adds the charge.")),
          h("div", { class: "row", style: "margin-top:12px" },
            FF.field("Charge per day", b.rate, "Optional."),
            FF.field("Higher rate after (days)", b.tierAfter, "Optional."),
            FF.field("Higher rate per day", b.rate2)));
        b.title = title; b.title2 = retLabel;
        return b;
      }
      var dem = block("Demurrage", "Discharge date from vessel", "Container leaves the terminal on", 5);
      var det = block("Detention", "Container leaves the terminal on", "Empty container returned on", 5);

      function rules() {
        var hs = {};
        (hol.value || "").split(/[\s,;]+/).forEach(function (s) { if (pISO(s)) hs[s] = true; });
        var skip = WEEKENDS[weekend.value], firstDay = first.box.checked;
        function counts(d) { return !hs[iso(d)] && skip.indexOf(d.getUTCDay()) === -1; }
        return {
          lastFree: function (start, n) {
            if (!(n >= 1)) return null;
            var d = firstDay ? start : addDays(start, 1), c = 0, g = 0;
            while (g++ < 4000) { if (counts(d)) { c++; if (c >= n) return d; } d = addDays(d, 1); }
            return null;
          },
          used: function (start, end) {
            var d = firstDay ? start : addDays(start, 1), c = 0, g = 0;
            while (d <= end && g++ < 4000) { if (counts(d)) c++; d = addDays(d, 1); }
            return c;
          }
        };
      }

      function show(b, R) {
        var box = h("div", { style: "display:flex;flex-direction:column;gap:10px" }, h("h3", { text: b.title }));
        var s = pISO(b.start.value), n = Math.round(val(b.free));
        if (!s) { box.appendChild(h("p", { class: "empty", text: "Enter the start date." })); return box; }
        if (!(n >= 1)) { box.appendChild(h("p", { class: "empty", text: "Enter at least 1 free day." })); return box; }
        var last = R.lastFree(s, n);
        if (!last) { box.appendChild(h("p", { class: "empty", text: "Could not find the last free day. Check the days you skip." })); return box; }
        var left = diffDays(todayUTC(), last);
        box.appendChild(h("div", { class: "headline" }, h("span", { class: "cap", text: "Last free day" }),
          h("div", { class: "big", style: "font-size:2.1rem", text: longD(last) })));
        box.appendChild(h("span", { class: "pill" + (left < 0 ? " bad" : (left === 0 ? "" : " good")), text: left < 0 ? "Free time ended " + dayWord(-left) + " ago" : (left === 0 ? "Last free day is today" : dayWord(left) + " of free time left") }));
        var r = pISO(b.ret.value);
        if (r) {
          var used = R.used(s, r), over = Math.max(0, used - n), r1 = val(b.rate) || 0, r2 = val(b.rate2) || 0, t = Math.round(val(b.tierAfter)) || 0;
          var cost = (t > 0 && r2 > 0) ? Math.min(over, t) * r1 + Math.max(0, over - t) * r2 : over * r1;
          var stats = [FF.stat("Days counted", fmt(used, 0)), FF.stat("Days over", fmt(over, 0), over > 0 ? "accent" : "")];
          if (r1 > 0) stats.push(FF.stat("Charge", fmt(cost, 2), over > 0 ? "accent" : ""));
          box.appendChild(h("div", { class: "stats" }, stats));
        }
        return box;
      }

      function update() {
        FF.clear(out);
        var R = rules();
        out.appendChild(show(dem, R));
        out.appendChild(h("hr", { style: "border:0;border-top:1px solid var(--tide);width:100%;margin:2px 0" }));
        out.appendChild(show(det, R));
      }

      var all = [weekend, hol, first.box, dem.start, dem.free, dem.ret, dem.rate, dem.tierAfter, dem.rate2, det.start, det.free, det.ret, det.rate, det.tierAfter, det.rate2];
      onAll(all, update);
      root.appendChild(FF.split([
        h("div", { class: "panel", style: "margin:0;padding:16px" },
          h("h3", { text: "How days are counted" }),
          h("div", { style: "display:flex;flex-direction:column;gap:12px;margin-top:10px" },
            FF.field("Days that count", weekend),
            FF.field("Public holidays to skip", hol, "Optional. Dates as year-month-day, separated by commas."),
            first.el)),
        dem.el, det.el
      ], out));
      update();
    }
  });
})();
