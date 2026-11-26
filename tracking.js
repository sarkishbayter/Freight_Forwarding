/* Tracking: sea freight (booking, bill of lading, container) and air freight (air waybill). */
(function () {
  "use strict";

  var h = FF.h;

  /* ---------- sea carriers ---------- */
  /* deep: the link opens the tracking page itself. {n} is replaced with the number when the carrier supports it. */
  var SEA = [
    { id: "maersk", name: "Maersk", url: "https://www.maersk.com/tracking/{n}", deep: true, fill: "yes", pre: ["MAEU", "MRKU", "MSKU", "MRSU", "MNBU", "PONU"] },
    { id: "msc", name: "MSC", url: "https://www.msc.com/en/track-a-shipment?trackingNumber={n}&trackingMode=0", deep: true, fill: "try", pre: ["MSCU", "MEDU"] },
    { id: "cma", name: "CMA CGM", url: "https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy={t}&Reference={n}", deep: true, fill: "try", pre: ["CMAU", "CGMU", "APLU"] },
    { id: "hapag", name: "Hapag-Lloyd", url: "https://www.hapag-lloyd.com/en/online-business/track/track.html", deep: true, pre: ["HLXU", "HLCU", "HLBU"] },
    { id: "cosco", name: "COSCO", url: "https://elines.coscoshipping.com/ebusiness/cargoTracking", deep: true, pre: ["COSU", "CCLU", "CBHU", "CSNU"] },
    { id: "one", name: "ONE (Ocean Network Express)", url: "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?trkNoParam={n}", deep: true, fill: "try", pre: ["ONEU"] },
    { id: "zim", name: "ZIM", url: "https://www.zim.com/tools/track-a-shipment?consnumber={n}", deep: true, fill: "try", pre: ["ZIMU"] },
    { id: "evergreen", name: "Evergreen", url: "https://www.evergreen-line.com/", deep: false, pre: ["EGHU", "EGSU", "EISU", "EMCU"] },
    { id: "yangming", name: "Yang Ming", url: "https://www.yangming.com/", deep: false, pre: ["YMLU", "YMMU"] },
    { id: "hmm", name: "HMM", url: "https://www.hmm21.com/", deep: false, pre: ["HDMU"] },
    { id: "oocl", name: "OOCL", url: "https://www.oocl.com/", deep: false, pre: ["OOLU", "OOCU"] },
    { id: "any", name: "Any carrier (Parcels App tracker)", url: "https://parcelsapp.com/en/container-sea-cargo", deep: true, pre: [] }
  ];

  /* ---------- airlines, by 3-digit air waybill prefix ---------- */
  var AIR = [
    { id: "176", pre: ["176"], name: "Emirates SkyCargo", url: "https://www.skycargo.com/" },
    { id: "157", pre: ["157"], name: "Qatar Airways Cargo", url: "https://www.qrcargo.com/" },
    { id: "065", pre: ["065"], name: "Saudia Cargo", url: "https://www.saudiacargo.com/" },
    { id: "607", pre: ["607"], name: "Etihad Cargo", url: "https://www.etihadcargo.com/" },
    { id: "076", pre: ["076"], name: "MEA Cargo (Middle East Airlines)", url: "https://www.mea.com.lb/" },
    { id: "512", pre: ["512"], name: "Royal Jordanian Cargo", url: "https://www.rj.com/" },
    { id: "072", pre: ["072"], name: "Gulf Air Cargo", url: "https://www.gulfair.com/" },
    { id: "229", pre: ["229"], name: "Kuwait Airways Cargo", url: "https://www.kuwaitairways.com/" },
    { id: "910", pre: ["910"], name: "Oman Air Cargo", url: "https://www.omanair.com/" },
    { id: "077", pre: ["077"], name: "EgyptAir Cargo", url: "https://www.egyptair.com/" },
    { id: "235", pre: ["235"], name: "Turkish Cargo", url: "https://www.turkishcargo.com/en/online-services/shipment-tracking", deep: true },
    { id: "020", pre: ["020"], name: "Lufthansa Cargo", url: "https://www.lufthansa-cargo.com/en/eservices/tracking", deep: true },
    { id: "afklm", pre: ["057", "074"], name: "Air France KLM Martinair Cargo", url: "https://www.afklcargo.com/" },
    { id: "iag", pre: ["125", "075"], name: "IAG Cargo (British Airways, Iberia)", url: "https://www.iagcargo.com/" },
    { id: "172", pre: ["172"], name: "Cargolux", url: "https://www.cargolux.com/" },
    { id: "001", pre: ["001"], name: "American Airlines Cargo", url: "https://www.aacargo.com/" },
    { id: "006", pre: ["006"], name: "Delta Cargo", url: "https://www.deltacargo.com/" },
    { id: "016", pre: ["016"], name: "United Cargo", url: "https://www.unitedcargo.com/en/us/track/awb/{p}-{s}", deep: true, fill: "yes" },
    { id: "180", pre: ["180"], name: "Korean Air Cargo", url: "https://cargo.koreanair.com/" },
    { id: "160", pre: ["160"], name: "Cathay Cargo", url: "https://www.cathaycargo.com/" },
    { id: "618", pre: ["618"], name: "Singapore Airlines Cargo", url: "https://www.siacargo.com/" },
    { id: "999", pre: ["999"], name: "Air China Cargo", url: "https://www.airchinacargo.com/" },
    { id: "784", pre: ["784"], name: "China Southern Cargo", url: "https://www.csair.com/" },
    { id: "781", pre: ["781"], name: "China Eastern Logistics", url: "https://www.ceair.com/" },
    { id: "297", pre: ["297"], name: "China Airlines Cargo", url: "https://cargo.china-airlines.com/" },
    { id: "695", pre: ["695"], name: "EVA Air Cargo", url: "https://www.evaair.com/" },
    { id: "205", pre: ["205"], name: "ANA Cargo", url: "https://www.anacargo.jp/" },
    { id: "131", pre: ["131"], name: "Japan Airlines Cargo", url: "https://www.jal.co.jp/jalcargo/" },
    { id: "217", pre: ["217"], name: "Thai Airways Cargo", url: "https://www.thaiairways.com/" },
    { id: "081", pre: ["081"], name: "Qantas Freight", url: "https://www.qantasfreight.com/" },
    { id: "071", pre: ["071"], name: "Ethiopian Cargo", url: "https://www.ethiopianairlines.com/" },
    { id: "706", pre: ["706"], name: "Kenya Airways Cargo", url: "https://www.kenya-airways.com/" },
    { id: "406", pre: ["406"], name: "UPS Air Cargo", url: "https://www.ups.com/" },
    { id: "023", pre: ["023"], name: "FedEx", url: "https://www.fedex.com/" },
    { id: "369", pre: ["369"], name: "Atlas Air", url: "https://www.atlasair.com/" },
    { id: "any", pre: [], name: "Any airline (Parcels App tracker)", url: "https://parcelsapp.com/en/air-cargo-tracking", deep: true }
  ];

  /* ---------- number checks ---------- */
  var LETTER = {};
  (function () {
    var v = 10;
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (c) {
      if (v % 11 === 0) v++;
      LETTER[c] = v++;
    });
  })();

  /* ISO 6346: the 11th character of a container number checks the first ten. */
  function containerCheckOk(n) {
    var sum = 0;
    for (var i = 0; i < 10; i++) {
      var c = n.charAt(i), v = /[A-Z]/.test(c) ? LETTER[c] : +c;
      sum += v * Math.pow(2, i);
    }
    return (sum % 11) % 10 === +n.charAt(10);
  }
  FF.containerCheckOk = containerCheckOk;

  /* Air waybill: the 8th digit of the serial equals the first seven digits mod 7. */
  function awbCheckOk(serial) { return (parseInt(serial.slice(0, 7), 10) % 7) === +serial.charAt(7); }
  FF.awbCheckOk = awbCheckOk;

  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[list.length - 1]; }
  function findByPrefix(list, pre) {
    for (var i = 0; i < list.length; i++) if (list[i].pre.indexOf(pre) > -1) return list[i];
    return null;
  }

  /* ---------- detectors ---------- */
  function detectSea(raw) {
    var n = raw.toUpperCase().replace(/[\s\-]/g, "");
    if (!n) return { n: "", facts: [] };
    var pre = n.slice(0, 4);
    if (/^[A-Z]{4}\d{7}$/.test(n)) {
      var ok = containerCheckOk(n), c = findByPrefix(SEA, pre);
      return {
        n: n, type: "container", carrierId: c ? c.id : null, valid: ok,
        facts: [["Looks like", "Container number"], ["Check digit", ok ? "Valid" : "Does not match, re-check the number"], ["Owner code", pre + (c ? " (" + c.name + ")" : " (carrier not in the list)")]],
        warn: ok ? "" : "The last digit does not match the rest of the number, so there may be a typing mistake."
      };
    }
    var c2 = /^[A-Z]{4}/.test(n) ? findByPrefix(SEA, pre) : null;
    return {
      n: n, type: "bl", carrierId: c2 ? c2.id : null,
      facts: [["Looks like", "Booking or bill of lading number"], ["Carrier", c2 ? c2.name + " (from the " + pre + " prefix)" : "Choose the carrier that issued it"]],
      warn: n.length < 6 ? "That looks short for a booking or bill of lading number." : ""
    };
  }

  function detectAir(raw) {
    var digits = raw.replace(/\D/g, "");
    if (!digits) return { n: "", facts: [] };
    if (digits.length !== 11) {
      return { n: digits, facts: [["Looks like", "Incomplete air waybill number"]], warn: "An air waybill number has 11 digits: a 3-digit airline prefix and an 8-digit serial number. You entered " + digits.length + "." };
    }
    var p = digits.slice(0, 3), s = digits.slice(3), ok = awbCheckOk(s), a = findByPrefix(AIR, p);
    return {
      n: p + "-" + s, prefix: p, serial: s, carrierId: a ? a.id : null, valid: ok,
      facts: [["Airline", a ? a.name : "Prefix " + p + " is not in the list"], ["Check digit", ok ? "Valid" : "Does not match, re-check the number"]],
      warn: ok ? "" : "The last digit does not match the rest of the number, so there may be a typing mistake."
    };
  }

  function link(carrier, d) {
    var url = carrier.url;
    var n = d.n || "";
    return url.replace("{n}", encodeURIComponent(n)).replace("{p}", d.prefix || "").replace("{s}", d.serial || "").replace("{t}", d.type === "container" ? "Container" : "BL");
  }

  /* ---------- the tool page, shared by sea and air ---------- */
  function trackPage(cfg) {
    return function (root) {
      var key = "track." + cfg.kind;
      var saved = FF.store.get(key, []);
      var num = h("input", { type: "text", placeholder: cfg.placeholder, autocomplete: "off", "aria-label": cfg.numLabel, spellcheck: "false" });
      var carrier = FF.select(cfg.list.map(function (c) { return { v: c.id, t: c.name }; }), "any");
      var out = h("div", { style: "display:flex;flex-direction:column;gap:14px" });
      var listBox = h("div");
      var touched = false;
      var d = { n: "" };
      function ttLink(n) {
        var e = encodeURIComponent(n);
        return cfg.tt.replace("{n}", e) + "&numbers=" + e + "&q=" + e + "&search=" + e;
      }

      /* results shown inside this page */
      var frameBox = h("div", { class: "panel", hidden: true });
      function showHere(n) {
        FF.copy(n);
        FF.clear(frameBox);
        frameBox.hidden = false;
        var url = ttLink(n);
        var frame = h("iframe", { src: url, title: "Tracking result for " + n, loading: "lazy", style: "width:100%;height:720px;border:1px solid var(--line);border-radius:10px;background:var(--white)" });
        var cp2 = h("button", { type: "button", class: "btn ghost small", text: "Copy number", onclick: function () { FF.copy(n, cp2); } });
        var close = h("button", { type: "button", class: "btn ghost small", text: "Close", onclick: function () { frameBox.hidden = true; FF.clear(frameBox); } });
        frameBox.appendChild(h("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px" },
          h("h3", { style: "margin:0;overflow-wrap:anywhere", text: "Tracking result for " + n }), h("div", { class: "btn-row", style: "gap:8px" }, cp2, close)));
        frameBox.appendChild(h("p", { class: "meta", style: "margin:0 0 10px", text: "Results come from track-trace.com. Your number is already copied: if the box inside is empty, click it and press Ctrl+V (or paste), then track. If nothing loads at all, that site blocks being shown inside another page." }));
        frameBox.appendChild(frame);
        frameBox.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      function update() {
        d = cfg.detect(num.value);
        if (!touched) carrier.value = d.carrierId || "any";
        FF.clear(out);
        if (!d.n) {
          out.appendChild(h("p", { class: "empty", text: cfg.empty }));
          return;
        }
        var c = find(cfg.list, carrier.value);
        out.appendChild(h("div", { class: "headline" }, h("span", { class: "cap", text: cfg.kind === "air" ? "Air waybill" : "Number" }), h("div", { class: "big", style: "font-size:2.2rem;overflow-wrap:anywhere", text: d.n })));
        out.appendChild(h("div", { class: "stats", style: "grid-template-columns:1fr" }, d.facts.map(function (f) { return FF.stat(f[0], f[1], f[0] === "Check digit" && d.valid === false ? "accent" : ""); })));
        if (d.warn) out.appendChild(h("p", { class: "note", text: d.warn }));
        var here = h("button", { type: "button", class: "btn", text: "Track here", onclick: function () { showHere(d.n); } });
        var go = h("a", { class: "btn ghost", href: link(c, d), target: "_blank", rel: "noopener noreferrer", style: "text-decoration:none;display:inline-flex;align-items:center", text: "Open " + c.name + " website" });
        go.addEventListener("click", function () { FF.copy(d.n); });
        var copy = h("button", { type: "button", class: "btn ghost", text: "Copy number", onclick: function () { FF.copy(d.n, copy); } });
        out.appendChild(h("div", { class: "btn-row" }, here, go, copy));
        out.appendChild(h("p", { class: "meta", text: "Track here shows the result on this page, using track-trace.com, an independent site that finds the carrier. The number is copied each time you click." }));
        var how = c.fill === "yes" ? "Opens the tracking page with your number already filled in."
          : c.fill === "try" ? "Opens the tracking page and tries to fill in your number. If the box is empty, paste it: the number is copied when you click."
          : c.deep ? "Opens the tracking page. Paste the number into the box: it is copied when you click."
          : "Opens the carrier website. Use its Track menu and paste the number: it is copied when you click.";
        out.appendChild(h("p", { class: "meta", text: "Open " + c.name + " website: " + how.charAt(0).toLowerCase() + how.slice(1) + " The status itself comes from the carrier." }));
        var save = h("button", { type: "button", class: "btn", text: "Save to my shipments", onclick: function () { saveCurrent(); } });
        out.appendChild(h("div", { style: "border-top:1px solid var(--tide);padding-top:14px;display:flex;flex-direction:column;gap:12px" },
          h("div", { class: "btn-row" }, save)));
      }

      function saveCurrent() {
        if (!d.n) return;
        var c = find(cfg.list, carrier.value);
        saved = saved.filter(function (s) { return !(s.n === d.n && s.c === c.id); });
        saved.unshift({ n: d.n, c: c.id, p: d.prefix || "", s: d.serial || "" });
        saved = saved.slice(0, 100);
        FF.store.set(key, saved);
        drawList();
      }

      function drawList() {
        FF.clear(listBox);
        if (!saved.length) {
          listBox.appendChild(h("p", { class: "empty", text: "No saved shipments yet. Enter a number, then choose Save to my shipments." }));
          return;
        }
        var rows = saved.map(function (s, i) {
          var c = find(cfg.list, s.c);
          var open = h("button", { type: "button", class: "btn small", text: "Track here", onclick: function () { showHere(s.n); } });
          var site = h("a", { class: "btn ghost small", href: link(c, { n: s.n, prefix: s.p, serial: s.s, type: /^[A-Z]{4}\d{7}$/.test(s.n) ? "container" : "bl" }), target: "_blank", rel: "noopener noreferrer", style: "text-decoration:none;display:inline-flex;align-items:center", text: "Official site" });
          site.addEventListener("click", function () { FF.copy(s.n); });
          var cp = h("button", { type: "button", class: "btn ghost small", text: "Copy", onclick: function () { FF.copy(s.n, cp); } });
          var rm = h("button", { type: "button", class: "btn ghost small", text: "Remove", "aria-label": "Remove " + s.n, onclick: function () { saved.splice(i, 1); FF.store.set(key, saved); drawList(); } });
          return [
            h("strong", { text: s.n }),
            c.name, h("div", { class: "btn-row", style: "gap:6px" }, open, site, cp, rm)
          ];
        });
        listBox.appendChild(FF.table(["Shipment", cfg.kind === "air" ? "Airline" : "Carrier", ""], rows));
      }

      num.addEventListener("input", function () { touched = false; update(); });
      carrier.addEventListener("change", function () { touched = true; update(); });

      root.appendChild(FF.split([
        FF.field(cfg.numLabel, num, cfg.hint),
        FF.field(cfg.kind === "air" ? "Airline" : "Carrier", carrier),
        h("p", { class: "note info", text: cfg.explain })
      ], out));
      root.appendChild(frameBox);
      root.appendChild(h("div", { class: "panel" },
        h("h3", { text: "My shipments" }),
        h("p", { text: "Saved in this browser only. They are not shared and are lost if you clear your browser data." }),
        h("div", { style: "margin-top:14px" }, listBox)));
      var uni = cfg.universal;
      if (uni) root.appendChild(h("p", { class: "meta", style: "margin-top:14px" }, uni.text + " ", h("a", { href: uni.url, target: "_blank", rel: "noopener noreferrer", text: uni.label }), "."));
      update();
      drawList();
    };
  }

  FF.register({
    id: "track-sea", group: "Tracking", title: "Sea freight tracking",
    desc: "Track a sea shipment by booking number, bill of lading or container number on the carrier's own site.",
    render: trackPage({
      kind: "sea", list: SEA, detect: detectSea,
      tt: "https://www.track-trace.com/container?number={n}&commit=Track",
      numLabel: "Booking, bill of lading or container number",
      placeholder: "For example MSKU1234567 or a booking number",
      hint: "Carriers only recognise numbers they issued, so choose the right one.",
      empty: "Enter a number to get the tracking link.",
      explain: "Carrier websites do not allow other sites to read their live status, so this page checks your number and hands it to a tracking site or to the carrier's own page.",
      universal: { text: "Not sure which carrier? Try a tracker that covers many lines:", url: "https://parcelsapp.com/en/container-sea-cargo", label: "Parcels App sea cargo tracking" }
    })
  });

  FF.register({
    id: "track-air", group: "Tracking", title: "Air freight tracking",
    desc: "Track an air shipment by air waybill (AWB) number. The airline is found from the first three digits.",
    render: trackPage({
      kind: "air", list: AIR, detect: detectAir,
      tt: "https://www.track-trace.com/aircargo?number={n}&commit=Trace",
      numLabel: "Air waybill (AWB) number",
      placeholder: "For example 176-12345675",
      hint: "11 digits: 3-digit airline prefix, then 8 digits. Spaces and dashes are fine.",
      empty: "Enter an air waybill number to get the tracking link.",
      explain: "Air freight is tracked by the air waybill number, not the booking number. If you only have a forwarder's booking number, ask for the AWB. Airline sites do not allow other sites to read their live status, so this page hands your number to a tracking site or to the airline's own page.",
      universal: { text: "Airline not in the list? Try a tracker that covers many airlines:", url: "https://parcelsapp.com/en/air-cargo-tracking", label: "Parcels App air cargo tracking" }
    })
  });
})();
