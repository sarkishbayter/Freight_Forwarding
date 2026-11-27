/* Cargo tools: chargeable weight, CBM, container capacity, pallet, freight cost. */
(function () {
  "use strict";

  var h = FF.h, fmt = FF.fmt, val = FF.val;
  var UNIT = { cm: 0.01, m: 1, mm: 0.001, "in": 0.0254 };

  /* ---------- shared: editable list of cargo lines ---------- */
  FF.cargoLines = function (opts) {
    opts = opts || {};
    var listeners = [], rows = [];
    var unit = FF.select([
      { v: "cm", t: "Centimetres (cm)" }, { v: "m", t: "Metres (m)" },
      { v: "mm", t: "Millimetres (mm)" }, { v: "in", t: "Inches (in)" }
    ], "cm");
    var list = h("div", { class: "lines" });

    function changed() { listeners.forEach(function (f) { f(); }); }
    function cell(cap, input) { return h("label", { class: "cell" }, h("span", { class: "cap", text: cap }), input); }
    function refresh() { rows.forEach(function (r) { r.x.disabled = rows.length === 1; }); }

    function addRow(v) {
      v = v || {};
      var r = {
        pcs: FF.numBox(v.pcs != null ? v.pcs : 1),
        L: FF.numBox(v.L || ""), W: FF.numBox(v.W || ""), H: FF.numBox(v.H || ""),
        wt: opts.weight ? FF.numBox(v.wt || "") : null
      };
      r.x = h("button", {
        type: "button", class: "x", "aria-label": "Remove line", text: "×",
        onclick: function () { rows.splice(rows.indexOf(r), 1); list.removeChild(r.el); refresh(); changed(); }
      });
      r.el = h("div", { class: "line" + (opts.weight ? "" : " nowt") },
        cell("Pieces", r.pcs), cell("Length", r.L), cell("Width", r.W), cell("Height", r.H),
        r.wt ? cell("Weight per piece (kg)", r.wt) : null, r.x);
      [r.pcs, r.L, r.W, r.H, r.wt].forEach(function (i) { if (i) i.addEventListener("input", changed); });
      rows.push(r); list.appendChild(r.el); refresh();
    }

    unit.addEventListener("change", changed);
    addRow(opts.first);

    var el = h("div", { class: "cargo", style: "display:flex;flex-direction:column;gap:16px" },
      h("div", { class: "row" }, FF.field("Dimension unit", unit)),
      list,
      h("div", { class: "btn-row" }, h("button", {
        type: "button", class: "btn ghost", text: "Add another line",
        onclick: function () { addRow(); changed(); }
      })));

    return {
      el: el,
      onChange: function (fn) { listeners.push(fn); },
      getLines: function () {
        var f = UNIT[unit.value], out = [];
        rows.forEach(function (r) {
          var p = val(r.pcs), l = val(r.L), w = val(r.W), hh = val(r.H), wt = r.wt ? val(r.wt) : 0;
          if (!(p > 0) || !(l > 0) || !(w > 0) || !(hh > 0)) return;
          out.push({ pcs: p, l: l * f, w: w * f, h: hh * f, wt: wt > 0 ? wt : 0 });
        });
        return out;
      }
    };
  };

  FF.cargoTotals = function (lines) {
    var t = { pieces: 0, cbm: 0, weight: 0 };
    lines.forEach(function (x) {
      t.pieces += x.pcs; t.cbm += x.pcs * x.l * x.w * x.h; t.weight += x.pcs * x.wt;
    });
    return t;
  };

  function bar(label, value, max, win, unitText) {
    return h("div", { class: "bar" + (win ? " win" : "") },
      h("span", { text: label }),
      h("div", { class: "track" }, h("div", { class: "fill", style: "width:" + (max > 0 ? Math.max(2, value / max * 100) : 0) + "%" })),
      h("span", { class: "num", text: fmt(value, 1) + " " + unitText }));
  }

  /* ---------- chargeable weight ---------- */
  FF.register({
    id: "chargeable-weight", group: "Cargo", title: "Chargeable weight",
    desc: "Actual versus volumetric weight.",
    render: function (root) {
      var modes = {
        air: { t: "Air freight (6,000 cm³ per kg)", f: 1000000 / 6000, half: true, note: "IATA rule: 1 m³ = 166.7 kg. Total is rounded up to the next 0.5 kg." },
        express: { t: "Express courier (5,000 cm³ per kg)", f: 200, half: true, note: "Most couriers use 1 m³ = 200 kg. Check your carrier, some use other divisors." },
        sea: { t: "Sea LCL (1 m³ = 1,000 kg)", f: 1000, half: false, note: "LCL is charged per weight/measurement ton: the larger of tonnes and cubic metres." },
        road: { t: "Road groupage (1 m³ = 333 kg)", f: 333, half: false, note: "Common European road rule is 333 kg per m³. Some lanes use loading metres instead." }
      };
      var mode = FF.select(Object.keys(modes).map(function (k) { return { v: k, t: modes[k].t }; }), "air");
      var lines = FF.cargoLines({ weight: true, first: { pcs: 1 } });
      var out = h("div");

      function update() {
        var ls = lines.getLines(), m = modes[mode.value];
        FF.clear(out);
        if (!ls.length) { out.appendChild(h("p", { class: "empty", text: "Enter pieces and dimensions to see the chargeable weight." })); return; }
        var t = FF.cargoTotals(ls);
        var vol = t.cbm * m.f, gross = t.weight;
        var charge = Math.max(gross, vol);
        if (m.half) charge = Math.ceil(charge * 2 - 1e-9) / 2;
        var volWins = vol >= gross;
        var max = Math.max(gross, vol);
        out.appendChild(h("div", { class: "headline" },
          h("span", { class: "cap", text: "Chargeable weight" }),
          h("div", { class: "big" }, fmt(charge, m.half ? 1 : 1), h("small", { text: "kg" }))));
        out.appendChild(h("span", { class: "pill", text: gross <= 0 ? "Enter weights to compare" : (volWins ? "Volume decides" : "Weight decides") }));
        out.appendChild(h("div", { class: "bars" },
          bar("Actual", gross, max, !volWins && gross > 0, "kg"),
          bar("Volumetric", vol, max, volWins && gross > 0, "kg")));
        var stats = h("div", { class: "stats" },
          FF.stat("Pieces", fmt(t.pieces, 0)),
          FF.stat("Volume", fmt(t.cbm, 3) + " m³"),
          gross > 0 ? FF.stat("Density", fmt(gross / t.cbm, 0) + " kg/m³") : null,
          mode.value === "sea" ? FF.stat("Revenue tons (W/M)", fmt(Math.max(gross / 1000, t.cbm), 3), "accent") : null);
        out.appendChild(stats);
      }

      lines.onChange(update);
      mode.addEventListener("change", update);
      root.appendChild(FF.split(
        [FF.field("Transport mode", mode), lines.el],
        out));
      update();
    }
  });

  /* ---------- CBM / volume ---------- */
  FF.register({
    id: "cbm", group: "Cargo", title: "CBM and volume",
    desc: "Total cubic metres and feet.",
    render: function (root) {
      var lines = FF.cargoLines({ weight: true, first: { pcs: 1 } });
      var out = h("div");
      function update() {
        var ls = lines.getLines();
        FF.clear(out);
        if (!ls.length) { out.appendChild(h("p", { class: "empty", text: "Enter pieces and dimensions to see the volume." })); return; }
        var t = FF.cargoTotals(ls);
        out.appendChild(h("div", { class: "headline" },
          h("span", { class: "cap", text: "Total volume" }),
          h("div", { class: "big" }, fmt(t.cbm, 3), h("small", { text: "CBM" }))));
        out.appendChild(h("div", { class: "stats" },
          FF.stat("Cubic feet", fmt(t.cbm * 35.3146667, 2) + " ft³"),
          FF.stat("Pieces", fmt(t.pieces, 0)),
          t.weight > 0 ? FF.stat("Gross weight", fmt(t.weight, 1) + " kg") : null,
          t.weight > 0 ? FF.stat("Density", fmt(t.weight / t.cbm, 0) + " kg/m³") : null));
        out.appendChild(FF.table(["Pieces", "Size in metres", "CBM per piece", "Line total"], ls.map(function (x) {
          var per = x.l * x.w * x.h;
          return [fmt(x.pcs, 0), fmt(x.l, 3) + " × " + fmt(x.w, 3) + " × " + fmt(x.h, 3), fmt(per, 4), fmt(per * x.pcs, 3)];
        })));
      }
      lines.onChange(update);
      root.appendChild(FF.split(lines.el, out));
      update();
    }
  });

  /* ---------- container capacity ---------- */
  var CONTAINERS = [
    { id: "20GP", name: "20 ft standard", l: 5.898, w: 2.352, h: 2.393, cbm: 33.2, payload: 28200 },
    { id: "40GP", name: "40 ft standard", l: 12.032, w: 2.352, h: 2.393, cbm: 67.7, payload: 26700 },
    { id: "40HC", name: "40 ft high cube", l: 12.032, w: 2.352, h: 2.698, cbm: 76.3, payload: 26500 },
    { id: "45HC", name: "45 ft high cube", l: 13.556, w: 2.352, h: 2.698, cbm: 86.0, payload: 27600 }
  ];

  function perms(a, b, c, upright) {
    if (upright) return [[a, b, c], [b, a, c]];
    return [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
  }

  function bestFit(box, dims, upright) {
    var best = { n: 0 };
    perms(dims[0], dims[1], dims[2], upright).forEach(function (p) {
      var n = Math.floor(box.l / p[0] + 1e-9) * Math.floor(box.w / p[1] + 1e-9) * Math.floor(box.h / p[2] + 1e-9);
      if (n > best.n) best = { n: n, p: p };
    });
    return best;
  }

  /* Pallets on a container floor: fill the width with up to two strips, each strip turned its own way. */
  function stripCount(L, W, a, b) {
    var best = 0, o = [[a, b], [b, a]];
    o.forEach(function (o1) {
      o.forEach(function (o2) {
        var maxK = Math.floor(W / o1[1] + 1e-9);
        for (var k = 0; k <= maxK; k++) {
          var n1 = k * Math.floor(L / o1[0] + 1e-9);
          var n2 = Math.floor((W - k * o1[1]) / o2[1] + 1e-9) * Math.floor(L / o2[0] + 1e-9);
          if (n1 + n2 > best) best = n1 + n2;
        }
      });
    });
    return best;
  }
  function floorSpots(L, W, a, b) { return Math.max(stripCount(L, W, a, b), stripCount(W, L, a, b)); }

  FF.register({
    id: "container-capacity", group: "Cargo", title: "Container capacity",
    desc: "How many cartons or pallets fit in a container.",
    render: function (root) {
      var mode = "cartons";
      var L = FF.numBox(""), W = FF.numBox(""), H = FF.numBox(""), wt = FF.numBox(""), qty = FF.numBox("");
      var up = FF.checkbox("Keep cartons this way up", true);

      var preset = FF.select(Object.keys(PALLETS).map(function (k) { return { v: k, t: PALLETS[k].t }; }), "eur");
      var pL = FF.numBox(120), pW = FF.numBox(80), pH = FF.numBox(""), pKg = FF.numBox(""), pQty = FF.numBox(""), pStack = FF.numBox(2);
      var stackable = FF.checkbox("Pallets can be stacked", false);
      var out = h("div");

      var cartonBox = h("div", { style: "display:flex;flex-direction:column;gap:16px" },
        h("div", { class: "row" }, FF.field("Carton length (cm)", L), FF.field("Width (cm)", W), FF.field("Height (cm)", H)),
        h("div", { class: "row" }, FF.field("Weight per carton (kg)", wt, "Optional. Adds the weight limit."), FF.field("Total cartons to ship", qty, "Optional. Shows containers needed.")),
        up.el);
      var palletBox = h("div", { style: "display:none;flex-direction:column;gap:16px" },
        FF.field("Pallet type", preset),
        h("div", { class: "row" }, FF.field("Pallet length (cm)", pL, "Include any cargo overhang."), FF.field("Pallet width (cm)", pW)),
        h("div", { class: "row" }, FF.field("Loaded height (cm)", pH, "Cargo plus the pallet itself."), FF.field("Gross weight per pallet (kg)", pKg, "Cargo plus pallet. Optional, adds the weight limit.")),
        stackable.el,
        h("div", { class: "row" }, FF.field("Pallets high when stacked", pStack, "Used only if stacking is allowed."), FF.field("Total pallets to ship", pQty, "Optional. Shows containers needed.")));

      preset.addEventListener("change", function () { var p = PALLETS[preset.value]; pL.value = p.L; pW.value = p.W; update(); });

      function render(rows, unit, headCols) {
        var best = rows.reduce(function (m, r) { return r.load > m.load ? r : m; }, rows[0]);
        var n = mode === "cartons" ? val(qty) : val(pQty);
        out.appendChild(h("div", { class: "headline" },
          h("span", { class: "cap", text: "Most " + unit + " in one container (" + best.ct.name + ")" }),
          h("div", { class: "big" }, fmt(best.load, 0), h("small", { text: unit }))));
        out.appendChild(FF.table(headCols, rows.map(function (r) { return r.cells; })));
        if (n > 0) {
          out.appendChild(h("div", { class: "stats" }, rows.map(function (r) {
            var c = r.load > 0 ? Math.ceil(n / r.load) : 0;
            return FF.stat(fmt(n, 0) + " " + unit + " in " + r.ct.id, c > 0 ? fmt(c, 0) + (c === 1 ? " container" : " containers") : "Does not fit");
          })));
        }
      }

      function update() {
        FF.clear(out);
        if (mode === "cartons") {
          var a = val(L), b = val(W), c = val(H), kg = val(wt);
          if (!(a > 0 && b > 0 && c > 0)) { out.appendChild(h("p", { class: "empty", text: "Enter the carton size to see how many fit in each container." })); return; }
          var dims = [a / 100, b / 100, c / 100];
          var rows = CONTAINERS.map(function (ct) {
            var f = bestFit(ct, dims, up.box.checked), byVol = f.n;
            var byWt = kg > 0 ? Math.floor(ct.payload / kg) : Infinity, load = Math.min(byVol, byWt);
            var util = load * dims[0] * dims[1] * dims[2] / (ct.l * ct.w * ct.h) * 100;
            return { ct: ct, load: load, cells: [h("strong", { text: ct.id }), fmt(byVol, 0), byWt === Infinity ? h("span", { class: "dash", text: "not set" }) : fmt(byWt, 0), h("strong", { text: fmt(load, 0) }), kg > 0 && byWt < byVol ? "Weight" : "Volume", fmt(util, 0) + "%"] };
          });
          render(rows, "cartons", ["Container", "By volume", "By weight", "Loadable", "Limited by", "Space used"]);
        } else {
          var pl = val(pL), pw = val(pW), ph = val(pH), pk = val(pKg);
          if (!(pl > 0 && pw > 0 && ph > 0)) { out.appendChild(h("p", { class: "empty", text: "Enter the pallet length, width and loaded height to see how many fit in each container." })); return; }
          var maxStack = stackable.box.checked ? Math.max(1, Math.floor(val(pStack)) || 1) : 1;
          var rowsP = CONTAINERS.map(function (ct) {
            var spots = ph / 100 <= ct.h ? floorSpots(ct.l, ct.w, pl / 100, pw / 100) : 0;
            var layers = Math.max(0, Math.min(maxStack, Math.floor(ct.h / (ph / 100) + 1e-9)));
            var bySpace = spots * layers;
            var byWt = pk > 0 ? Math.floor(ct.payload / pk) : Infinity, load = Math.min(bySpace, byWt);
            var util = load * (pl / 100) * (pw / 100) * (ph / 100) / (ct.l * ct.w * ct.h) * 100;
            var limitedBy = pk > 0 && byWt < bySpace ? "weight" : "space";
            return { ct: ct, load: load, cells: [h("strong", { text: ct.id }), fmt(spots, 0) + " \u00d7 " + fmt(layers, 0) + " high", fmt(bySpace, 0), byWt === Infinity ? h("span", { class: "dash", text: "not set" }) : fmt(byWt, 0), h("div", null, h("strong", { text: fmt(load, 0) }), h("div", { class: "sub", style: "font-size:0.78rem;color:var(--muted)", text: "limited by " + limitedBy + ", " + fmt(util, 0) + "% full" }))] };
          });
          render(rowsP, "pallets", ["Container", "Floor", "By space", "By weight", "Loadable"]);
        }
      }

      var chips = FF.chips([{ v: "cartons", t: "Loose cartons" }, { v: "pallets", t: "Pallets" }], ["cartons"], function (sel) {
        mode = sel[0] || "cartons";
        cartonBox.style.display = mode === "cartons" ? "flex" : "none";
        palletBox.style.display = mode === "pallets" ? "flex" : "none";
        update();
      }, true);

      [L, W, H, wt, qty, pL, pW, pH, pKg, pQty, pStack].forEach(function (i) { i.addEventListener("input", update); });
      up.box.addEventListener("change", update);
      stackable.box.addEventListener("change", update);
      root.appendChild(FF.split([
        h("div", { class: "field" }, h("span", { class: "cap", text: "What are you loading?" }), chips),
        cartonBox, palletBox
      ], out));
      update();
    }
  });

  /* ---------- pallet ---------- */
  var PALLETS = {
    eur: { t: "EUR / EPAL (120 × 80 cm)", L: 120, W: 80, H: 14.4, kg: 25 },
    eur2: { t: "EUR 2 (120 × 100 cm)", L: 120, W: 100, H: 14.4, kg: 30 },
    us: { t: "US standard (48 × 40 in)", L: 121.9, W: 101.6, H: 14.5, kg: 20 },
    asia: { t: "Asia / ISO (110 × 110 cm)", L: 110, W: 110, H: 15, kg: 25 },
    custom: { t: "Custom size", L: 120, W: 80, H: 14.4, kg: 25 }
  };

  function palletSvg(PL, PW, cw, cd, cols, rows) {
    var ns = "http://www.w3.org/2000/svg", pad = Math.max(PL, PW) * 0.03;
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", [-pad, -pad, PL + pad * 2, PW + pad * 2].join(" "));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Top view of one pallet layer: " + cols + " by " + rows + " cartons");
    function rect(x, y, w, hh, fill, stroke, sw) {
      var r = document.createElementNS(ns, "rect");
      r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", w); r.setAttribute("height", hh);
      r.setAttribute("fill", fill); r.setAttribute("stroke", stroke); r.setAttribute("stroke-width", sw); r.setAttribute("rx", PL * 0.004);
      svg.appendChild(r);
    }
    rect(0, 0, PL, PW, "#dcebf9", "#8db5e2", PL * 0.006);
    var ox = (PL - cols * cw) / 2, oy = (PW - rows * cd) / 2, gap = PL * 0.003;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      rect(ox + i * cw + gap, oy + j * cd + gap, cw - gap * 2, cd - gap * 2, "#ffffff", "#1b6fd1", PL * 0.004);
    }
    return svg;
  }

  FF.register({
    id: "pallet", group: "Cargo", title: "Pallet calculator",
    desc: "Cartons per pallet, height, weight and volume.",
    render: function (root) {
      var preset = FF.select(Object.keys(PALLETS).map(function (k) { return { v: k, t: PALLETS[k].t }; }), "eur");
      var pL = FF.numBox(120), pW = FF.numBox(80), pH = FF.numBox(14.4), pKg = FF.numBox(25);
      var L = FF.numBox(""), W = FF.numBox(""), H = FF.numBox(""), wt = FF.numBox("");
      var maxH = FF.numBox(180), maxKg = FF.numBox(1000), qty = FF.numBox("");
      var turn = FF.checkbox("Allow cartons to be turned on any side", false);
      var out = h("div");

      preset.addEventListener("change", function () {
        var p = PALLETS[preset.value];
        pL.value = p.L; pW.value = p.W; pH.value = p.H; pKg.value = p.kg;
        update();
      });

      function update() {
        FF.clear(out);
        var PL = val(pL), PW = val(pW), PH = val(pH) || 0, PK = val(pKg) || 0;
        var a = val(L), b = val(W), c = val(H), k = val(wt) || 0, MH = val(maxH), MK = val(maxKg), n = val(qty);
        if (!(PL > 0 && PW > 0)) { out.appendChild(h("p", { class: "empty", text: "Enter the pallet size." })); return; }
        if (!(a > 0 && b > 0 && c > 0)) { out.appendChild(h("p", { class: "empty", text: "Enter the carton size to see how many fit on one pallet." })); return; }

        var best = null;
        perms(a, b, c, !turn.box.checked).forEach(function (p) {
          var nA = Math.floor(PL / p[0] + 1e-9) * Math.floor(PW / p[1] + 1e-9);
          var nB = Math.floor(PL / p[1] + 1e-9) * Math.floor(PW / p[0] + 1e-9);
          var flip = nB > nA, per = flip ? nB : nA;
          var cw = flip ? p[1] : p[0], cd = flip ? p[0] : p[1];
          var layers = MH > 0 ? Math.floor((MH - PH) / p[2] + 1e-9) : 1;
          var total = per * Math.max(layers, 0);
          if (k > 0 && MK > 0) total = Math.min(total, Math.floor((MK - PK) / k + 1e-9));
          if (!best || total > best.total) best = { total: total, per: per, h: p[2], cw: cw, cd: cd, cols: Math.floor(PL / cw + 1e-9), rows: Math.floor(PW / cd + 1e-9) };
        });

        if (!best || best.total <= 0) {
          out.appendChild(h("p", { class: "note", text: "No carton fits within the height or weight limit. Check the carton size and the limits." }));
          return;
        }
        var layersUsed = Math.ceil(best.total / best.per);
        var height = PH + layersUsed * best.h;
        var gross = PK + best.total * k;
        var cbm = PL * PW * height / 1e6;
        var weightLimited = k > 0 && MK > 0 && Math.floor((MK - PK) / k + 1e-9) < best.per * Math.floor(Math.max(0, (MH - PH)) / best.h + 1e-9);

        out.appendChild(h("div", { class: "headline" },
          h("span", { class: "cap", text: "Cartons per pallet" }),
          h("div", { class: "big" }, fmt(best.total, 0), h("small", { text: layersUsed + " layers of " + best.per }))));
        if (weightLimited) out.appendChild(h("span", { class: "pill", text: "Weight limit decides" }));
        out.appendChild(h("div", { class: "diagram" }, palletSvg(PL, PW, best.cw, best.cd, best.cols, best.rows)));
        out.appendChild(h("div", { class: "stats" },
          FF.stat("Stack height", fmt(height, 1) + " cm"),
          FF.stat("Pallet volume", fmt(cbm, 3) + " m³"),
          k > 0 ? FF.stat("Gross weight", fmt(gross, 1) + " kg") : null,
          n > 0 ? FF.stat(fmt(n, 0) + " cartons need", fmt(Math.ceil(n / best.total), 0) + (Math.ceil(n / best.total) === 1 ? " pallet" : " pallets"), "accent") : null));
      }

      [pL, pW, pH, pKg, L, W, H, wt, maxH, maxKg, qty].forEach(function (i) { i.addEventListener("input", update); });
      turn.box.addEventListener("change", update);
      root.appendChild(FF.split([
        h("h3", { text: "Pallet" }),
        FF.field("Pallet type", preset),
        h("div", { class: "row" }, FF.field("Length (cm)", pL), FF.field("Width (cm)", pW), FF.field("Height (cm)", pH), FF.field("Empty weight (kg)", pKg)),
        h("h3", { text: "Carton" }),
        h("div", { class: "row" }, FF.field("Length (cm)", L), FF.field("Width (cm)", W), FF.field("Height (cm)", H), FF.field("Weight (kg)", wt)),
        h("h3", { text: "Limits" }),
        h("div", { class: "row" },
          FF.field("Max stack height (cm)", maxH, "About 150 to 160 for air, 180 to 220 for road and sea. Includes the pallet."),
          FF.field("Max gross weight (kg)", maxKg, "Pallet and cargo together."),
          FF.field("Total cartons", qty, "Optional.")),
        turn.el
      ], out));
      update();
    }
  });

  /* ---------- freight cost ---------- */
  FF.register({
    id: "freight-cost", group: "Cargo", title: "Freight cost",
    desc: "Freight rate, extra charges and markup.",
    render: function (root) {
      var basisDefs = {
        kg: { t: "Per kg", q: "Chargeable weight (kg)", unit: "kg" },
        cbm: { t: "Per CBM", q: "Volume (CBM)", unit: "CBM" },
        container: { t: "Per container", q: "Number of containers", unit: "container" },
        shipment: { t: "Lump sum", q: "Shipments", unit: "shipment" }
      };
      var basis = FF.select(Object.keys(basisDefs).map(function (k) { return { v: k, t: basisDefs[k].t }; }), "kg");
      var qtyLabel = h("span", { class: "cap", text: basisDefs.kg.q });
      var qty = FF.numBox(""), rate = FF.numBox(""), minCharge = FF.numBox(""), markup = FF.numBox("");
      var cur = FF.select(["USD", "EUR", "GBP", "AED"], "USD");
      var also = FF.select(["EUR", "USD", "GBP", "AED"], "EUR");
      var charges = h("div", { class: "lines" });
      var chargeRows = [];
      var out = h("div");
      var rateData = null;

      function addCharge(name, per) {
        var r = { name: h("input", { type: "text", value: name || "", placeholder: "Charge name", "aria-label": "Charge name" }), amt: FF.numBox("", { "aria-label": "Amount" }), per: FF.select([{ v: "flat", t: "Flat" }, { v: "unit", t: "Per unit" }], per || "flat", { "aria-label": "Charged as" }) };
        r.x = h("button", { type: "button", class: "x", "aria-label": "Remove charge", text: "×", onclick: function () { chargeRows.splice(chargeRows.indexOf(r), 1); charges.removeChild(r.el); update(); } });
        r.el = h("div", { class: "line", style: "grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr) 36px" }, r.name, r.amt, r.per, r.x);
        [r.name, r.amt, r.per].forEach(function (i) { i.addEventListener("input", update); i.addEventListener("change", update); });
        chargeRows.push(r); charges.appendChild(r.el);
      }
      ["Origin charges", "Documentation", "Destination charges", "Customs clearance"].forEach(function (n) { addCharge(n); });

      function setCurrencies(list) {
        var c0 = cur.value, a0 = also.value;
        [cur, also].forEach(function (s) {
          FF.clear(s);
          list.forEach(function (c) { s.appendChild(h("option", { value: c, text: c })); });
        });
        cur.value = list.indexOf(c0) > -1 ? c0 : "USD";
        also.value = list.indexOf(a0) > -1 ? a0 : (list.indexOf("EUR") > -1 ? "EUR" : list[0]);
      }

      function update() {
        var b = basisDefs[basis.value];
        qtyLabel.textContent = b.q;
        FF.clear(out);
        var q = basis.value === "shipment" ? 1 : val(qty), r = val(rate);
        if (!(q > 0) || !(r >= 0)) { out.appendChild(h("p", { class: "empty", text: "Enter the quantity and the rate to see the total." })); return; }
        var base = q * r, minc = val(minCharge);
        var minApplied = minc > 0 && base < minc;
        if (minApplied) base = minc;
        var extras = 0, lines = [];
        chargeRows.forEach(function (c) {
          var a = val(c.amt);
          if (!(a > 0)) return;
          var v = c.per.value === "unit" ? a * q : a;
          extras += v; lines.push([c.name.value || "Charge", v]);
        });
        var sub = base + extras, mk = val(markup) > 0 ? sub * val(markup) / 100 : 0, total = sub + mk;
        var C = cur.value;
        out.appendChild(h("div", { class: "headline" },
          h("span", { class: "cap", text: "Total" }),
          h("div", { class: "big" }, fmt(total, 2), h("small", { text: C }))));
        if (rateData && also.value !== C && rateData.rates[C] && rateData.rates[also.value]) {
          var conv = total / rateData.rates[C] * rateData.rates[also.value];
          out.appendChild(h("div", { class: "stat accent" }, h("span", { class: "cap", text: "In " + also.value + (rateData.date ? " (rates of " + rateData.date + ")" : "") }), h("strong", { class: "val", text: fmt(conv, 2) + " " + also.value })));
        }
        var rows = [["Freight (" + fmt(q, 2) + " " + b.unit + " × " + fmt(r, 2) + ")" + (minApplied ? ", minimum applied" : ""), fmt(base, 2)]];
        lines.forEach(function (l) { rows.push([l[0], fmt(l[1], 2)]); });
        if (mk > 0) rows.push(["Markup " + fmt(val(markup), 2) + "%", fmt(mk, 2)]);
        rows.push([h("strong", { text: "Total" }), h("strong", { text: fmt(total, 2) + " " + C })]);
        var tbl = FF.table(["Item", C], rows);
        Array.prototype.forEach.call(tbl.querySelectorAll("td:last-child, th:last-child"), function (td) { td.className = "num"; });
        out.appendChild(tbl);
        var text = rows.map(function (x) { return (x[0].textContent || x[0]) + ": " + (x[1].textContent || x[1]); }).join("\n");
        var btn = h("button", { type: "button", class: "btn ghost small", text: "Copy summary", onclick: function () { FF.copy(text, btn); } });
        out.appendChild(h("div", { class: "btn-row" }, btn));
      }

      [qty, rate, minCharge, markup].forEach(function (i) { i.addEventListener("input", update); });
      [basis, cur, also].forEach(function (i) { i.addEventListener("change", update); });

      FF.loadRates().then(function (d) {
        if (!d) return;
        rateData = d;
        setCurrencies(Object.keys(d.rates).sort());
        update();
      });

      root.appendChild(FF.split([
        h("div", { class: "row" }, FF.field("Rate basis", basis), FF.field("Currency", cur)),
        h("div", { class: "row" },
          h("label", { class: "field" }, qtyLabel, qty),
          FF.field("Rate per unit", rate)),
        h("div", { class: "row" }, FF.field("Minimum freight charge", minCharge, "Optional."), FF.field("Markup (%)", markup, "Optional.")),
        h("h3", { text: "Other charges" }),
        charges,
        h("div", { class: "btn-row" }, h("button", { type: "button", class: "btn ghost", text: "Add a charge", onclick: function () { addCharge(""); } })),
        FF.field("Also show the total in", also)
      ], out));
      update();
    }
  });
  /* ---------- insurance ---------- */
  FF.register({
    id: "insurance", group: "Cargo", title: "Insurance",
    desc: "Insurance cost per shipment, with several invoices and currencies.",
    render: function (root) {
      var STORE = "insurance." + (FF.userKey || "");
      var CURS = ["USD", "EUR", "GBP", "AED"];
      var ref = h("input", { type: "text", placeholder: "Shipment reference", "aria-label": "Shipment reference" });
      var uplift = FF.numBox("10");
      var target = FF.select(CURS, "USD");
      var linesBox = h("div", { class: "lines" });
      var rows = [];
      var out = h("div");
      var rateData = null, editingId = null, current = null;
      var savedBox = h("div");
      var saveBtn = h("button", { type: "button", class: "btn", text: "Save shipment" });

      /* exact values: always 4 decimals, nothing is rounded before the final display */
      function fmt(n) { return isFinite(n) ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n) : "n/a"; }
      function curList() { return rateData ? Object.keys(rateData.rates).sort() : CURS; }
      function fillSelect(sel, keep) {
        FF.clear(sel);
        curList().forEach(function (c) { sel.appendChild(h("option", { value: c, text: c })); });
        sel.value = curList().indexOf(keep) > -1 ? keep : "USD";
      }

      function addLine(name, value, curr, rate) {
        var r = {
          name: h("input", { type: "text", value: name || "", placeholder: "Invoice no.", "aria-label": "Invoice number" }),
          val: FF.numBox(value == null ? "" : value, { "aria-label": "Invoice value", placeholder: "Invoice value" }),
          cur: h("select", { "aria-label": "Currency" }),
          rate: FF.numBox(rate == null ? "" : rate, { "aria-label": "Insurance rate in percent", placeholder: "Rate %" })
        };
        fillSelect(r.cur, curr || "USD");
        r.x = h("button", { type: "button", class: "x", "aria-label": "Remove invoice", text: "×", onclick: function () { rows.splice(rows.indexOf(r), 1); linesBox.removeChild(r.el); update(); } });
        r.el = h("div", { class: "line ins-line" }, r.name, r.val, r.cur, r.rate, r.x);
        [r.name, r.val, r.rate].forEach(function (i) { i.addEventListener("input", update); });
        r.cur.addEventListener("change", update);
        rows.push(r); linesBox.appendChild(r.el);
      }

      function convert(amount, from, to) {
        if (from === to) return amount;
        if (!rateData || !rateData.rates[from] || !rateData.rates[to]) return null;
        return amount / rateData.rates[from] * rateData.rates[to];
      }

      /* the full calculation, used for the live result and for what gets saved */
      function calc() {
        var up = val(uplift) >= 0 ? val(uplift) : 0, T = target.value, list = [], total = 0, missing = false;
        rows.forEach(function (r, i) {
          var v = val(r.val), rt = val(r.rate);
          if (!(v > 0) || !(rt > 0)) return;
          var insured = v * (1 + up / 100), prem = insured * rt / 100, inT = convert(prem, r.cur.value, T);
          if (inT == null) missing = true; else total += inT;
          list.push({ inv: r.name.value || "Invoice " + (i + 1), c: r.cur.value, v: v, insured: insured, rate: rt, prem: prem, inT: inT });
        });
        return { up: up, T: T, list: list, total: total, missing: missing };
      }

      function detailTable(c) {
        var body = c.list.map(function (d) {
          return [d.inv, d.c, fmt(d.v), fmt(d.insured), d.rate + "%", fmt(d.prem), d.inT == null ? "n/a" : fmt(d.inT)];
        });
        /* totals: in the invoices' own currency when they all share one, otherwise converted to the chosen currency */
        var same = c.list.every(function (d) { return d.c === c.list[0].c; });
        var sv = 0, si = 0, sp = 0, ok = true;
        c.list.forEach(function (d) {
          var k = same ? 1 : (d.prem > 0 && d.inT != null ? d.inT / d.prem : null);
          if (k == null) { ok = false; return; }
          sv += d.v * k; si += d.insured * k; sp += d.prem * k;
        });
        var unit = same ? c.list[0].c : c.T;
        function tot(n) { return h("strong", { text: ok ? fmt(n) : "n/a" }); }
        body.push([h("strong", { text: "Total" }), h("strong", { text: unit }), tot(sv), tot(si), "", tot(sp), h("strong", { text: fmt(c.total) + " " + c.T })]);
        var t = FF.table(["Invoice", "Cur.", "Value", "Insured +" + c.up + "%", "Rate", "Premium", "In " + c.T], body);
        Array.prototype.forEach.call(t.querySelectorAll("td:nth-child(n+3), th:nth-child(n+3)"), function (td) { td.className = "num"; });
        return t;
      }

      function update() {
        FF.clear(out);
        current = calc();
        saveBtn.disabled = !current.list.length;
        if (!current.list.length) { out.appendChild(h("p", { class: "empty", text: "Enter an invoice value and the insurance rate to see the cost." })); return; }
        out.appendChild(h("div", { class: "headline" },
          h("span", { class: "cap", text: (ref.value.trim() ? ref.value.trim() + ": total" : "Total") + " insurance cost" }),
          h("div", { class: "big" }, fmt(current.total), h("small", { text: current.T }))));
        out.appendChild(detailTable(current));
        if (current.missing) out.appendChild(h("p", { class: "meta", text: "A currency could not be converted because the rates are not loaded. Reload the page." }));
        else if (rateData && current.list.some(function (d) { return d.c !== current.T; })) out.appendChild(h("p", { class: "meta", text: "Rates of " + rateData.date }));
      }

      /* ---------- saved shipments ---------- */
      function load() { return FF.store.get(STORE, []); }
      function persist(list) { FF.store.set(STORE, list); renderSaved(); }

      function save() {
        update();
        if (!current.list.length || current.missing) return;
        var list = load();
        var rec = {
          id: editingId || String(Date.now()),
          ref: ref.value.trim() || "Shipment " + (list.length + 1),
          saved: new Date().toISOString(), ratesDate: rateData ? rateData.date : "",
          up: val(uplift) >= 0 ? val(uplift) : 0, T: target.value,
          inputs: rows.map(function (r) { return { n: r.name.value, v: r.val.value, c: r.cur.value, r: r.rate.value }; }),
          calc: current
        };
        var at = -1;
        list.forEach(function (x, i) { if (x.id === rec.id) at = i; });
        if (at > -1) list[at] = rec; else list.unshift(rec);
        persist(list);
        resetForm();
        document.getElementById("ins-saved").scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function resetForm() {
        editingId = null; ref.value = ""; uplift.value = "10";
        rows.slice().forEach(function (r) { linesBox.removeChild(r.el); });
        rows.length = 0; addLine("", "", "USD", "");
        saveBtn.textContent = "Save shipment";
        update();
      }

      function edit(rec) {
        editingId = rec.id; ref.value = rec.ref; uplift.value = String(rec.up);
        fillSelect(target, rec.T);
        rows.slice().forEach(function (r) { linesBox.removeChild(r.el); });
        rows.length = 0;
        rec.inputs.forEach(function (i) { addLine(i.n, i.v, i.c, i.r); });
        saveBtn.textContent = "Update shipment";
        update();
        root.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      var open = {};
      function renderSaved() {
        FF.clear(savedBox);
        var list = load();
        if (!list.length) { savedBox.appendChild(h("p", { class: "empty", text: "No saved shipments yet. Calculate one above and press Save shipment." })); return; }
        var trs = [], sums = {};
        list.forEach(function (rec) {
          sums[rec.T] = (sums[rec.T] || 0) + rec.calc.total;
          var when = new Date(rec.saved).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
          trs.push([
            h("strong", { text: rec.ref }), String(rec.calc.list.length), h("strong", { text: fmt(rec.calc.total) + " " + rec.T }), when,
            h("div", { class: "btn-row", style: "gap:6px" },
              h("button", { type: "button", class: "btn small", text: open[rec.id] ? "Hide" : "Details", onclick: function () { open[rec.id] = !open[rec.id]; renderSaved(); } }),
              h("button", { type: "button", class: "btn ghost small", text: "Edit", onclick: function () { edit(rec); } }),
              h("button", { type: "button", class: "btn ghost small", text: "Remove", onclick: function () { if (confirm("Remove " + rec.ref + "?")) persist(load().filter(function (x) { return x.id !== rec.id; })); } }))
          ]);
          if (open[rec.id]) {
            var cell = h("div", { class: "ins-detail" },
              h("div", { class: "meta", text: "Saved " + new Date(rec.saved).toLocaleString("en-GB") + (rec.ratesDate ? ", rates of " + rec.ratesDate : "") }),
              detailTable(rec.calc));
            trs.push([cell, "", "", "", ""]);
          }
        });
        var tbl = FF.table(["Shipment", "Invoices", "Insurance cost", "Saved", ""], trs);
        Array.prototype.forEach.call(tbl.querySelectorAll("tbody tr"), function (tr) {
          var first = tr.firstChild;
          if (first.querySelector && first.querySelector(".ins-detail")) { first.colSpan = 5; while (tr.children.length > 1) tr.removeChild(tr.lastChild); tr.className = "ins-detail-row"; }
        });
        Array.prototype.forEach.call(tbl.querySelectorAll("tr:not(.ins-detail-row) > :nth-child(2), tr:not(.ins-detail-row) > :nth-child(3)"), function (c) { c.className = "num"; });
        savedBox.appendChild(tbl);
        savedBox.appendChild(h("div", { class: "headline", style: "margin-top:12px" },
          h("span", { class: "cap", text: "All saved shipments" }),
          h("div", { class: "big", style: "font-size:1.6rem" }, Object.keys(sums).map(function (k) { return fmt(sums[k]) + " " + k; }).join("  +  "))));
      }

      ref.addEventListener("input", update);
      uplift.addEventListener("input", update);
      target.addEventListener("change", update);
      saveBtn.addEventListener("click", save);
      addLine("", "", "USD", "");

      FF.loadRates().then(function (d) {
        if (!d) return;
        rateData = d;
        fillSelect(target, target.value);
        rows.forEach(function (r) { fillSelect(r.cur, r.cur.value); });
        update();
      });

      root.appendChild(h("div", { class: "stack" }, h("div", { class: "inputs" }, [
        FF.field("Shipment", ref),
        h("div", { class: "row" },
          FF.field("Add to invoice value (%)", uplift),
          FF.field("Show the total in", target)),
        h("h3", { text: "Invoices" }),
        h("div", { class: "line ins-line ins-head" }, h("span", { text: "Invoice" }), h("span", { text: "Value" }), h("span", { text: "Currency" }), h("span", { text: "Rate (%)" }), h("span")),
        linesBox,
        h("div", { class: "btn-row" },
          h("button", { type: "button", class: "btn ghost", text: "Add an invoice", onclick: function () { addLine("", "", "USD", ""); update(); } }),
          saveBtn,
          h("button", { type: "button", class: "btn ghost", text: "New shipment", onclick: resetForm }))
      ]), h("aside", { class: "result", "aria-live": "polite" }, out)));
      root.appendChild(h("div", { class: "panel", id: "ins-saved" }, h("h3", { text: "Saved shipments" }), savedBox));
      renderSaved();
      update();
    }
  });
})();
