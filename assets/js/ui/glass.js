(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  var pointer = { x: -9999, y: -9999 };
  var queued = false;
  var REACH = 120;

  function light() {
    queued = false;
    var panes = document.querySelectorAll(".glass");
    var vh = window.innerHeight;
    var boxes = [];
    panes.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom > -REACH && r.top < vh + REACH) boxes.push([el, r]);
    });
    boxes.forEach(function (entry) {
      var el = entry[0];
      var r = entry[1];
      var x = pointer.x - r.left;
      var y = pointer.y - r.top;
      var near = x > -REACH && y > -REACH && x < r.width + REACH && y < r.height + REACH;
      el.classList.toggle("is-lit", near);
      if (!near) return;
      var angle = Math.atan2(r.width / 2 - x, -(r.height / 2 - y)) * (180 / Math.PI);
      el.style.setProperty("--mx", x.toFixed(1) + "px");
      el.style.setProperty("--my", y.toFixed(1) + "px");
      el.style.setProperty("--rim", angle.toFixed(1) + "deg");
    });
  }

  function onMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!queued) {
      queued = true;
      requestAnimationFrame(light);
    }
  }

  if (finePointer.matches && !reduce.matches) {
    document.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", function () {
      if (!queued) {
        queued = true;
        requestAnimationFrame(light);
      }
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () {
      pointer.x = pointer.y = -9999;
      requestAnimationFrame(light);
    });
  }

  function morph(pill, target, animate) {
    if (!pill || !target) return;
    var host = pill.parentElement.getBoundingClientRect();
    var box = target.getBoundingClientRect();
    var to = { x: box.left - host.left, w: box.width };
    var from = pill._at;
    pill.style.width = to.w + "px";
    pill.style.transform = "translateX(" + to.x + "px)";
    if (animate && from && !reduce.matches && pill.animate) {
      var left = Math.min(from.x, to.x);
      var span = Math.max(from.x + from.w, to.x + to.w) - left;
      pill.animate(
        [
          { width: from.w + "px", transform: "translateX(" + from.x + "px) scaleY(1)" },
          { width: span + "px", transform: "translateX(" + left + "px) scaleY(0.86)", offset: 0.42 },
          { width: to.w + "px", transform: "translateX(" + to.x + "px) scaleY(1)" }
        ],
        { duration: 560, easing: "cubic-bezier(.3,1.25,.45,1)" }
      );
    }
    pill._at = to;
  }

  function syncLang(animate) {
    document.querySelectorAll(".lang-switch").forEach(function (group) {
      var active = group.querySelector('[aria-pressed="true"]') ||
        group.querySelector('[data-lang-btn="' + document.documentElement.lang + '"]');
      morph(group.querySelector(".lang-pill"), active, animate);
    });
  }

  syncLang(false);
  document.addEventListener("kevlux:lang", function () {
    syncLang(true);
  });
  window.addEventListener("resize", function () {
    syncLang(false);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      syncLang(false);
    });
  }

  window.KevluxGlass = { morph: morph };
})();
