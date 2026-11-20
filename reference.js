/* Reference pages: dangerous goods, codes, Incoterms, glossary. */
(function () {
  "use strict";

  var h = FF.h;

  /* searchable table: rows are arrays of strings, one per column */
  function searchTable(headers, rows, opts) {
    opts = opts || {};
    var q = h("input", { type: "text", placeholder: opts.placeholder || "Search", "aria-label": "Search" });
    var count = h("span", { class: "count" });
    var holder = h("div");
    function draw() {
      var s = q.value.trim().toLowerCase();
      var list = !s ? rows : rows.filter(function (r) { return r.join(" ").toLowerCase().indexOf(s) > -1; });
      FF.clear(holder);
      count.textContent = list.length + (list.length === 1 ? " result" : " results");
      if (!list.length) { holder.appendChild(h("p", { class: "empty", text: "No match. Try a shorter search, or part of a name." })); return; }
      holder.appendChild(FF.table(headers, list.map(function (r) {
        return r.map(function (c, i) { return i === 0 && !opts.noCode ? h("span", { class: "code", text: c }) : c; });
      })));
    }
    q.addEventListener("input", draw);
    draw();
    return h("div", null, h("div", { class: "searchbar" }, h("div", { class: "field" }, q), count), holder);
  }

  function prose() {
    var el = h("div", { class: "prose" });
    for (var i = 0; i < arguments.length; i++) el.appendChild(arguments[i]);
    return el;
  }
  function note(text, info) { return h("p", { class: "note" + (info ? " info" : ""), text: text }); }

  /* ================= dangerous goods ================= */
  var DG_CLASSES = [
    { c: "Class 1", t: "Explosives", color: "#e8863a", sub: "Divisions 1.1 to 1.6, by how the explosion behaves", ex: ["Fireworks", "Ammunition", "Detonators"] },
    { c: "Class 2", t: "Gases", color: "#2e9e5b", sub: "2.1 flammable, 2.2 non-flammable and non-toxic, 2.3 toxic", ex: ["Aerosols", "LPG and propane", "Compressed oxygen and nitrogen", "Chlorine"] },
    { c: "Class 3", t: "Flammable liquids", color: "#d6453d", sub: "Liquids that give off flammable vapour", ex: ["Petrol and diesel", "Paint and thinners", "Alcohols", "Perfume"] },
    { c: "Class 4", t: "Flammable solids", color: "#c9a227", sub: "4.1 flammable solids, 4.2 spontaneously combustible, 4.3 dangerous when wet", ex: ["Matches", "Sulphur", "Sodium", "Calcium carbide"] },
    { c: "Class 5", t: "Oxidizers and organic peroxides", color: "#e0b400", sub: "5.1 oxidizing substances, 5.2 organic peroxides", ex: ["Ammonium nitrate", "Hydrogen peroxide", "Bleaching powder"] },
    { c: "Class 6", t: "Toxic and infectious", color: "#6f5aa8", sub: "6.1 toxic substances, 6.2 infectious substances", ex: ["Pesticides", "Lab samples (Category A and B)", "Cyanides"] },
    { c: "Class 7", t: "Radioactive material", color: "#d9c400", sub: "Material that gives off radiation", ex: ["Medical isotopes", "Smoke detector sources (excepted)"] },
    { c: "Class 8", t: "Corrosives", color: "#4a6590", sub: "Cause burns to skin or damage metals", ex: ["Acids and alkalis", "Wet batteries", "Mercury"] },
    { c: "Class 9", t: "Miscellaneous", color: "#1b6fd1", sub: "Hazards that fit no other class", ex: ["Lithium batteries", "Dry ice", "Environmentally hazardous substances", "Airbags"] }
  ];

  var UN = [
    ["UN1005", "Ammonia, anhydrous", "2.3 (8)", ""],
    ["UN1011", "Butane", "2.1", ""],
    ["UN1013", "Carbon dioxide", "2.2", ""],
    ["UN1017", "Chlorine", "2.3 (5.1, 8)", ""],
    ["UN1046", "Helium, compressed", "2.2", ""],
    ["UN1057", "Lighters or lighter refills", "2.1", ""],
    ["UN1066", "Nitrogen, compressed", "2.2", ""],
    ["UN1072", "Oxygen, compressed", "2.2 (5.1)", ""],
    ["UN1075", "Petroleum gases, liquefied (LPG)", "2.1", ""],
    ["UN1090", "Acetone", "3", ""],
    ["UN1133", "Adhesives", "3", ""],
    ["UN1139", "Coating solution", "3", ""],
    ["UN1170", "Ethanol (ethyl alcohol)", "3", ""],
    ["UN1202", "Gas oil, diesel fuel or light heating oil", "3", "Usually packing group III."],
    ["UN1203", "Gasoline (petrol)", "3", "Packing group II."],
    ["UN1210", "Printing ink", "3", ""],
    ["UN1219", "Isopropanol", "3", ""],
    ["UN1230", "Methanol", "3 (6.1)", "Also toxic."],
    ["UN1263", "Paint or paint related material", "3", ""],
    ["UN1266", "Perfumery products", "3", ""],
    ["UN1268", "Petroleum distillates, n.o.s.", "3", ""],
    ["UN1294", "Toluene", "3", ""],
    ["UN1307", "Xylenes", "3", ""],
    ["UN1325", "Flammable solid, organic, n.o.s.", "4.1", ""],
    ["UN1361", "Carbon, animal or vegetable origin", "4.2", ""],
    ["UN1402", "Calcium carbide", "4.3", "Reacts with water."],
    ["UN1428", "Sodium", "4.3", "Reacts with water."],
    ["UN1479", "Oxidizing solid, n.o.s.", "5.1", ""],
    ["UN1760", "Corrosive liquid, n.o.s.", "8", ""],
    ["UN1789", "Hydrochloric acid", "8", ""],
    ["UN1791", "Hypochlorite solution", "8", ""],
    ["UN1805", "Phosphoric acid solution", "8", ""],
    ["UN1814", "Potassium hydroxide solution", "8", ""],
    ["UN1823", "Sodium hydroxide, solid", "8", ""],
    ["UN1824", "Sodium hydroxide solution", "8", ""],
    ["UN1830", "Sulphuric acid", "8", ""],
    ["UN1845", "Carbon dioxide, solid (dry ice)", "9", "Needs a vented package. Air: packing instruction 954."],
    ["UN1942", "Ammonium nitrate", "5.1", ""],
    ["UN1950", "Aerosols", "2", "Class 2.1 or 2.2 depending on contents. Often shipped as limited quantity."],
    ["UN1971", "Methane, compressed (natural gas)", "2.1", ""],
    ["UN1978", "Propane", "2.1", ""],
    ["UN1993", "Flammable liquid, n.o.s.", "3", ""],
    ["UN2014", "Hydrogen peroxide, aqueous solution", "5.1 (8)", ""],
    ["UN2031", "Nitric acid", "8", ""],
    ["UN2037", "Receptacles, small, containing gas (gas cartridges)", "2", ""],
    ["UN2211", "Polymeric beads, expandable", "9", ""],
    ["UN2794", "Batteries, wet, filled with acid", "8", ""],
    ["UN2800", "Batteries, wet, non-spillable", "8", ""],
    ["UN2809", "Mercury", "8 (6.1)", ""],
    ["UN2814", "Infectious substance, affecting humans (Category A)", "6.2", "Air: packing instruction 620."],
    ["UN2900", "Infectious substance, affecting animals only (Category A)", "6.2", ""],
    ["UN2910", "Radioactive material, excepted package, limited quantity", "7", ""],
    ["UN3077", "Environmentally hazardous substance, solid, n.o.s.", "9", ""],
    ["UN3082", "Environmentally hazardous substance, liquid, n.o.s.", "9", ""],
    ["UN3090", "Lithium metal batteries (alone)", "9", "Cargo aircraft only when shipped alone. Packing instruction 968."],
    ["UN3091", "Lithium metal batteries, packed with or contained in equipment", "9", "Packed with: 969. Contained in: 970."],
    ["UN3166", "Vehicle, flammable gas or flammable liquid powered", "9", ""],
    ["UN3171", "Battery-powered vehicle or equipment", "9", ""],
    ["UN3175", "Solids containing flammable liquid, n.o.s.", "4.1", ""],
    ["UN3268", "Safety devices (airbag modules, seat-belt pretensioners)", "9", ""],
    ["UN3269", "Polyester resin kit", "3", ""],
    ["UN3316", "Chemical kit", "9", ""],
    ["UN3359", "Fumigated cargo transport unit", "9", "Container fumigated and still ventilating. Must be marked."],
    ["UN3363", "Dangerous goods in machinery or apparatus", "9", ""],
    ["UN3373", "Biological substance, Category B", "6.2", "Air: packing instruction 650."],
    ["UN3480", "Lithium ion batteries (alone)", "9", "Cargo aircraft only when shipped alone, at 30% charge or less. Packing instruction 965."],
    ["UN3481", "Lithium ion batteries, packed with or contained in equipment", "9", "Packed with: 966. Contained in: 967."],
    ["UN0336", "Fireworks", "1.4G", "Class 1 needs special approval from carriers."]
  ];

  function dgClasses() {
    return h("div", { class: "cards" }, DG_CLASSES.map(function (k) {
      return h("div", { class: "dg", style: "border-top-color:" + k.color },
        h("h4", { text: k.c + ": " + k.t }), h("div", { class: "sub", text: k.sub }),
        h("ul", null, k.ex.map(function (e) { return h("li", { text: e }); })));
    }));
  }

  function dgPacking() {
    return prose(
      h("h4", { text: "Packing groups" }),
      h("p", { text: "Packing groups show the degree of danger inside a class. They tell you how strong the packaging must be." }),
      FF.table(["Group", "Danger", "What it means for packaging"], [
        ["I", "Great danger", "Strongest packaging. Some carriers refuse it."],
        ["II", "Medium danger", "Strong packaging."],
        ["III", "Minor danger", "Standard UN specification packaging."]
      ]),
      h("h4", { text: "Where to find the packing instruction" }),
      h("ul", null,
        h("li", { text: "Air: the IATA Dangerous Goods Regulations list the instruction for each UN number in Table 4.2." }),
        h("li", { text: "Sea: the IMDG Code Dangerous Goods List, column 8." }),
        h("li", { text: "Road: ADR Table A, column 8." })),
      h("p", { text: "Packing instructions are numbered, for example 965 for lithium ion batteries shipped alone by air. Always read the instruction for the correct edition and mode." }),
      h("h4", { text: "Limited and excepted quantities" }),
      h("p", { text: "Small amounts of some goods can travel with lighter rules if the inner packaging stays under a set size and the package carries the right mark. Limited quantity (LQ) packages use a diamond mark with a black and white border. Excepted quantity (EQ) packages use a hatched mark with an E. Both still need correct packing, marking and training, and air carriers add their own rules." }),
      h("h4", { text: "Marks and labels" }),
      h("ul", null,
        h("li", { text: "The UN number and proper shipping name on every package." }),
        h("li", { text: "A hazard label for the class on each package. Containers get placards on all four sides." }),
        h("li", { text: "UN specification packaging carries a UN mark showing the tested type and group." }),
        h("li", { text: "Orientation arrows for liquids, and the cargo aircraft only label where it applies." })),
      note("Rules change with each edition. Treat this as a starting point and check the current IATA, IMDG or ADR text before you book.", true));
  }

  function dgLithium() {
    return prose(
      h("p", { text: "Lithium batteries are Class 9. How they are regulated depends on the chemistry, the size and whether they travel alone or with equipment." }),
      FF.table(["Chemistry and how shipped", "UN number", "Air packing instruction", "Notes"], [
        ["Lithium ion, alone", "UN3480", "965", "Cargo aircraft only. Charge at 30% or less."],
        ["Lithium ion, packed with equipment", "UN3481", "966", "Batteries are in the same box as the device."],
        ["Lithium ion, contained in equipment", "UN3481", "967", "Batteries are installed in the device."],
        ["Lithium metal, alone", "UN3090", "968", "Cargo aircraft only."],
        ["Lithium metal, packed with equipment", "UN3091", "969", ""],
        ["Lithium metal, contained in equipment", "UN3091", "970", ""]
      ]),
      h("h4", { text: "Size limits that matter" }),
      FF.table(["Type", "Smaller", "Larger"], [
        ["Lithium ion", "Cell up to 20 Wh, battery up to 100 Wh", "Above 20 Wh per cell or 100 Wh per battery"],
        ["Lithium metal", "Cell up to 1 g lithium, battery up to 2 g", "Above 1 g per cell or 2 g per battery"]
      ]),
      h("p", { text: "Larger batteries are fully regulated: a Shipper's Declaration, a Class 9 lithium battery hazard label and trained staff. Smaller ones have lighter rules but still need the lithium battery mark and a test summary." }),
      h("h4", { text: "What you usually need" }),
      h("ul", null,
        h("li", { text: "A UN 38.3 test summary for each battery type, from the manufacturer." }),
        h("li", { text: "Packaging and marking that match the packing instruction." }),
        h("li", { text: "Trained shipper and, for fully regulated batteries, a Dangerous Goods Declaration." }),
        h("li", { text: "Damaged, defective or recalled batteries need special approval and are often refused." }),
        h("li", { text: "Sea: IMDG packing instruction P903 covers most lithium batteries." })),
      note("Airlines often add rules of their own and some refuse batteries shipped alone. Always confirm with the carrier before booking.", true));
  }

  function dgDocs() {
    return prose(
      FF.table(["Mode", "Main documents", "Notes"], [
        ["Air", "Shipper's Declaration for Dangerous Goods, air waybill with the dangerous goods wording, safety data sheet, NOTOC given to the pilot", "Shipper must be trained. Some goods and low quantities have lighter rules."],
        ["Sea", "Dangerous Goods Declaration, container packing certificate, safety data sheet, booking acceptance from the line", "Container needs placards on four sides. Carrier approval first."],
        ["Road", "Transport document, written instructions for the driver, safety data sheet", "ADR rules apply in Europe. Vehicle and driver may need ADR approval."]
      ]),
      h("h4", { text: "Before you accept dangerous goods" }),
      h("ul", null,
        h("li", { text: "Get the safety data sheet (SDS) and check the UN number, class and packing group." }),
        h("li", { text: "Ask for the booking approval in writing. Many lines limit dangerous goods per vessel." }),
        h("li", { text: "Check that packaging, marks and labels match the declaration." }),
        h("li", { text: "Make sure staff who sign the declaration hold current dangerous goods training." }),
        h("li", { text: "Declare accurately. Misdeclared dangerous goods can mean heavy fines and refused cargo." })),
      note("Document names and rules differ by edition and country. Confirm with the carrier and the regulations that apply to your shipment.", true));
  }

  FF.register({
    id: "dangerous-goods", group: "Reference", title: "Dangerous goods",
    desc: "UN numbers, hazard classes, packing instructions, lithium batteries and the documents you need.",
    render: function (root) {
      root.appendChild(FF.tabs([
        { id: "un", title: "UN numbers", render: function () { return searchTable(["UN number", "Proper shipping name", "Class", "Notes"], UN, { placeholder: "Search by UN number, name or class" }); } },
        { id: "classes", title: "Classes", render: dgClasses },
        { id: "packing", title: "Packing", render: dgPacking },
        { id: "lithium", title: "Lithium batteries", render: dgLithium },
        { id: "docs", title: "Documents", render: dgDocs }
      ]));
    }
  });

  /* ================= codes ================= */
  var AIRPORTS = [
    ["BEY", "Beirut–Rafic Hariri International", "Beirut, Lebanon"], ["DXB", "Dubai International", "Dubai, UAE"],
    ["DWC", "Al Maktoum International", "Dubai, UAE"], ["AUH", "Zayed International", "Abu Dhabi, UAE"],
    ["SHJ", "Sharjah International", "Sharjah, UAE"], ["DOH", "Hamad International", "Doha, Qatar"],
    ["RUH", "King Khalid International", "Riyadh, Saudi Arabia"], ["JED", "King Abdulaziz International", "Jeddah, Saudi Arabia"],
    ["DMM", "King Fahd International", "Dammam, Saudi Arabia"], ["KWI", "Kuwait International", "Kuwait"],
    ["BAH", "Bahrain International", "Manama, Bahrain"], ["MCT", "Muscat International", "Muscat, Oman"],
    ["AMM", "Queen Alia International", "Amman, Jordan"], ["BGW", "Baghdad International", "Baghdad, Iraq"],
    ["CAI", "Cairo International", "Cairo, Egypt"], ["IST", "Istanbul Airport", "Istanbul, Türkiye"],
    ["SAW", "Sabiha Gökçen International", "Istanbul, Türkiye"], ["ATH", "Athens Eleftherios Venizelos", "Athens, Greece"],
    ["LCA", "Larnaca International", "Larnaca, Cyprus"], ["LHR", "Heathrow", "London, United Kingdom"],
    ["LGW", "Gatwick", "London, United Kingdom"], ["MAN", "Manchester", "Manchester, United Kingdom"],
    ["CDG", "Charles de Gaulle", "Paris, France"], ["FRA", "Frankfurt", "Frankfurt, Germany"],
    ["MUC", "Munich", "Munich, Germany"], ["AMS", "Schiphol", "Amsterdam, Netherlands"],
    ["BRU", "Brussels", "Brussels, Belgium"], ["LGG", "Liège", "Liège, Belgium"],
    ["MAD", "Adolfo Suárez Madrid–Barajas", "Madrid, Spain"], ["BCN", "Barcelona–El Prat", "Barcelona, Spain"],
    ["FCO", "Leonardo da Vinci–Fiumicino", "Rome, Italy"], ["MXP", "Milan Malpensa", "Milan, Italy"],
    ["ZRH", "Zurich", "Zurich, Switzerland"], ["VIE", "Vienna International", "Vienna, Austria"],
    ["CPH", "Copenhagen", "Copenhagen, Denmark"], ["ARN", "Stockholm Arlanda", "Stockholm, Sweden"],
    ["OSL", "Oslo Gardermoen", "Oslo, Norway"], ["HEL", "Helsinki–Vantaa", "Helsinki, Finland"],
    ["WAW", "Warsaw Chopin", "Warsaw, Poland"], ["JFK", "John F. Kennedy International", "New York, USA"],
    ["EWR", "Newark Liberty International", "Newark, USA"], ["ORD", "O'Hare International", "Chicago, USA"],
    ["LAX", "Los Angeles International", "Los Angeles, USA"], ["MIA", "Miami International", "Miami, USA"],
    ["ATL", "Hartsfield–Jackson Atlanta", "Atlanta, USA"], ["DFW", "Dallas/Fort Worth", "Dallas, USA"],
    ["IAH", "George Bush Intercontinental", "Houston, USA"], ["SFO", "San Francisco International", "San Francisco, USA"],
    ["YYZ", "Toronto Pearson", "Toronto, Canada"], ["YVR", "Vancouver International", "Vancouver, Canada"],
    ["MEX", "Benito Juárez International", "Mexico City, Mexico"], ["GRU", "São Paulo–Guarulhos", "São Paulo, Brazil"],
    ["EZE", "Ministro Pistarini (Ezeiza)", "Buenos Aires, Argentina"], ["BOG", "El Dorado International", "Bogotá, Colombia"],
    ["PVG", "Shanghai Pudong International", "Shanghai, China"], ["SHA", "Shanghai Hongqiao International", "Shanghai, China"],
    ["PEK", "Beijing Capital International", "Beijing, China"], ["PKX", "Beijing Daxing International", "Beijing, China"],
    ["CAN", "Guangzhou Baiyun International", "Guangzhou, China"], ["SZX", "Shenzhen Bao'an International", "Shenzhen, China"],
    ["HKG", "Hong Kong International", "Hong Kong"], ["TPE", "Taiwan Taoyuan International", "Taipei, Taiwan"],
    ["ICN", "Incheon International", "Seoul, South Korea"], ["NRT", "Narita International", "Tokyo, Japan"],
    ["HND", "Haneda", "Tokyo, Japan"], ["KIX", "Kansai International", "Osaka, Japan"],
    ["SIN", "Changi", "Singapore"], ["BKK", "Suvarnabhumi", "Bangkok, Thailand"],
    ["KUL", "Kuala Lumpur International", "Kuala Lumpur, Malaysia"], ["CGK", "Soekarno–Hatta International", "Jakarta, Indonesia"],
    ["MNL", "Ninoy Aquino International", "Manila, Philippines"], ["SGN", "Tan Son Nhat International", "Ho Chi Minh City, Vietnam"],
    ["DEL", "Indira Gandhi International", "Delhi, India"], ["BOM", "Chhatrapati Shivaji Maharaj International", "Mumbai, India"],
    ["MAA", "Chennai International", "Chennai, India"], ["CMB", "Bandaranaike International", "Colombo, Sri Lanka"],
    ["KHI", "Jinnah International", "Karachi, Pakistan"], ["DAC", "Hazrat Shahjalal International", "Dhaka, Bangladesh"],
    ["SYD", "Sydney Kingsford Smith", "Sydney, Australia"], ["MEL", "Melbourne", "Melbourne, Australia"],
    ["AKL", "Auckland", "Auckland, New Zealand"], ["JNB", "O. R. Tambo International", "Johannesburg, South Africa"],
    ["CPT", "Cape Town International", "Cape Town, South Africa"], ["NBO", "Jomo Kenyatta International", "Nairobi, Kenya"],
    ["ADD", "Bole International", "Addis Ababa, Ethiopia"], ["LOS", "Murtala Muhammed International", "Lagos, Nigeria"],
    ["CMN", "Mohammed V International", "Casablanca, Morocco"], ["ALG", "Houari Boumediene", "Algiers, Algeria"],
    ["TUN", "Tunis–Carthage", "Tunis, Tunisia"], ["ACC", "Kotoka International", "Accra, Ghana"]
  ];

  var PORTS = [
    ["LBBEY", "Beirut", "Lebanon"], ["LBTRI", "Tripoli", "Lebanon"],
    ["AEJEA", "Jebel Ali", "UAE"], ["AEDXB", "Dubai (Port Rashid)", "UAE"], ["AEAUH", "Abu Dhabi", "UAE"],
    ["AESHJ", "Sharjah", "UAE"], ["AEKLF", "Khor Fakkan", "UAE"],
    ["SAJED", "Jeddah", "Saudi Arabia"], ["SADMM", "Dammam", "Saudi Arabia"], ["QAHMD", "Hamad Port", "Qatar"],
    ["OMSLL", "Salalah", "Oman"], ["OMSOH", "Sohar", "Oman"], ["JOAQJ", "Aqaba", "Jordan"], ["DJJIB", "Djibouti", "Djibouti"],
    ["EGPSD", "Port Said", "Egypt"], ["EGALY", "Alexandria", "Egypt"], ["EGDAM", "Damietta", "Egypt"], ["EGSKH", "Sokhna", "Egypt"],
    ["TRMER", "Mersin", "Türkiye"], ["TRIST", "Istanbul", "Türkiye"], ["TRAMB", "Ambarlı", "Türkiye"], ["TRIZM", "Izmir", "Türkiye"],
    ["GRPIR", "Piraeus", "Greece"], ["CYLMS", "Limassol", "Cyprus"], ["MTMAR", "Marsaxlokk", "Malta"],
    ["ITGOA", "Genoa", "Italy"], ["ITLSP", "La Spezia", "Italy"], ["ITNAP", "Naples", "Italy"],
    ["ESVLC", "Valencia", "Spain"], ["ESBCN", "Barcelona", "Spain"], ["ESALG", "Algeciras", "Spain"],
    ["FRMRS", "Marseille", "France"], ["FRLEH", "Le Havre", "France"], ["BEANR", "Antwerp", "Belgium"],
    ["NLRTM", "Rotterdam", "Netherlands"], ["DEHAM", "Hamburg", "Germany"], ["DEBRV", "Bremerhaven", "Germany"],
    ["GBFXT", "Felixstowe", "United Kingdom"], ["GBSOU", "Southampton", "United Kingdom"], ["GBLGP", "London Gateway", "United Kingdom"],
    ["PLGDN", "Gdansk", "Poland"], ["SEGOT", "Gothenburg", "Sweden"], ["MAPTM", "Tanger Med", "Morocco"],
    ["USNYC", "New York and New Jersey", "USA"], ["USLAX", "Los Angeles", "USA"], ["USLGB", "Long Beach", "USA"],
    ["USSAV", "Savannah", "USA"], ["USHOU", "Houston", "USA"], ["USORF", "Norfolk", "USA"], ["USOAK", "Oakland", "USA"], ["USMIA", "Miami", "USA"],
    ["CAVAN", "Vancouver", "Canada"], ["CAMTR", "Montreal", "Canada"], ["BRSSZ", "Santos", "Brazil"],
    ["ARBUE", "Buenos Aires", "Argentina"], ["CLVAP", "Valparaíso", "Chile"],
    ["CNSHA", "Shanghai", "China"], ["CNNGB", "Ningbo", "China"], ["CNSZX", "Shenzhen", "China"], ["CNYTN", "Yantian", "China"],
    ["CNTAO", "Qingdao", "China"], ["CNTXG", "Tianjin (Xingang)", "China"], ["CNCAN", "Guangzhou", "China"],
    ["CNXMN", "Xiamen", "China"], ["CNDLC", "Dalian", "China"], ["HKHKG", "Hong Kong", "Hong Kong"],
    ["TWKHH", "Kaohsiung", "Taiwan"], ["KRPUS", "Busan", "South Korea"], ["JPTYO", "Tokyo", "Japan"], ["JPYOK", "Yokohama", "Japan"],
    ["SGSIN", "Singapore", "Singapore"], ["MYPKG", "Port Klang", "Malaysia"], ["MYTPP", "Tanjung Pelepas", "Malaysia"],
    ["THLCH", "Laem Chabang", "Thailand"], ["VNSGN", "Ho Chi Minh City", "Vietnam"], ["VNHPH", "Haiphong", "Vietnam"],
    ["IDJKT", "Jakarta", "Indonesia"], ["INNSA", "Nhava Sheva (JNPT)", "India"], ["INMUN", "Mundra", "India"], ["INMAA", "Chennai", "India"],
    ["LKCMB", "Colombo", "Sri Lanka"], ["PKKHI", "Karachi", "Pakistan"], ["BDCGP", "Chittagong", "Bangladesh"],
    ["ZADUR", "Durban", "South Africa"], ["KEMBA", "Mombasa", "Kenya"], ["TZDAR", "Dar es Salaam", "Tanzania"],
    ["NGLOS", "Lagos", "Nigeria"], ["GHTEM", "Tema", "Ghana"],
    ["AUSYD", "Sydney", "Australia"], ["AUMEL", "Melbourne", "Australia"], ["NZAKL", "Auckland", "New Zealand"]
  ];

  var COUNTRIES = [
    ["LB", "LBN", "Lebanon"], ["AE", "ARE", "United Arab Emirates"], ["SA", "SAU", "Saudi Arabia"], ["QA", "QAT", "Qatar"],
    ["KW", "KWT", "Kuwait"], ["BH", "BHR", "Bahrain"], ["OM", "OMN", "Oman"], ["JO", "JOR", "Jordan"], ["IQ", "IRQ", "Iraq"],
    ["SY", "SYR", "Syria"], ["EG", "EGY", "Egypt"], ["TR", "TUR", "Türkiye"], ["CY", "CYP", "Cyprus"], ["GR", "GRC", "Greece"],
    ["IL", "ISR", "Israel"], ["IR", "IRN", "Iran"], ["DE", "DEU", "Germany"], ["FR", "FRA", "France"], ["IT", "ITA", "Italy"],
    ["ES", "ESP", "Spain"], ["PT", "PRT", "Portugal"], ["NL", "NLD", "Netherlands"], ["BE", "BEL", "Belgium"],
    ["GB", "GBR", "United Kingdom"], ["IE", "IRL", "Ireland"], ["CH", "CHE", "Switzerland"], ["AT", "AUT", "Austria"],
    ["PL", "POL", "Poland"], ["SE", "SWE", "Sweden"], ["NO", "NOR", "Norway"], ["DK", "DNK", "Denmark"], ["FI", "FIN", "Finland"],
    ["CZ", "CZE", "Czechia"], ["HU", "HUN", "Hungary"], ["RO", "ROU", "Romania"], ["BG", "BGR", "Bulgaria"],
    ["UA", "UKR", "Ukraine"], ["RU", "RUS", "Russia"], ["US", "USA", "United States"], ["CA", "CAN", "Canada"],
    ["MX", "MEX", "Mexico"], ["BR", "BRA", "Brazil"], ["AR", "ARG", "Argentina"], ["CL", "CHL", "Chile"],
    ["CO", "COL", "Colombia"], ["PE", "PER", "Peru"], ["CN", "CHN", "China"], ["HK", "HKG", "Hong Kong"],
    ["TW", "TWN", "Taiwan"], ["JP", "JPN", "Japan"], ["KR", "KOR", "South Korea"], ["IN", "IND", "India"],
    ["PK", "PAK", "Pakistan"], ["BD", "BGD", "Bangladesh"], ["LK", "LKA", "Sri Lanka"], ["SG", "SGP", "Singapore"],
    ["MY", "MYS", "Malaysia"], ["TH", "THA", "Thailand"], ["VN", "VNM", "Vietnam"], ["ID", "IDN", "Indonesia"],
    ["PH", "PHL", "Philippines"], ["AU", "AUS", "Australia"], ["NZ", "NZL", "New Zealand"], ["ZA", "ZAF", "South Africa"],
    ["NG", "NGA", "Nigeria"], ["KE", "KEN", "Kenya"], ["ET", "ETH", "Ethiopia"], ["MA", "MAR", "Morocco"],
    ["DZ", "DZA", "Algeria"], ["TN", "TUN", "Tunisia"], ["GH", "GHA", "Ghana"], ["TZ", "TZA", "Tanzania"], ["DJ", "DJI", "Djibouti"]
  ];

  FF.register({
    id: "codes", group: "Reference", title: "Airport, port and country codes",
    desc: "Search IATA airport codes, UN/LOCODE port codes and ISO country codes.",
    render: function (root) {
      root.appendChild(FF.tabs([
        { id: "air", title: "Airports (IATA)", render: function () { return searchTable(["Code", "Airport", "City and country"], AIRPORTS, { placeholder: "Search by code, airport or city" }); } },
        { id: "port", title: "Ports (UN/LOCODE)", render: function () { return searchTable(["LOCODE", "Port", "Country"], PORTS, { placeholder: "Search by code, port or country" }); } },
        { id: "country", title: "Countries (ISO)", render: function () { return searchTable(["2 letters", "3 letters", "Country"], COUNTRIES, { placeholder: "Search by code or country" }); } }
      ]));
      root.appendChild(h("p", { class: "meta", style: "margin-top:14px", text: "This is a quick list of common locations, not the full register. UN/LOCODE codes start with the two-letter country code. For a complete list use the official UN/LOCODE and IATA databases." }));
    }
  });

  /* ================= Incoterms ================= */
  var TERMS = [
    { k: "EXW", n: "Ex Works", g: "Any mode", exp: "B", car: "B", ins: "None", imp: "B", unl: "B", risk: "Goods placed at the buyer's disposal at the seller's premises",
      seller: "Makes the goods available at its premises or another named place, packed and ready. Does not load them.", buyer: "Loads, clears export, pays all transport and insurance, and clears import.",
      watch: "The buyer must handle export formalities in the seller's country, which is often hard. FCA is usually a better choice." },
    { k: "FCA", n: "Free Carrier", g: "Any mode", exp: "S", car: "B", ins: "None", imp: "B", unl: "B", risk: "Goods handed to the carrier named by the buyer",
      seller: "Clears export and delivers the goods to the buyer's carrier at the named place. Loads them if that place is the seller's premises.", buyer: "Pays main transport and insurance, and clears import.",
      watch: "Name the exact place of delivery. Under Incoterms 2020 the buyer can ask its carrier to give the seller an on-board bill of lading." },
    { k: "CPT", n: "Carriage Paid To", g: "Any mode", exp: "S", car: "S", ins: "None", imp: "B", unl: "B", risk: "Goods handed to the first carrier, at origin",
      seller: "Clears export and pays carriage to the named destination.", buyer: "Takes the risk from the first carrier onward, arranges insurance and clears import.",
      watch: "Cost is paid to the destination, but risk passes much earlier. The buyer should insure from the start." },
    { k: "CIP", n: "Carriage and Insurance Paid To", g: "Any mode", exp: "S", car: "S", ins: "Seller", imp: "B", unl: "B", risk: "Goods handed to the first carrier, at origin",
      seller: "Same as CPT, plus insurance for the buyer's benefit.", buyer: "Takes the risk from the first carrier onward and clears import.",
      watch: "Incoterms 2020 requires the wide Institute Cargo Clauses (A) cover, at least 110% of the contract value." },
    { k: "DAP", n: "Delivered at Place", g: "Any mode", exp: "S", car: "S", ins: "None", imp: "B", unl: "B", risk: "Goods ready for unloading at the named destination",
      seller: "Clears export, pays transport and bears the risk until the goods arrive at the destination on the delivering vehicle.", buyer: "Unloads, clears import and pays duties and taxes.",
      watch: "Seller carries the risk for the whole journey, so it will usually insure. Name the destination precisely." },
    { k: "DPU", n: "Delivered at Place Unloaded", g: "Any mode", exp: "S", car: "S", ins: "None", imp: "B", unl: "S", risk: "Goods unloaded at the named destination",
      seller: "Same as DAP, but also unloads the goods at the destination.", buyer: "Clears import and pays duties and taxes.",
      watch: "The only Incoterm where the seller must unload. It replaced DAT in 2020 and the place can be any location, not only a terminal." },
    { k: "DDP", n: "Delivered Duty Paid", g: "Any mode", exp: "S", car: "S", ins: "None", imp: "S", unl: "B", risk: "Goods ready for unloading at the named destination, import cleared",
      seller: "Takes on everything: export and import clearance, duties, taxes and transport to the destination.", buyer: "Unloads the goods.",
      watch: "Maximum duty for the seller. It needs to be able to clear import in the buyer's country, which can be hard." },
    { k: "FOB", n: "Free On Board", g: "Sea and inland waterway only", exp: "S", car: "B", ins: "None", imp: "B", unl: "B", risk: "Goods on board the vessel at the port of shipment",
      seller: "Clears export and loads the goods on the vessel named by the buyer.", buyer: "Pays the sea freight and insurance, and clears import.",
      watch: "Not suited to containers handed over at a terminal, because the risk passes on board the ship. FCA is better for containers." },
    { k: "CFR", n: "Cost and Freight", g: "Sea and inland waterway only", exp: "S", car: "S", ins: "None", imp: "B", unl: "B", risk: "Goods on board the vessel at the port of shipment",
      seller: "Clears export, loads the goods and pays the freight to the destination port.", buyer: "Takes the risk once the goods are on board, arranges insurance and clears import.",
      watch: "Freight is paid to the destination, but risk passes at origin. For containers, CPT is usually better." },
    { k: "CIF", n: "Cost, Insurance and Freight", g: "Sea and inland waterway only", exp: "S", car: "S", ins: "Seller", imp: "B", unl: "B", risk: "Goods on board the vessel at the port of shipment",
      seller: "Same as CFR, plus minimum insurance for the buyer's benefit.", buyer: "Takes the risk once the goods are on board and clears import.",
      watch: "The required cover is the basic Institute Cargo Clauses (C), at least 110% of the contract value. Buyers may want more." }
  ];

  function sb(v) {
    if (v === "S") return h("span", { class: "s", text: "Seller" });
    if (v === "B") return h("span", { class: "b", text: "Buyer" });
    return h("span", { class: "dash", text: v });
  }

  FF.register({
    id: "incoterms", group: "Reference", title: "Incoterms 2020",
    desc: "Who does what and who bears the risk under EXW, FCA, CPT, CIP, DAP, DPU, DDP, FOB, CFR and CIF.",
    render: function (root) {
      var detail = h("div", { class: "term-detail" });
      function show(k) {
        var t = TERMS.filter(function (x) { return x.k === k; })[0];
        FF.clear(detail);
        detail.appendChild(h("h3", { text: t.k }));
        detail.appendChild(h("div", { class: "full", text: t.n + " (" + t.g.toLowerCase() + ")" }));
        detail.appendChild(h("div", { class: "term-grid" },
          h("div", null, h("h4", { text: "Seller" }), h("p", { text: t.seller })),
          h("div", null, h("h4", { text: "Buyer" }), h("p", { text: t.buyer })),
          h("div", null, h("h4", { text: "Risk passes" }), h("p", { text: t.risk })),
          h("div", null, h("h4", { text: "Watch out" }), h("p", { text: t.watch }))));
      }
      var chips = FF.chips(TERMS.map(function (t) { return t.k; }), ["FOB"], function (sel) { if (sel.length) show(sel[0]); }, true);
      root.appendChild(chips);
      root.appendChild(detail);
      show("FOB");
      root.appendChild(h("h3", { style: "font:700 1.5rem var(--head);margin:8px 0 10px", text: "Side by side" }));
      root.appendChild(FF.table(
        ["Term", "Transport", "Export clearance", "Main carriage", "Insurance", "Unloading", "Import clearance", "Risk passes"],
        TERMS.map(function (t) {
          return [h("span", { class: "code", text: t.k }), t.g === "Any mode" ? "Any" : "Sea only", sb(t.exp), sb(t.car), t.ins === "Seller" ? sb("S") : h("span", { class: "dash", text: "Not required" }), sb(t.unl), sb(t.imp), t.risk];
        }), "wide"));
      root.appendChild(h("p", { class: "meta", style: "margin-top:14px", text: "Incoterms rules set duties between buyer and seller. They do not transfer ownership or cover payment terms. FAS (Free Alongside Ship) is the eleventh term and is also sea only. The contract should name the Incoterms edition, for example “FOB Beirut, Incoterms 2020”." }));
    }
  });

  /* ================= glossary ================= */
  var GLOSS = [
    ["Demurrage", "Port charge", "A charge by the shipping line when a full container stays in the port or terminal longer than the free time. It is counted per day after the free days end."],
    ["Detention", "Container charge", "A charge by the shipping line when its container stays outside the terminal, for example at the consignee's warehouse, beyond the free time. It runs until the empty container is returned."],
    ["Free days", "Free time", "The number of days a container can stay at the terminal (demurrage) or outside it (detention) before charges begin. The number and the counting rules are set by the carrier."],
    ["Rollover", "Booking", "When a booked container is not loaded on the planned vessel and is moved to a later sailing, usually because the vessel is full or space is cut. The cargo arrives later than planned."],
    ["Transshipment", "Routing", "Moving cargo from one vessel to another at an intermediate port on the way to its destination. It adds time and a small risk of delay."],
    ["CY", "Container yard", "The area of a terminal where containers are stored. CY to CY means the carrier takes a full container from the origin yard to the destination yard."],
    ["CFS", "Container freight station", "A warehouse where LCL cargo is packed into containers at origin or unpacked at destination."],
    ["FCL", "Full container load", "Cargo that fills a whole container for one shipper. Priced per container."],
    ["LCL", "Less than container load", "Cargo from several shippers combined in one container at a CFS. Priced per cubic metre or tonne, whichever is greater."],
    ["TEU", "Twenty-foot equivalent unit", "The standard unit for counting containers. A 20 ft container is 1 TEU and a 40 ft container is 2 TEU."],
    ["FEU", "Forty-foot equivalent unit", "One 40 ft container. Equal to 2 TEU."],
    ["B/L", "Bill of lading", "The carrier's receipt for the cargo, the contract of carriage and, if it is an original, a document of title."],
    ["Telex release", "Documents", "An instruction from the carrier's origin office to release the cargo at destination without surrender of the original bills of lading."],
    ["Delivery order (DO)", "Documents", "The document from the carrier or agent that lets the consignee collect the cargo, issued after charges are paid and the bill of lading is surrendered."],
    ["VGM", "Verified gross mass", "The verified total weight of a packed container, which the shipper must give the carrier before loading under SOLAS rules."],
    ["THC", "Terminal handling charge", "A charge for moving a container between the ship and the terminal gate at the origin or destination port."],
    ["ETD and ETA", "Schedule", "Estimated time of departure and estimated time of arrival. Both can change."],
    ["Cut-off", "Schedule", "The last date and time the carrier will accept a container, documents or VGM for a vessel. Missing it can mean a rollover."],
    ["Chargeable weight", "Pricing", "The weight a carrier charges for: the larger of actual weight and volumetric weight."],
    ["W/M", "Pricing", "Weight or measurement. Sea freight is charged on 1,000 kg or 1 cubic metre, whichever gives the higher number."],
    ["NVOCC", "Carrier type", "A non-vessel-operating common carrier. It sells ocean transport and issues its own bills of lading but does not own vessels."],
    ["Reefer", "Equipment", "A refrigerated container used for temperature-controlled cargo."],
    ["OOG", "Cargo type", "Out of gauge cargo that exceeds the internal size of a standard container, so it travels on open top or flat rack equipment."],
    ["Consignee", "Parties", "The party named to receive the goods at destination."],
    ["Shipper", "Parties", "The party that sends the goods and signs the shipping documents. Also called the consignor."]
  ];

  FF.register({
    id: "glossary", group: "Reference", title: "Freight glossary",
    desc: "Plain-language meanings of demurrage, detention, rollover, transshipment, free days, CY, CFS, FCL, LCL and more.",
    render: function (root) {
      var q = h("input", { type: "text", placeholder: "Search a term", "aria-label": "Search a term" });
      var list = h("dl", { class: "glossary" });
      function draw() {
        var s = q.value.trim().toLowerCase();
        FF.clear(list);
        var items = GLOSS.filter(function (g) { return !s || (g[0] + " " + g[1] + " " + g[2]).toLowerCase().indexOf(s) > -1; });
        if (!items.length) list.appendChild(h("p", { class: "empty", text: "No match. Try another word." }));
        items.forEach(function (g) {
          list.appendChild(h("div", { class: "gloss" }, h("dt", null, g[0], h("small", { text: g[1] })), h("dd", { text: g[2] })));
        });
      }
      q.addEventListener("input", draw);
      root.appendChild(h("div", { class: "searchbar" }, h("div", { class: "field" }, q)));
      root.appendChild(list);
      draw();
    }
  });
})();
