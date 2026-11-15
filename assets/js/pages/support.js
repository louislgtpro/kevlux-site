(function () {
  "use strict";

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var timer = 0;
    btn.addEventListener("click", function () {
      var text = btn.dataset.copy;
      var done = function () {
        btn.classList.add("is-copied");
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.classList.remove("is-copied");
        }, 2200);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () {
          window.location.href = "mailto:" + text;
        });
      } else {
        window.location.href = "mailto:" + text;
      }
    });
  });
})();
