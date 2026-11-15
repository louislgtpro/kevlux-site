(function () {
  "use strict";

  var toc = document.querySelector("[data-toc]");
  if (!toc || !("IntersectionObserver" in window)) return;

  var pill = toc.querySelector(".toc-pill");
  var links = Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']"));
  var sections = links
    .map(function (link) {
      return document.getElementById(link.getAttribute("href").slice(1));
    })
    .filter(Boolean);
  var visible = new Set();
  var current = null;

  function place(link) {
    if (!link || !pill) return;
    pill.style.transform = "translateY(" + link.offsetTop + "px)";
    pill.style.height = link.offsetHeight + "px";
    pill.classList.add("is-ready");
  }

  function activate(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (link) {
      var on = link.getAttribute("href") === "#" + id;
      if (on) {
        link.setAttribute("aria-current", "true");
        place(link);
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });
      var first = sections.find(function (section) {
        return visible.has(section.id);
      });
      if (first) activate(first.id);
    },
    { rootMargin: "-20% 0px -55% 0px" }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });

  function refresh() {
    var active = toc.querySelector("[aria-current='true']");
    if (active) place(active);
  }

  window.addEventListener("resize", refresh);
  document.addEventListener("kevlux:lang", function () {
    requestAnimationFrame(refresh);
  });

  if (sections[0]) activate(sections[0].id);
})();
