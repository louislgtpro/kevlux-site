(function () {
  "use strict";

  var script = document.currentScript;
  var lang = script.dataset.lang;
  var target = script.dataset.to;
  try {
    if (!localStorage.getItem("kevlux.lang")) sessionStorage.setItem("kevlux.lang.hint", lang);
  } catch (e) {}
  window.location.replace(target + window.location.hash);
})();
