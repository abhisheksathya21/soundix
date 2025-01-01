let items = document.querySelectorAll(
  ".custom-slider .custom-list .custom-item"
);
let next = document.getElementById("custom-next");
let prev = document.getElementById("custom-prev");

// config param
let countItem = items.length;
let itemActive = 0;

// event next click
next.onclick = function () {
  itemActive = itemActive + 1;
  if (itemActive >= countItem) {
    itemActive = 0;
  }
  showSlider();
};

// event prev click
prev.onclick = function () {
  itemActive = itemActive - 1;
  if (itemActive < 0) {
    itemActive = countItem - 1;
  }
  showSlider();
};

// auto run slider
let refreshInterval = setInterval(() => {
  next.click();
}, 5000);

function showSlider() {
  // remove active class from old item
  let itemActiveOld = document.querySelector(
    ".custom-slider .custom-list .custom-item.active"
  );
  itemActiveOld.classList.remove("active");

  // add active class to new item
  items[itemActive].classList.add("active");

  // clear auto-run timer
  clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    next.click();
  }, 5000);
}
