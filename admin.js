// Модерация фото. Этот код только показывает кнопки.
// Настоящую защиту дают правила в firestore.rules: их проверяет сервер.
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const adminSection = document.getElementById("admin-section");
const pendingList = document.getElementById("pending-list");
const adminStatus = document.getElementById("admin-status");

onAuthStateChanged(auth, async function (user) {
  adminSection.hidden = true;
  pendingList.replaceChildren(); // убираем фото прошлого пользователя

  if (user === null) return;

  try {
    // Админ — это тот, для кого есть документ admins/<его UID>
    const adminDoc = await getDoc(doc(db, "admins", user.uid));
    if (!adminDoc.exists()) return;

    adminSection.hidden = false;
    await loadPending();
  } catch (error) {
    console.log(error.code, error.message);
  }
});

async function loadPending() {
  adminStatus.textContent = "Loading...";

  // По 12 штук, чтобы не тратить лимит трафика Firestore
  const pending = query(collection(db, "photos"), where("status", "==", "pending"), limit(12));
  const snapshot = await getDocs(pending);

  snapshot.forEach(function (photoDoc) {
    pendingList.append(createCard(photoDoc));
  });

  adminStatus.textContent = snapshot.empty ? "Nothing to review." : "";
}

function createCard(photoDoc) {
  const card = document.createElement("div");
  card.className = "pending-card";

  const figure = document.createElement("figure");
  figure.className = "photo";

  const image = document.createElement("img");
  image.src = photoDoc.data().image;
  image.alt = "Photo waiting for approval";
  figure.append(image);

  const approve = document.createElement("button");
  approve.className = "btn";
  approve.type = "button";
  approve.textContent = "Approve";

  const reject = document.createElement("button");
  reject.className = "btn btn-quiet";
  reject.type = "button";
  reject.textContent = "Reject";

  const actions = document.createElement("div");
  actions.className = "pending-actions";
  actions.append(approve, reject);

  card.append(figure, actions);

  approve.addEventListener("click", function () {
    moderate(card, function () {
      return updateDoc(photoDoc.ref, { status: "approved" });
    });
  });

  reject.addEventListener("click", function () {
    // Удаление нельзя отменить, поэтому спрашиваем
    if (confirm("Delete this photo for good?")) {
      moderate(card, function () {
        return deleteDoc(photoDoc.ref);
      });
    }
  });

  return card;
}

// Общая часть для обеих кнопок: выполнить действие и убрать карточку
async function moderate(card, action) {
  const buttons = card.querySelectorAll("button");
  buttons.forEach(function (button) {
    button.disabled = true;
  });

  try {
    await action();
    card.remove();

    // Разобрали всё на экране — подгружаем следующие фото, если они есть
    if (pendingList.children.length === 0) {
      await loadPending();
    }
  } catch (error) {
    adminStatus.textContent = "Something went wrong, please try again";
    console.log(error.code, error.message);
    buttons.forEach(function (button) {
      button.disabled = false;
    });
  }
}
