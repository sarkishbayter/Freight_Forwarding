/* Login, password-reset requests and the admin panel.
   Accounts live in Supabase (passwords are stored encrypted there, never in this repository).
   With no settings in config.js the site opens without a login. */
(function () {
  "use strict";

  var cfg = window.FF_CONFIG || {};
  var h = FF.h;
  var enabled = !!(cfg.supabaseUrl && cfg.supabaseKey);
  var sb = null;
  var me = null; // { username, full_name, role }
  var started = false;
  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.min.js";
  var DOMAIN = "@tgf-toolbox.com";

  function norm(name) { return String(name || "").trim().toLowerCase().replace(/\s+/g, "."); }
  function emailOf(name) { return norm(name) + DOMAIN; }

  function loadSdk() {
    return new Promise(function (ok, fail) {
      if (window.supabase && window.supabase.createClient) return ok();
      var s = document.createElement("script");
      s.src = SDK; s.onload = ok; s.onerror = function () { fail(new Error("sdk")); };
      document.head.appendChild(s);
    });
  }

  /* ---------- small UI helpers ---------- */
  var root = null;
  function msg(box, text, kind) {
    FF.clear(box);
    box.className = "auth-msg" + (kind ? " " + kind : "");
    box.hidden = !text;
    if (text) box.textContent = text;
  }

  function passField(label, id, autocomplete) {
    var input = h("input", { type: "password", id: id, autocomplete: autocomplete, required: true, spellcheck: "false" });
    var eye = h("button", { type: "button", class: "eye", "aria-label": "Show password", text: "Show", onclick: function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      eye.textContent = show ? "Hide" : "Show";
      eye.setAttribute("aria-label", show ? "Hide password" : "Show password");
    } });
    return { input: input, el: h("label", { class: "field" }, h("span", { class: "cap", text: label }), h("div", { class: "pw" }, input, eye)) };
  }

  /* ---------- login page ---------- */
  function showLogin() {
    document.documentElement.classList.add("locked");
    if (!root) {
      root = h("div", { id: "login", class: "login" });
      var scene = document.querySelector(".hero .scene");
      if (scene) { var sc = scene.cloneNode(true); sc.setAttribute("class", "scene login-scene"); root.appendChild(sc); }
      document.body.appendChild(root);
    }
    var card = root.querySelector(".login-card");
    if (card) card.remove();
    card = h("main", { class: "login-card" });
    root.appendChild(card);
    var saved = FF.store.get("resetreq", null);
    if (saved && saved.id) viewReset(card, saved); else viewSignIn(card);
  }

  function brand() {
    return h("div", { class: "login-brand" }, h("span", { class: "mark", "aria-hidden": "true" }), h("span", { text: "Freight toolbox" }));
  }

  function viewSignIn(card) {
    FF.clear(card);
    var user = h("input", { type: "text", id: "lg-user", autocomplete: "username", required: true, autocapitalize: "words", spellcheck: "false" });
    var pass = passField("Password", "lg-pass", "current-password");
    var note = h("div", { class: "auth-msg", hidden: true, role: "alert" });
    var go = h("button", { type: "submit", class: "btn big", text: "Sign in" });
    var form = h("form", { class: "login-form", novalidate: true },
      h("label", { class: "field" }, h("span", { class: "cap", text: "Username" }), user),
      pass.el, note, go,
      h("button", { type: "button", class: "linklike", text: "Forgot password?", onclick: function () { viewForgot(card); } }));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!sb) { msg(note, "The login service is not reachable. Reload the page.", "bad"); return; }
      if (!user.value.trim() || !pass.input.value) { msg(note, "Enter your username and password.", "bad"); return; }
      go.disabled = true; go.textContent = "Signing in...";
      sb.auth.signInWithPassword({ email: emailOf(user.value), password: pass.input.value }).then(function (r) {
        if (r.error || !r.data || !r.data.session) {
          var er = new Error((r.error && r.error.message) || "bad"); er.wrong = !r.error || r.error.status === 400 || /invalid login/i.test(er.message); throw er;
        }
        return enter(r.data.session);
      }).catch(function (err) {
        go.disabled = false; go.textContent = "Sign in";
        pass.input.value = "";
        if (err && err.wrong) msg(note, "Wrong username or password.", "bad");
        else msg(note, "Sign-in service error: " + ((err && err.message) || "unknown") + ". Send this message to the administrator.", "bad");
      });
    });
    card.appendChild(brand());
    card.appendChild(h("h1", { text: "Sign in" }));
    card.appendChild(form);
    user.focus();
  }

  function viewForgot(card) {
    FF.clear(card);
    var user = h("input", { type: "text", autocomplete: "username", required: true, autocapitalize: "words", spellcheck: "false" });
    var note = h("div", { class: "auth-msg", hidden: true, role: "alert" });
    var go = h("button", { type: "submit", class: "btn big", text: "Send request" });
    var form = h("form", { class: "login-form", novalidate: true },
      h("label", { class: "field" }, h("span", { class: "cap", text: "Username" }), user),
      note, go,
      h("button", { type: "button", class: "linklike", text: "Back to sign in", onclick: function () { viewSignIn(card); } }));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!sb) { msg(note, "The login service is not reachable. Reload the page.", "bad"); return; }
      if (!user.value.trim()) { msg(note, "Enter your username.", "bad"); return; }
      go.disabled = true; go.textContent = "Sending...";
      sb.rpc("request_reset", { p_username: user.value }).then(function (r) {
        var d = r.data;
        if (r.error || !d) throw new Error("fail");
        if (d.error === "not_found") { msg(note, "No user with that name.", "bad"); return; }
        if (d.error === "too_soon") { msg(note, "A request was sent a moment ago. Please wait for the administrator.", "bad"); return; }
        var req = { id: d.id, name: d.name };
        FF.store.set("resetreq", req);
        notifyAdmin(d.name);
        viewReset(card, req);
      }).catch(function () {
        msg(note, "Could not send the request. Try again in a moment.", "bad");
      }).then(function () { go.disabled = false; go.textContent = "Send request"; });
    });
    card.appendChild(brand());
    card.appendChild(h("h1", { text: "Forgot password" }));
    card.appendChild(h("p", { class: "login-sub", text: "The administrator will be asked to approve your request." }));
    card.appendChild(form);
    user.focus();
  }

  /* waits for the decision, then lets the user pick the new password */
  var poll = null;
  function viewReset(card, req) {
    FF.clear(card);
    if (poll) { clearInterval(poll); poll = null; }
    var body = h("div");
    card.appendChild(brand());
    card.appendChild(h("h1", { text: "Password request" }));
    card.appendChild(body);

    function done() { FF.store.set("resetreq", null); if (poll) { clearInterval(poll); poll = null; } }
    function back() { done(); viewSignIn(card); }

    function waiting() {
      FF.clear(body);
      body.appendChild(h("p", { class: "login-sub", text: "Request sent for " + (req.name || "your account") + ". Waiting for the administrator to approve it. This page updates by itself." }));
      body.appendChild(h("div", { class: "auth-msg wait", text: "Waiting for approval..." }));
      body.appendChild(h("button", { type: "button", class: "linklike", text: "Cancel and back to sign in", onclick: back }));
    }
    function rejected() {
      done(); FF.clear(body);
      body.appendChild(h("div", { class: "auth-msg bad", role: "alert", text: "Your request was rejected by the administrator." }));
      body.appendChild(h("button", { type: "button", class: "btn big", text: "Back to sign in", onclick: function () { viewSignIn(card); } }));
    }
    function expired() {
      done(); FF.clear(body);
      body.appendChild(h("div", { class: "auth-msg bad", role: "alert", text: "This request is no longer valid. Send a new one." }));
      body.appendChild(h("button", { type: "button", class: "btn big", text: "Back to sign in", onclick: function () { viewSignIn(card); } }));
    }
    function approved() {
      if (poll) { clearInterval(poll); poll = null; }
      FF.clear(body);
      var p1 = passField("New password", "np1", "new-password");
      var p2 = passField("Repeat new password", "np2", "new-password");
      var note = h("div", { class: "auth-msg", hidden: true, role: "alert" });
      var go = h("button", { type: "submit", class: "btn big", text: "Save new password" });
      var form = h("form", { class: "login-form", novalidate: true }, h("div", { class: "auth-msg good", text: "Approved. Choose your new password (at least 8 characters)." }), p1.el, p2.el, note, go);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (p1.input.value.length < 8) { msg(note, "Use at least 8 characters.", "bad"); return; }
        if (p1.input.value !== p2.input.value) { msg(note, "The two passwords are different.", "bad"); return; }
        go.disabled = true; go.textContent = "Saving...";
        sb.rpc("complete_reset", { p_id: req.id, p_password: p1.input.value }).then(function (r) {
          if (r.error) throw new Error("fail");
          if (r.data === "ok") {
            done(); FF.clear(body);
            body.appendChild(h("div", { class: "auth-msg good", text: "Password saved. You can sign in now." }));
            body.appendChild(h("button", { type: "button", class: "btn big", text: "Go to sign in", onclick: function () { viewSignIn(card); } }));
          } else if (r.data === "weak") { msg(note, "Use at least 8 characters.", "bad"); go.disabled = false; go.textContent = "Save new password"; }
          else { expired(); }
        }).catch(function () { msg(note, "Could not save. Try again.", "bad"); go.disabled = false; go.textContent = "Save new password"; });
      });
      body.appendChild(form);
      p1.input.focus();
    }
    function check() {
      sb.rpc("request_status", { p_id: req.id }).then(function (r) {
        var s = r.data;
        if (s === "approved") approved();
        else if (s === "rejected") rejected();
        else if (s === "expired" || s === "unknown" || s === "done") expired();
      }).catch(function () { /* keep waiting */ });
    }
    waiting();
    check();
    poll = setInterval(check, 5000);
  }

  /* email to the administrator (EmailJS). The admin page lists the request either way. */
  function notifyAdmin(name) {
    var e = cfg.emailjs || {};
    if (!e.service || !e.template || !e.publicKey) return;
    var link = location.origin + location.pathname + "#/admin";
    try {
      fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: e.service, template_id: e.template, user_id: e.publicKey,
          template_params: { to_email: cfg.adminEmail || "", user_name: name, requested_at: new Date().toLocaleString("en-GB"), admin_link: link }
        })
      }).catch(function () { /* the request is still in the admin page */ });
    } catch (err) { /* ignore */ }
  }

  /* ---------- signed in ---------- */
  function enter(session) {
    return sb.from("profiles").select("username,full_name,role").eq("id", session.user.id).single().then(function (r) {
      if (r.error || !r.data) throw new Error("profile");
      me = r.data;
      unlock();
    });
  }

  function unlock() {
    if (poll) { clearInterval(poll); poll = null; }
    document.documentElement.classList.remove("locked");
    if (root) { root.remove(); root = null; }
    if (started) return;
    started = true;
    FF.userKey = me.username;
    if (me.role === "admin") {
      if (FF.groups.indexOf("Admin") < 0) FF.groups.push("Admin");
      FF.register({ id: "admin", group: "Admin", title: "Password requests", desc: "Approve or reject password requests.", render: renderAdmin, onShow: function () { if (FF._adminRefresh) FF._adminRefresh(); } });
    }
    FF.start();
    accountBar();
    if (me.role === "admin") badge();
  }

  function accountBar() {
    var side = document.getElementById("sidebar");
    var bar = h("div", { class: "account" },
      h("div", { class: "who" }, h("span", { class: "avatar", text: me.full_name.charAt(0) }), h("div", null, h("strong", { text: me.full_name }), h("div", { class: "role", text: me.role === "admin" ? "Administrator" : "User" }))),
      h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn ghost small", text: "Change password", onclick: changePassword }),
        h("button", { type: "button", class: "btn ghost small", text: "Sign out", onclick: signOut })));
    side.appendChild(bar);
  }

  function signOut() {
    sb.auth.signOut().then(function () { location.hash = ""; location.reload(); });
  }

  function changePassword() {
    var dlg = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": "Change password" });
    var p1 = passField("New password", "cp1", "new-password");
    var p2 = passField("Repeat new password", "cp2", "new-password");
    var note = h("div", { class: "auth-msg", hidden: true, role: "alert" });
    var save = h("button", { type: "submit", class: "btn", text: "Save" });
    var form = h("form", { class: "login-form", novalidate: true }, p1.el, p2.el, note,
      h("div", { class: "btn-row" }, save, h("button", { type: "button", class: "btn ghost", text: "Cancel", onclick: function () { dlg.remove(); } })));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (p1.input.value.length < 8) { msg(note, "Use at least 8 characters.", "bad"); return; }
      if (p1.input.value !== p2.input.value) { msg(note, "The two passwords are different.", "bad"); return; }
      save.disabled = true;
      sb.auth.updateUser({ password: p1.input.value }).then(function (r) {
        if (r.error) throw new Error("x");
        msg(note, "Password changed.", "good");
        setTimeout(function () { dlg.remove(); }, 1200);
      }).catch(function () { save.disabled = false; msg(note, "Could not change the password. Sign in again and retry.", "bad"); });
    });
    dlg.appendChild(h("div", { class: "modal-box" }, h("h2", { text: "Change password" }), form));
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.remove(); });
    document.body.appendChild(dlg);
    p1.input.focus();
  }

  /* ---------- admin page ---------- */
  function renderAdmin(sec) {
    var list = h("div");
    var note = h("div", { class: "auth-msg", hidden: true });
    sec.appendChild(h("div", { class: "panel", style: "margin-top:0" }, note, list));

    function when(iso) { return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    var LABEL = { pending: "Waiting", approved: "Approved", rejected: "Rejected", done: "Password changed" };

    function decide(id, ok) {
      sb.rpc("admin_decide", { p_id: id, p_approve: ok }).then(function (r) {
        if (r.error) throw new Error("x");
        load();
      }).catch(function () { msg(note, "Could not save the decision.", "bad"); });
    }
    function load() {
      return sb.rpc("admin_list_requests").then(function (r) {
        if (r.error) throw new Error("x");
        msg(note, "");
        FF.clear(list);
        var rows = r.data || [];
        setBadge(rows.filter(function (q) { return q.status === "pending"; }).length);
        if (!rows.length) { list.appendChild(h("p", { class: "empty", text: "No requests yet." })); return; }
        list.appendChild(FF.table(["User", "Requested", "Status", ""], rows.map(function (q) {
          var acts = q.status === "pending"
            ? h("div", { class: "btn-row", style: "gap:6px" },
              h("button", { type: "button", class: "btn small", text: "Approve", onclick: function () { decide(q.id, true); } }),
              h("button", { type: "button", class: "btn ghost small", text: "Reject", onclick: function () { decide(q.id, false); } }))
            : "";
          return [h("strong", { text: q.full_name }), when(q.created_at), h("span", { class: "pill " + q.status, text: LABEL[q.status] || q.status }), acts];
        })));
      }).catch(function () { msg(note, "Could not load the requests.", "bad"); });
    }
    FF._adminRefresh = load;
    load();
    var t = setInterval(function () { if (!sec.hidden) load(); }, 15000);
    sec._t = t;
  }

  function setBadge(n) {
    var a = document.querySelector('#nav a[data-id="admin"]');
    if (!a) return;
    var b = a.querySelector(".count");
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = h("span", { class: "count" }); a.appendChild(b); }
    b.textContent = String(n);
  }
  function badge() {
    function tick() {
      sb.rpc("admin_list_requests").then(function (r) {
        if (!r.error) setBadge((r.data || []).filter(function (q) { return q.status === "pending"; }).length);
      }).catch(function () { /* ignore */ });
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- start ---------- */
  FF.boot = function () {
    if (!enabled) { FF.start(); return; }
    document.documentElement.classList.add("locked");
    loadSdk().then(function () {
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
      return sb.auth.getSession();
    }).then(function (r) {
      var s = r && r.data && r.data.session;
      if (s) return enter(s).catch(function () { return sb.auth.signOut().then(showLogin); });
      showLogin();
    }).catch(function () {
      showLogin();
      var n = document.querySelector(".login-card");
      if (n) n.appendChild(h("div", { class: "auth-msg bad", text: "Could not reach the login service. Check your connection and reload." }));
    });
  };
})();
