/* Unit converters: type in any box and the others update. */
(function () {
  "use strict";

  var h = FF.h;

  function num(v) {
    if (v === 0) return "0";
    var a = Math.abs(v);
    if (a >= 1e12 || a < 1e-6) return v.toExponential(4);
    return String(parseFloat(v.toPrecision(10)));
  }

  function factorUnit(key, label, f, note) {
    return { key: key, label: label, note: note, to: function (v) { return v * f; }, from: function (b) { return b / f; } };
  }

  function converter(root, units, opts) {
    opts = opts || {};
    var boxes = [];
    var grid = h("div", { class: "conv" });
    units.forEach(function (u, i) {
      var input = FF.numBox(i === 0 ? "1" : "", { "aria-label": u.label });
      u.input = input;
      input.addEventListener("input", function () { spread(u); });
      grid.appendChild(h("label", { class: "field" },
        h("span", { class: "cap" }, u.label, u.note ? h("em", { text: " " + u.note }) : null), input));
      boxes.push(input);
    });
    function spread(src) {
      var v = FF.val(src.input);
      units.forEach(function (u) {
        if (u === src) return;
        u.input.value = isFinite(v) ? num(u.from(src.to(v))) : "";
      });
    }
    spread(units[0]);

    var panel = h("div", { class: "inputs" }, grid);
    if (opts.presets) {
      panel.appendChild(h("div", { class: "field" },
        h("span", { class: "cap", text: opts.presets.title }),
        h("div", { class: "chips" }, opts.presets.values.map(function (p) {
          return h("button", { type: "button", class: "chip", text: p.t, onclick: function () { units[0].input.value = p.v; spread(units[0]); } });
        }))));
    }
    root.appendChild(panel);
    if (opts.facts) {
      root.appendChild(h("div", { class: "panel" }, h("h3", { text: "Quick facts" }),
        h("ul", { class: "prose", style: "margin:8px 0 0" }, opts.facts.map(function (f) { return h("li", { text: f }); }))));
    }
  }

  FF.register({
    id: "weight", group: "Converters", title: "Weight converter",
    desc: "Type in any box.",
    render: function (root) {
      converter(root, [
        factorUnit("kg", "Kilograms", 1, "(kg)"),
        factorUnit("mt", "Metric tonnes", 1000, "(MT)"),
        factorUnit("lb", "Pounds", 0.45359237, "(lb)"),
        factorUnit("g", "Grams", 0.001, "(g)"),
        factorUnit("oz", "Ounces", 0.028349523125, "(oz)"),
        factorUnit("ust", "US short tons", 907.18474, "(2,000 lb)"),
        factorUnit("lt", "Long tons", 1016.0469088, "(2,240 lb)")
      ], { facts: ["1 MT (metric tonne) = 1,000 kg.", "1 kg = 2.2046 lb, and 1 lb = 0.4536 kg.", "A US short ton is 2,000 lb. A long ton is 2,240 lb. Shipping documents with only “tons” should be clarified."] });
    }
  });

  FF.register({
    id: "length", group: "Converters", title: "Length converter",
    desc: "Type in any box.",
    render: function (root) {
      converter(root, [
        factorUnit("cm", "Centimetres", 0.01, "(cm)"),
        factorUnit("mm", "Millimetres", 0.001, "(mm)"),
        factorUnit("m", "Metres", 1, "(m)"),
        factorUnit("in", "Inches", 0.0254, "(in)"),
        factorUnit("ft", "Feet", 0.3048, "(ft)"),
        factorUnit("yd", "Yards", 0.9144, "(yd)"),
        factorUnit("km", "Kilometres", 1000, "(km)"),
        factorUnit("mi", "Miles", 1609.344, "(mi)")
      ], { facts: ["1 inch = 2.54 cm exactly.", "1 foot = 12 inches = 30.48 cm.", "A 20 ft container is about 6.1 m long, and a 40 ft container about 12.2 m."] });
    }
  });

  FF.register({
    id: "temperature", group: "Converters", title: "Temperature converter",
    desc: "Celsius, Fahrenheit and Kelvin.",
    render: function (root) {
      converter(root, [
        { key: "c", label: "Celsius", note: "(°C)", to: function (v) { return v; }, from: function (b) { return b; } },
        { key: "f", label: "Fahrenheit", note: "(°F)", to: function (v) { return (v - 32) * 5 / 9; }, from: function (b) { return b * 9 / 5 + 32; } },
        { key: "k", label: "Kelvin", note: "(K)", to: function (v) { return v - 273.15; }, from: function (b) { return b + 273.15; } }
      ], {
        presets: {
          title: "Common reefer set points (°C)",
          values: [{ t: "−25", v: "-25" }, { t: "−18", v: "-18" }, { t: "0", v: "0" }, { t: "2", v: "2" }, { t: "5", v: "5" }, { t: "12", v: "12" }, { t: "25", v: "25" }]
        },
        facts: ["Fahrenheit = Celsius × 9 ÷ 5 + 32.", "Frozen cargo is usually carried at −18 °C (−0.4 °F) or colder.", "Water freezes at 0 °C (32 °F) and boils at 100 °C (212 °F)."]
      });
    }
  });

  FF.register({
    id: "cbm-cft", group: "Converters", title: "CBM and CFT converter",
    desc: "Type in any box.",
    render: function (root) {
      converter(root, [
        factorUnit("cbm", "Cubic metres", 1, "(CBM, m³)"),
        factorUnit("cft", "Cubic feet", 0.028316846592, "(CFT, ft³)"),
        factorUnit("l", "Litres", 0.001, "(L)"),
        factorUnit("gal", "US gallons", 0.003785411784, "(gal)"),
        factorUnit("cm3", "Cubic centimetres", 0.000001, "(cm³)"),
        factorUnit("in3", "Cubic inches", 0.000016387064, "(in³)")
      ], { facts: ["1 CBM = 35.3147 CFT, and 1 CFT = 0.02832 CBM.", "1 CBM = 1,000 litres.", "A 20 ft container holds about 33 CBM, a 40 ft about 67 CBM and a 40 ft high cube about 76 CBM."] });
    }
  });
})();
