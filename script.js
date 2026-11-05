// Таймер до поездки — это твоё задание (см. прошлый шаг).
// Дату поездки поменяй на настоящую
const tripDate = new Date("2026-12-06T08:00:00");
function updateCountdown() {
  const now = new Date();
  const diff = tripDate - now;
  const totalSeconds = Math.floor(diff / 1000); // время в милисекундах делим на 1000 и округляем вниз

  const days = Math.floor(totalSeconds / (86400)); //в дне тсолько секунд
  const hours = Math.floor((totalSeconds % 86400) / 3600); //остсаток от дней делим на 3600 секунд в часе
  const minutes = Math.floor((totalSeconds % 3600) / 60); //остаток от часов делим на 60 секунд в минуте
  const seconds = totalSeconds % 60; //остаток от минут делим на 60 секунд в минуте



  if (diff <= 0) {
    document.getElementById("countdown").textContent = "Now!";
  }
  else{
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    document.getElementById("countdown").textContent = days + "d " + hours + "h " + minutes + "m " + seconds + "s";
  }
}
setInterval(updateCountdown, 1000);
// ================= Эффекты при скролле =================

// Все «главы», у которых есть атрибут data-scroll
const chapters = document.querySelectorAll("[data-scroll]");
const progressBar = document.getElementById("progress");

// Ограничивает число в промежутке от min до max (как Math.Clamp в C#)
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function update() {
  const screenHeight = window.innerHeight;

  chapters.forEach(function (chapter) {
    const rect = chapter.getBoundingClientRect();

    // Сколько пикселей можно проскроллить внутри главы, пока экран «прилип».
    // Вычитаем 2 экрана: один — сам экран, второй — переход, когда сверху
    // наезжает следующая секция (см. margin-bottom: -100vh в style.css).
    const scrollable = rect.height - 2 * screenHeight;

    // rect.top = 0, когда глава только началась, и становится отрицательным дальше.
    // Делим пройденное на всё доступное — получаем прогресс от 0 до 1.
    const p = clamp(-rect.top / scrollable, 0, 1);

    // Прогресс перехода: 0 — следующая секция ещё не видна, 1 — полностью закрыла эту
    const leave = clamp((-rect.top - scrollable) / screenHeight, 0, 1);

    // Отдаём числа в CSS как переменные (их используют calc() в style.css)
    chapter.style.setProperty("--p", p);
    chapter.style.setProperty("--leave", leave);

    // Показываем/прячем элементы с data-from / data-to
    chapter.querySelectorAll("[data-from]").forEach(function (el) {
      const from = Number(el.dataset.from);
      const to = el.dataset.to ? Number(el.dataset.to) : 2; // нет data-to — не прячем
      el.classList.toggle("active", p >= from && p < to);
      el.classList.toggle("past", p >= to); // уже пройден — уходит вверх
    });

    // Карта: переключаем «остановку» камеры
    if (chapter.id === "map") {
      updateMap(p);
    }

    // Горизонтальная лента: сдвигаем её влево по мере скролла
    const track = chapter.querySelector("[data-hscroll]");
    if (track) {
      const distance = track.scrollWidth - window.innerWidth;
      track.style.transform = "translateX(" + (-distance * p) + "px)";
    }
  });

  // Полоска сверху: насколько пройдена вся страница
  const pageScrollable = document.documentElement.scrollHeight - screenHeight;
  progressBar.style.transform = "scaleX(" + window.scrollY / pageScrollable + ")";
}

// Событие scroll может срабатывать очень часто, поэтому пересчитываем
// не чаще одного раза за кадр с помощью requestAnimationFrame.
let ticking = false;
function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }
}

window.addEventListener("scroll", onScroll);
window.addEventListener("resize", onScroll);


// ================= Карта «Где это?» =================

// Три «остановки» камеры: [широта, долгота] и приближение (zoom)
const mapStops = [
  { until: 0.33, center: [47, -2],       zoom: 4 },  // Европа
  { until: 0.66, center: [39.6, -8.0],   zoom: 6 },  // Португалия
  { until: 2,    center: [41.145, -8.61], zoom: 13 } // Порту
];

let map = null;
let currentStop = -1;

// window.L появляется, только если библиотека Leaflet загрузилась
if (window.L) {
  map = L.map("leaflet-map", {
    zoomControl: false,
    scrollWheelZoom: false, // колесо мыши должно скроллить страницу, а не карту
    dragging: false,
    attributionControl: true
  }).setView(mapStops[0].center, mapStops[0].zoom);

  // Карта состоит из квадратных картинок — «тайлов». Берём спутниковые снимки Esri...
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 18
  }).addTo(map);

  // ...и поверх них прозрачный слой с границами стран и названиями
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18
  }).addTo(map);

  // Своя метка: div с классом porto-dot (стили в style.css)
  const dot = L.divIcon({ className: "", html: '<div class="porto-dot"></div>', iconSize: [18, 18] });
  L.marker([41.1496, -8.611], { icon: dot })
    .addTo(map)
    .bindTooltip("Porto", { permanent: true, direction: "right", offset: [12, 0] });
}

function updateMap(p) {
  if (!map) return;

  // Находим первую остановку, до которой прогресс ещё не дошёл
  const index = mapStops.findIndex(function (stop) {
    return p < stop.until;
  });

  // Летим, только если остановка сменилась (иначе flyTo будет запускаться каждый кадр)
  if (index !== currentStop) {
    currentStop = index;
    map.flyTo(mapStops[index].center, mapStops[index].zoom, { duration: 1.8 });
  }
}

// Первый расчёт при загрузке. Он стоит здесь, а не выше: карта уже создана,
// иначе updateMap обратилась бы к переменной map до её объявления (ошибка).
update();


// ================= Плавное появление обычных секций =================

// IntersectionObserver сообщает, когда элемент попал в экран
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target); // показали один раз — больше не следим
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll(".reveal").forEach(function (el) {
  observer.observe(el);
});
