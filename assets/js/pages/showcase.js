(function () {
  "use strict";

  var root = document.querySelector("[data-showcase]");
  if (!root) return;

  var shots = root.querySelectorAll(".phone-screen img");
  var items = root.querySelectorAll(".show-item");
  var index = 0;

  function show(next, focus) {
    index = (next + items.length) % items.length;
    items.forEach(function (item, i) {
      var active = i === index;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      var bar = item.querySelector(".show-progress");
      if (active && bar) {
        bar.style.animation = "none";
        void bar.offsetWidth;
        bar.style.animation = "";
      }
    });
    shots.forEach(function (img, i) {
      img.classList.toggle("is-active", i === index);
    });
    if (focus) items[index].focus();
  }

  items.forEach(function (item, i) {
    item.addEventListener("click", function () {
      show(i);
    });
    item.querySelector(".show-progress").addEventListener("animationend", function () {
      if (i === index) show(index + 1);
    });
    item.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        show(index + 1, true);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        show(index - 1, true);
      }
    });
  });

  root.addEventListener("focusin", function () {
    root.classList.add("is-paused");
  });
  root.addEventListener("focusout", function () {
    root.classList.remove("is-paused");
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      root.classList.toggle("is-offscreen", !entries[0].isIntersecting);
    }).observe(root);
  }

  show(0);
})();
