(function () {
  "use strict";

  var svg = document.querySelector("[data-locus]");
  if (!svg || !svg.createSVGPoint) return;

  var path = svg.querySelector("[data-locus-path]");
  var dot = svg.querySelector("[data-locus-dot]");
  var halo = svg.querySelector("[data-locus-halo]");
  var ticks = svg.querySelector("[data-locus-ticks]");
  var plate = svg.closest(".plate");
  var kOut = document.querySelector("[data-locus-k]");
  var miredOut = document.querySelector("[data-locus-mired]");
  var gauge = document.querySelector("[data-locus-gauge]");
  var presets = document.querySelectorAll("[data-preset]");
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  var K_MIN = 1900;
  var K_WHITE = 5600;
  var K_MAX = 12000;
  var STEP = 50;
  var WHITE_POINT = { x: 524, y: 391 };
  var TICKS = [2000, 3200, 4300, 5600, 7500, 10000];
  var SAMPLES = 480;

  var total = path.getTotalLength();
  var samples = [];
  for (var i = 0; i <= SAMPLES; i++) {
    var p = path.getPointAtLength((total * i) / SAMPLES);
    samples.push({ x: p.x, y: p.y });
  }

  var state = { f: 0, touched: false, dragging: false, frame: 0 };

  function clamp(v, lo, hi) {
    return Math.min(hi === undefined ? 1 : hi, Math.max(lo === undefined ? 0 : lo, v));
  }

  function nearest(x, y) {
    var best = 0;
    var bestD = Infinity;
    for (var i = 0; i < samples.length; i++) {
      var dx = samples[i].x - x;
      var dy = samples[i].y - y;
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best / SAMPLES;
  }

  var fWhite = nearest(WHITE_POINT.x, WHITE_POINT.y);

  function mired(k) {
    return 1e6 / k;
  }

  function kelvinAt(f) {
    var m = f <= fWhite
      ? mired(K_MIN) + (mired(K_WHITE) - mired(K_MIN)) * (f / fWhite)
      : mired(K_WHITE) + (mired(K_MAX) - mired(K_WHITE)) * ((f - fWhite) / (1 - fWhite));
    return 1e6 / m;
  }

  function fractionAt(k) {
    var m = mired(clamp(k, K_MIN, K_MAX));
    return k <= K_WHITE
      ? fWhite * (mired(K_MIN) - m) / (mired(K_MIN) - mired(K_WHITE))
      : fWhite + (1 - fWhite) * (mired(K_WHITE) - m) / (mired(K_WHITE) - mired(K_MAX));
  }

  // Approximation de Tanner Helland du rendu sRGB du corps noir : teinte d'ambiance seulement.
  function ambientFor(k) {
    var t = k / 100;
    var r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
    var g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    var b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    return [r, g, b].map(function (v) {
      return Math.round(clamp(v, 0, 255));
    }).join(" ");
  }

  function fmt(value, unit) {
    return window.KevluxI18n ? window.KevluxI18n.format(value, { unit: unit }) : String(value) + (unit ? " " + unit : "");
  }

  function drawTicks() {
    var ns = "http://www.w3.org/2000/svg";
    ticks.textContent = "";
    TICKS.forEach(function (k) {
      var len = total * fractionAt(k);
      var a = path.getPointAtLength(Math.max(0, len - 1));
      var b = path.getPointAtLength(Math.min(total, len + 1));
      var c = path.getPointAtLength(len);
      var tx = b.x - a.x;
      var ty = b.y - a.y;
      var n = Math.hypot(tx, ty) || 1;
      var nx = -ty / n;
      var ny = tx / n;
      var line = document.createElementNS(ns, "line");
      line.setAttribute("x1", (c.x + nx * 40).toFixed(1));
      line.setAttribute("y1", (c.y + ny * 40).toFixed(1));
      line.setAttribute("x2", (c.x + nx * 54).toFixed(1));
      line.setAttribute("y2", (c.y + ny * 54).toFixed(1));
      var text = document.createElementNS(ns, "text");
      var down = ny > 0.6;
      text.setAttribute("x", (c.x + nx * (down ? 80 : 66)).toFixed(1));
      text.setAttribute("y", (c.y + ny * (down ? 80 : 66)).toFixed(1));
      text.setAttribute("text-anchor", down ? "middle" : "start");
      text.setAttribute("dominant-baseline", down ? "hanging" : "middle");
      text.textContent = fmt(k);
      ticks.appendChild(line);
      ticks.appendChild(text);
    });
  }

  function render() {
    var f = clamp(state.f);
    var p = path.getPointAtLength(total * f);
    var k = kelvinAt(f);
    var shown = Math.round(k / STEP) * STEP;

    dot.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")");
    halo.setAttribute("cx", p.x.toFixed(1));
    halo.setAttribute("cy", p.y.toFixed(1));
    kOut.textContent = fmt(shown);
    miredOut.textContent = fmt(Math.round(mired(k)));
    gauge.style.setProperty("--pos", f.toFixed(4));
    root.style.setProperty("--tint", ambientFor(k));

    dot.setAttribute("aria-valuenow", String(shown));
    dot.setAttribute("aria-valuetext", fmt(shown, "K"));
    presets.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(Math.abs(parseInt(btn.dataset.preset, 10) - shown) < STEP));
    });
  }

  function animateTo(target) {
    cancelAnimationFrame(state.frame);
    if (reduce.matches) {
      state.f = target;
      render();
      return;
    }
    var x = state.f;
    var v = 0;
    var last = performance.now();
    var stiffness = 160;
    var damping = 2 * Math.sqrt(stiffness) * 0.78;
    function step(now) {
      var dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      v += (stiffness * (target - x) - damping * v) * dt;
      x += v * dt;
      state.f = x;
      render();
      if (Math.abs(target - x) > 0.0004 || Math.abs(v) > 0.0004) {
        state.frame = requestAnimationFrame(step);
      } else {
        state.f = target;
        render();
      }
    }
    state.frame = requestAnimationFrame(step);
  }

  function touch() {
    if (state.touched) return;
    state.touched = true;
    plate.classList.add("was-touched");
  }

  function toLocal(event) {
    var pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  svg.addEventListener("pointerdown", function (event) {
    var onDot = event.target.closest("[data-locus-dot]");
    var onTrack = event.target.classList.contains("locus-hit");
    if (!onDot && !onTrack) return;
    event.preventDefault();
    touch();
    var local = toLocal(event);
    var f = nearest(local.x, local.y);
    if (onDot) {
      cancelAnimationFrame(state.frame);
    } else {
      animateTo(f);
    }
    state.dragging = true;
    plate.classList.add("is-dragging");
    svg.setPointerCapture(event.pointerId);
    dot.focus({ preventScroll: true });
  });

  svg.addEventListener("pointermove", function (event) {
    if (!state.dragging) return;
    cancelAnimationFrame(state.frame);
    var local = toLocal(event);
    state.f = nearest(local.x, local.y);
    render();
  });

  function release(event) {
    if (!state.dragging) return;
    state.dragging = false;
    plate.classList.remove("is-dragging");
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }

  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);

  dot.addEventListener("keydown", function (event) {
    var k = Math.round(kelvinAt(state.f) / STEP) * STEP;
    var delta = event.shiftKey ? 500 : 100;
    var next = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = k + delta;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = k - delta;
        break;
      case "PageUp":
        next = k + 1000;
        break;
      case "PageDown":
        next = k - 1000;
        break;
      case "Home":
        next = K_MIN;
        break;
      case "End":
        next = K_MAX;
        break;
    }
    if (next === null) return;
    event.preventDefault();
    touch();
    animateTo(fractionAt(clamp(next, K_MIN, K_MAX)));
  });

  presets.forEach(function (btn) {
    btn.addEventListener("click", function () {
      touch();
      animateTo(fractionAt(parseInt(btn.dataset.preset, 10)));
    });
  });

  document.addEventListener("kevlux:lang", function () {
    drawTicks();
    render();
  });

  state.f = fractionAt(reduce.matches ? K_WHITE : 2700);
  drawTicks();
  render();

  if (!reduce.matches && "IntersectionObserver" in window) {
    var intro = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      intro.disconnect();
      window.setTimeout(function () {
        if (!state.touched) animateTo(fractionAt(K_WHITE));
      }, 700);
    }, { threshold: 0.4 });
    intro.observe(svg);
  } else {
    state.f = fractionAt(K_WHITE);
    render();
  }
})();
