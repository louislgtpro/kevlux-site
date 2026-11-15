(function () {
  "use strict";

  var SUPPORTED = ["fr", "en", "es"];
  var FALLBACK = "en";

  function valid(code) {
    return SUPPORTED.indexOf(code) !== -1 ? code : null;
  }

  function stored(storage, key) {
    try {
      return valid(window[storage].getItem(key));
    } catch (e) {
      return null;
    }
  }

  function fromBrowser() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < list.length; i++) {
      var code = valid(String(list[i]).slice(0, 2).toLowerCase());
      if (code) return code;
    }
    return FALLBACK;
  }

  var lang = stored("localStorage", "kevlux.lang") || stored("sessionStorage", "kevlux.lang.hint") || fromBrowser();
  var root = document.documentElement;

  root.lang = lang;
  root.classList.add("js");
  if (lang !== "fr") root.classList.add("is-translating");

  window.KevluxLang = { initial: lang, supported: SUPPORTED };
})();
