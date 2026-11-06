/* =========================================================================
   Questions and answers: the page side of foshchii.com/psychology/questions.html.

   Shows the questions Sviatoslav has published, with his answers and the
   comments he has approved, and sends new questions and comments to the Q&A
   backend (qa-api/google-apps-script.gs). Nothing a visitor sends shows up
   here until he approves it in his Google Sheet.

   MARKUP
     <div class="qa" data-api="https://script.google.com/macros/s/…/exec"
          data-email="sviatoslav@foshchii.com">
       <div class="qa-list"></div>
     </div>
     <form class="qa-ask"> title, question, name, consent, qa_hp </form>

   TALKING TO APPS SCRIPT: a browser can't read Apps Script's reply to fetch()
   from another site, so reads go over JSONP (a <script> load). Posts go as a
   blind form POST carrying a random request id, and then the page asks over
   JSONP whether a post with that id arrived. No cookies, no storage.
   ========================================================================= */
(function () {
  "use strict";

  var root = document.querySelector(".qa");
  if (!root) return;
  var api = (root.getAttribute("data-api") || "").trim();
  var email = root.getAttribute("data-email") || "";
  var listEl = root.querySelector(".qa-list");
  var askForm = document.querySelector(".qa-ask");
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  /* ------------------------------ helpers ------------------------------ */
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === "text") n.textContent = v;
      else if (k === "className") n.className = v;
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) {
      if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  /* Text as paragraphs: a blank line starts a new one, a single line break
   * stays a line break. Links are made clickable only in Sviatoslav's own
   * answers, never in what visitors write. */
  var URL_RE = /https?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]'»]/g;
  function paragraphs(text, links) {
    var frag = document.createDocumentFragment();
    String(text || "").split(/\n{2,}/).forEach(function (para) {
      if (!para.trim()) return;
      var p = el("p");
      para.split("\n").forEach(function (line, i) {
        if (i) p.appendChild(el("br"));
        if (!links) { p.appendChild(document.createTextNode(line)); return; }
        var last = 0;
        line.replace(URL_RE, function (url, at) {
          p.appendChild(document.createTextNode(line.slice(last, at)));
          p.appendChild(el("a", { href: url, rel: "nofollow noopener noreferrer", target: "_blank", text: url }));
          last = at + url.length;
          return url;
        });
        p.appendChild(document.createTextNode(line.slice(last)));
      });
      frag.appendChild(p);
    });
    return frag;
  }

  function dateEl(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
    if (!m) return null;
    return el("time", { datetime: ymd, text: (+m[3]) + " " + MONTHS[+m[2] - 1] + " " + m[1] });
  }

  function requestId() {
    var c = window.crypto;
    if (c && c.randomUUID) return c.randomUUID();
    var bytes = new Uint8Array(16);
    if (c && c.getRandomValues) c.getRandomValues(bytes);
    else for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function endpoint(params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    }).join("&");
    return api + (api.indexOf("?") === -1 ? "?" : "&") + q;
  }

  /* A <script> load whose reply calls back into the page. A sign-in or error
   * page served instead fires load without calling back, so load without a
   * callback counts as a failure too, rather than waiting out the timeout. */
  function jsonp(params, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = "sfq_cb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
      var s = document.createElement("script");
      var done = false;
      var timer = setTimeout(function () { finish(new Error("timeout")); }, timeoutMs || 15000);
      function finish(err, data) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (s.parentNode) s.parentNode.removeChild(s);
        if (err) reject(err); else resolve(data);
      }
      window[cb] = function (data) { finish(null, data); };
      s.onerror = function () { finish(new Error("network")); };
      s.onload = function () { setTimeout(function () { finish(new Error("badresponse")); }, 0); };
      params.callback = cb;
      s.src = endpoint(params);
      document.head.appendChild(s);
    });
  }

  /* Sends a post blind, then asks whether it arrived. A failed send is still
   * checked: the post can arrive even when the browser reports an error. */
  function post(fields) {
    var body = new URLSearchParams();
    Object.keys(fields).forEach(function (k) { body.append(k, fields[k]); });
    var sent;
    try {
      sent = fetch(api, { method: "POST", mode: "no-cors", body: body, credentials: "omit", cache: "no-store" });
    } catch (e) {
      sent = Promise.reject(e);
    }
    var check = function () { return arrived(fields.rid); };
    return sent.then(check, check);
  }

  function arrived(rid) {
    var waits = [800, 1500, 2500, 4000, 6000];
    return new Promise(function (resolve) {
      var i = 0;
      (function next() {
        if (i >= waits.length) { resolve(false); return; }
        setTimeout(function () {
          jsonp({ action: "received", rid: rid }, 8000).then(function (r) {
            if (r && r.received) resolve(true);
            else { i++; next(); }
          }, function () { i++; next(); });
        }, waits[i]);
      })();
    });
  }

  function emailLink() {
    return el("a", { href: "mailto:" + email, text: email });
  }

  function setStatus(node, message, kind) {
    node.textContent = "";
    node.className = "qa-status" + (kind ? " is-" + kind : "");
    if (message) node.appendChild(typeof message === "string" ? document.createTextNode(message) : message);
  }

  function failedMessage(what) {
    return el("span", null, [
      "I couldn’t confirm that your " + what + " arrived. Please try again in a few minutes, or write to me at ",
      emailLink(), "."
    ]);
  }

  /* ------------------------------ the list ----------------------------- */
  function showListMessage(message, retry) {
    listEl.textContent = "";
    var p = el("p", { className: "qa-empty", text: message });
    listEl.appendChild(p);
    if (retry) {
      var b = el("button", { type: "button", className: "qa-link", text: "Try again" });
      b.addEventListener("click", load);
      p.appendChild(document.createTextNode(" "));
      p.appendChild(b);
    }
  }

  function load() {
    if (!api) { showListMessage("Questions and answers will appear here soon."); return; }
    listEl.setAttribute("aria-busy", "true");
    showListMessage("Loading questions…");
    jsonp({ action: "list" }).then(function (r) {
      if (!r || r.ok === false || !Array.isArray(r.questions)) throw new Error("bad");
      render(r.questions);
    }).catch(function () {
      showListMessage("The questions couldn’t load just now.", true);
    }).then(function () {
      listEl.removeAttribute("aria-busy");
    });
  }

  function render(questions) {
    listEl.textContent = "";
    if (!questions.length) {
      showListMessage("No questions here yet. Yours could be the first.");
      return;
    }
    questions.forEach(function (q) { listEl.appendChild(renderQuestion(q)); });
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains("qa-item")) {
      target.classList.add("is-target");
      target.scrollIntoView({ block: "start" });
    }
  }

  function renderQuestion(q) {
    var anchor = "question-" + q.id;
    var item = el("article", { className: "qa-item", id: anchor, "aria-labelledby": anchor + "-title" });
    item.appendChild(el("h3", { id: anchor + "-title" }, [el("a", { href: "#" + anchor, text: q.title || "Question" })]));
    item.appendChild(el("p", { className: "qa-meta" }, ["Asked by ", el("b", { text: q.name || "Anonymous" }), " · ", dateEl(q.asked)]));
    var question = el("div", { className: "qa-question" });
    question.appendChild(paragraphs(q.question, false));
    item.appendChild(question);

    if (q.answer) {
      var answer = el("div", { className: "qa-answer" }, [el("p", { className: "qa-answer-label", text: "Sviatoslav’s answer" })]);
      answer.appendChild(paragraphs(q.answer, true));
      item.appendChild(answer);
    } else {
      item.appendChild(el("p", { className: "qa-unanswered", text: "Not answered yet." }));
    }

    var comments = q.comments || [];
    var box = el("div", { className: "qa-comments" });
    if (comments.length) {
      box.appendChild(el("h4", { text: comments.length === 1 ? "1 comment" : comments.length + " comments" }));
      var ol = el("ol");
      comments.forEach(function (c) {
        var meta = el("p", { className: "qa-meta" }, [el("b", { text: c.name || "Anonymous" })]);
        if (c.mine) meta.appendChild(el("span", { className: "qa-badge", text: "Counsellor" }));
        var when = dateEl(c.date);
        if (when) { meta.appendChild(document.createTextNode(" · ")); meta.appendChild(when); }
        var li = el("li", { className: c.mine ? "qa-comment is-mine" : "qa-comment" }, [meta]);
        li.appendChild(paragraphs(c.comment, false));
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }
    box.appendChild(commentForm(q, anchor));
    item.appendChild(box);
    return item;
  }

  function field(id, label, control, hint) {
    var lab = el("label", { for: id }, [label]);
    if (hint) lab.appendChild(el("span", { className: "hint", text: hint }));
    return el("div", { className: "field" }, [lab, control]);
  }

  function commentForm(q, anchor) {
    var wrap = el("div", { className: "qa-comment-wrap" });
    var formId = anchor + "-comment";
    var toggle = el("button", { type: "button", className: "qa-link", "aria-expanded": "false", "aria-controls": formId, text: "Write a comment" });
    var text = el("textarea", { id: formId + "-text", name: "comment", required: true, maxlength: "1500", rows: "4" });
    var name = el("input", { id: formId + "-name", name: "name", type: "text", maxlength: "40", autocomplete: "off" });
    var consent = el("input", { id: formId + "-consent", name: "consent", type: "checkbox", required: true });
    var hp = el("input", { id: formId + "-hp", name: "qa_hp", type: "text", tabindex: "-1", autocomplete: "off" });
    var submit = el("button", { type: "submit", className: "btn", text: "Send comment" });
    var status = el("p", { className: "qa-status", role: "status" });
    var fields = el("fieldset", null, [
      el("legend", { className: "visually-hidden", text: "Comment on “" + (q.title || "this question") + "”" }),
      field(formId + "-text", "Your comment", text),
      field(formId + "-name", "Name or nickname", name, "Optional. Shown with your comment."),
      el("div", { className: "hp", "aria-hidden": "true" }, [el("label", { for: formId + "-hp", text: "Leave this empty" }), hp]),
      el("label", { className: "check" }, [consent,
        el("span", { text: "I understand my comment may be published here, with my nickname, after Sviatoslav has read it." })]),
      el("div", { className: "actions" }, [submit])
    ]);
    var form = el("form", { className: "qa-comment-form", id: formId, hidden: true }, [fields, status]);
    var rid = null;

    toggle.addEventListener("click", function () {
      var open = form.hidden;
      form.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) text.focus();
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!api) return;
      rid = rid || requestId();
      fields.disabled = true;
      setStatus(status, "Sending…");
      post({ action: "comment", rid: rid, question: q.id, name: name.value, comment: text.value, qa_hp: hp.value })
        .then(function (ok) {
          if (ok) {
            rid = null;
            form.reset();
            setStatus(status, "Thank you. Your comment will appear here once I’ve read it.", "ok");
          } else {
            setStatus(status, failedMessage("comment"), "error");
          }
        })
        .then(function () { fields.disabled = false; });
    });

    if (!api) toggle.disabled = true;
    wrap.appendChild(toggle);
    wrap.appendChild(form);
    return wrap;
  }

  /* ---------------------------- the ask form ---------------------------- */
  function wireAsk() {
    if (!askForm) return;
    var fields = askForm.querySelector("fieldset");
    var status = askForm.querySelector(".qa-status");
    var thanks = askForm.querySelector(".qa-thanks");
    var again = askForm.querySelector(".qa-again");
    var rid = null;

    if (!api) {
      fields.disabled = true;
      setStatus(status, el("span", null, ["The form opens soon. Until then, you can write to me at ", emailLink(), "."]));
      return;
    }

    askForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var data = new FormData(askForm);
      rid = rid || requestId();
      fields.disabled = true;
      setStatus(status, "Sending…");
      post({
        action: "ask", rid: rid,
        title: data.get("title") || "", question: data.get("question") || "",
        name: data.get("name") || "", qa_hp: data.get("qa_hp") || ""
      }).then(function (ok) {
        fields.disabled = false;
        if (ok) {
          rid = null;
          askForm.reset();
          setStatus(status, "");
          fields.hidden = true;
          thanks.hidden = false;
          thanks.focus();
        } else {
          setStatus(status, failedMessage("question"), "error");
        }
      });
    });

    again.addEventListener("click", function () {
      thanks.hidden = true;
      fields.hidden = false;
      askForm.querySelector("input, textarea").focus();
    });
  }

  wireAsk();
  load();
})();
