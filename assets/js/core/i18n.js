(function () {
  "use strict";

  var root = document.documentElement;
  var script = document.currentScript;
  var base = script ? script.src.replace(/core\/[^/]*$/, "") : "assets/js/";
  var originals = new WeakMap();
  var dictionaries = { fr: {} };
  var pending = {};
  var current = "fr";
  var page = document.body ? document.body.dataset.page : "";

  function load(lang) {
    if (dictionaries[lang]) return Promise.resolve();
    if (pending[lang]) return pending[lang];
    pending[lang] = new Promise(function (resolve, reject) {
      var tag = document.createElement("script");
      tag.src = base + "locales/" + lang + ".js";
      tag.onload = function () {
        dictionaries[lang] = (window.KevluxLocales || {})[lang] || {};
        resolve();
      };
      tag.onerror = function () {
        delete pending[lang];
        reject(new Error("locale " + lang));
      };
      document.head.appendChild(tag);
    });
    return pending[lang];
  }

  function memory(el) {
    var saved = originals.get(el);
    if (!saved) {
      saved = { html: el.innerHTML, attrs: {} };
      originals.set(el, saved);
    }
    return saved;
  }

  function lookup(dict, key) {
    return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : null;
  }

  function format(value, lang, options) {
    options = options || {};
    var digits = options.digits || 0;
    var text = new Intl.NumberFormat(lang, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: options.sign ? "exceptZero" : "auto"
    }).format(value).replace(/\u202f/g, "\u00a0");
    return options.unit ? text + " " + options.unit : text;
  }

  function apply(lang) {
    var dict = dictionaries[lang] || {};

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var saved = memory(el);
      var value = lookup(dict, el.dataset.i18n);
      el.innerHTML = value === null ? saved.html : value;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      var saved = memory(el);
      el.dataset.i18nAttr.split(";").forEach(function (pair) {
        var parts = pair.split(":");
        var name = parts[0].trim();
        var key = (parts[1] || "").trim();
        if (!(name in saved.attrs)) saved.attrs[name] = el.getAttribute(name);
        var value = lookup(dict, key);
        el.setAttribute(name, value === null ? saved.attrs[name] : value);
      });
    });

    document.querySelectorAll("[data-i18n-src]").forEach(function (el) {
      var src = el.dataset.i18nSrc.replace("{lang}", lang);
      if (el.getAttribute("src") !== src) el.setAttribute("src", src);
    });

    document.querySelectorAll("[data-num]").forEach(function (el) {
      el.textContent = format(parseFloat(el.dataset.num), lang, {
        digits: parseInt(el.dataset.digits || "0", 10),
        sign: el.dataset.sign === "true",
        unit: el.dataset.unit
      });
    });

    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.langBtn === lang));
    });
  }

  function set(lang) {
    return load(lang)
      .catch(function () {
        lang = "fr";
      })
      .then(function () {
        current = lang;
        root.lang = lang;
        apply(lang);
        document.dispatchEvent(new CustomEvent("kevlux:lang", { detail: { lang: lang } }));
        root.classList.remove("is-translating");
      });
  }

  function choose(lang) {
    if (lang === current) return;
    try {
      localStorage.setItem("kevlux.lang", lang);
    } catch (e) {}
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      set(lang);
      return;
    }
    root.classList.add("is-switching");
    window.setTimeout(function () {
      set(lang).then(function () {
        requestAnimationFrame(function () {
          root.classList.remove("is-switching");
        });
      });
    }, 220);
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-lang-btn]");
    if (btn) choose(btn.dataset.langBtn);
  });

  window.KevluxI18n = {
    page: page,
    set: choose,
    format: function (value, options) {
      return format(value, current, options);
    },
    t: function (key, fallback) {
      var value = lookup(dictionaries[current] || {}, key);
      return value === null ? fallback : value;
    },
    get lang() {
      return current;
    }
  };

  set((window.KevluxLang && window.KevluxLang.initial) || "fr");
})();
