/* Referral pop-up: small, dismissible, shown once a week per visitor, never on first paint. */
(function () {
  "use strict";
  var KEY = "rp_seen", DAYS = 7, shown = false, prev = null, box, root, timer;
  var WA = "https://wa.me/917483222174?text=" + encodeURIComponent(
    "Hello, I would like to refer a friend/neighbour to Shyam Gas Cylinder and LPG Supply.\nMy name: \nMy phone: \nFriend's name and area: ");

  function seen() { try { var t = +localStorage.getItem(KEY); return !!t && Date.now() - t < DAYS * 864e5; } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }

  function build() {
    root = document.createElement("div");
    root.className = "rp"; root.id = "rp"; root.hidden = true;
    root.innerHTML =
      '<div class="rp-bd" data-rp-close></div>' +
      '<div class="rp-box" role="dialog" aria-modal="true" aria-labelledby="rp-t" aria-describedby="rp-d" tabindex="-1">' +
        '<button class="rp-x" type="button" aria-label="Close" data-rp-close>&times;</button>' +
        '<span class="rp-tag">Referral offer</span>' +
        '<h2 id="rp-t">Refer a friend or neighbour, get \u20B9100 off</h2>' +
        '<p id="rp-d">Know someone who needs gas? Once their first order is delivered, we take \u20B9100 off your next order.</p>' +
        '<div class="rp-act"><a class="btn btn-a" id="rp-go" target="_blank" rel="noopener" href="' + WA + '">Refer on WhatsApp</a>' +
        '<button class="btn btn-o" type="button" data-rp-close>Maybe later</button></div>' +
        '<p class="rp-fine">The person you refer must be a new customer at a different address. One \u20B9100 discount per successful referral, confirmed on WhatsApp before dispatch. <a href="/#refer">Full terms</a></p>' +
      '</div>';
    document.body.appendChild(root);
    box = root.querySelector(".rp-box");
    root.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-rp-close]")) close();
    });
    root.querySelector("#rp-go").addEventListener("click", function () { mark(); close(true); });
  }

  function focusables() { return box.querySelectorAll("a[href],button:not([disabled])"); }
  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open() {
    if (shown) return; shown = true;
    if (!root) build();
    prev = document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    var go = root.querySelector("#rp-go"); if (go && go.focus) go.focus();
  }
  function close(keepFocus) {
    if (!root || root.hidden) return;
    root.hidden = true; mark();
    document.documentElement.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (!keepFocus && prev && prev.focus) { try { prev.focus(); } catch (e) {} }
  }

  function referInView() {
    var s = document.getElementById("refer"); if (!s) return false;
    var r = s.getBoundingClientRect();
    return r.top < innerHeight * .8 && r.bottom > innerHeight * .2;
  }
  function typing() { var t = document.activeElement && document.activeElement.tagName; return t === "INPUT" || t === "SELECT" || t === "TEXTAREA"; }

  function trigger() {
    if (shown || seen()) return;
    if (typing()) { clearTimeout(timer); timer = setTimeout(trigger, 8000); return; }
    if (referInView()) { mark(); shown = true; return; }   /* they are already reading the offer */
    open();
  }

  function init() {
    if (seen()) return;
    timer = setTimeout(trigger, 12000);
    var onScroll = function () {
      var h = document.documentElement, max = h.scrollHeight - innerHeight;
      if (max > 0 && (window.pageYOffset || h.scrollTop) / max > .45) { removeEventListener("scroll", onScroll); trigger(); }
    };
    addEventListener("scroll", onScroll, { passive: true });
    if (matchMedia("(hover:hover) and (pointer:fine)").matches) {
      var t0 = Date.now();
      document.addEventListener("mouseout", function exit(e) {
        if (!e.relatedTarget && e.clientY <= 0 && Date.now() - t0 > 5000) { document.removeEventListener("mouseout", exit); trigger(); }
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
