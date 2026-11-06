// Лайки и комментарии под фото. Весь текст от людей выводим через textContent,
// а не innerHTML: тогда браузер покажет <script> как буквы и не запустит его.
import { auth } from "./firebase.js";
import { createAvatar, displayName, getProfile } from "./people.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const COMMENTS_LIMIT = 50;
const SIGN_IN_PAGE = "album.html#sign-in"; // карточки есть и на главной, а вход только в альбоме

// ================= Лайки =================

export function createLikeButton(photoRef, showError) {
  const likes = collection(photoRef, "likes");
  let liked = false;
  let count = 0;

  const heart = document.createElement("span");
  heart.setAttribute("aria-hidden", "true");
  const countText = document.createElement("span");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "post-action like";
  button.append(heart, countText);

  function show() {
    heart.textContent = liked ? "♥" : "♡";
    countText.textContent = count;
    button.setAttribute("aria-pressed", liked);
    button.setAttribute("aria-label", count + (count === 1 ? " like" : " likes"));
  }

  async function load() {
    try {
      const total = await getCountFromServer(likes);
      count = total.data().count;

      if (auth.currentUser !== null) {
        const myLike = await getDoc(doc(likes, auth.currentUser.uid));
        liked = myLike.exists();
      }
      show();
    } catch (error) {
      console.log(error.code, error.message);
    }
  }

  button.addEventListener("click", async function () {
    // Гость видит лайки, но поставить не может: отправляем его ко входу
    if (auth.currentUser === null) {
      location.href = SIGN_IN_PAGE;
      return;
    }

    button.disabled = true;
    showError("");

    try {
      const myLike = doc(likes, auth.currentUser.uid);

      if (liked) {
        await deleteDoc(myLike);
      } else {
        await setDoc(myLike, { createdAt: serverTimestamp() });
      }

      liked = !liked;
      count += liked ? 1 : -1;
      show();
    } catch (error) {
      showError("Could not save your like, please try again");
      console.log(error.code, error.message);
    }

    button.disabled = false;
  });

  show();
  load();
  return button;
}

// ================= Комментарии =================

// viewer: { uid, role } — от него зависит, показать ли форму и кнопки удаления
export function createComments(photoRef, viewer, showError) {
  const comments = collection(photoRef, "comments");
  let count = 0;
  let loaded = false;

  const countText = document.createElement("span");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "post-action";
  toggle.setAttribute("aria-expanded", "false");
  toggle.append("Comments ", countText);

  const list = document.createElement("ul");
  list.className = "comment-list";

  const panel = document.createElement("div");
  panel.className = "comments";
  panel.hidden = true;
  panel.append(list, viewer.uid === null ? createHint() : createForm());

  function showCount() {
    countText.textContent = count;
  }

  async function loadCount() {
    try {
      const total = await getCountFromServer(comments);
      count = total.data().count;
      showCount();

      // Есть что почитать — показываем сразу, не заставляем искать кнопку
      if (count > 0) {
        await open();
      }
    } catch (error) {
      console.log(error.code, error.message);
    }
  }

  // Комментарии качаем только там, где они есть: экономим лимит чтений Firestore
  async function loadList() {
    // Берём самые новые, а показываем от старых к новым, как в переписке
    const newest = query(comments, orderBy("createdAt", "desc"), limit(COMMENTS_LIMIT));
    const snapshot = await getDocs(newest);
    const items = await Promise.all(snapshot.docs.map(createItem));
    list.replaceChildren(...items.reverse());
    loaded = true;
  }

  async function createItem(commentDoc) {
    const { text, userId } = commentDoc.data();
    const profile = await getProfile(userId);

    const name = document.createElement("strong");
    name.textContent = displayName(profile);

    const message = document.createElement("p");
    message.textContent = text;

    const body = document.createElement("div");
    body.className = "comment-body";
    body.append(name, message);

    const item = document.createElement("li");
    item.className = "comment";
    item.append(createAvatar(profile), body);

    if (userId === viewer.uid || viewer.role === "admin") {
      item.append(createDeleteButton(commentDoc.ref, item));
    }
    return item;
  }

  function createDeleteButton(commentRef, item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "comment-delete";
    button.textContent = "Delete";

    button.addEventListener("click", async function () {
      if (!confirm("Delete this comment?")) return;
      button.disabled = true;
      showError("");

      try {
        await deleteDoc(commentRef);
        item.remove();
        count -= 1;
        showCount();
      } catch (error) {
        button.disabled = false;
        showError("Could not delete the comment, please try again");
        console.log(error.code, error.message);
      }
    });

    return button;
  }

  function createForm() {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 500;
    input.required = true;
    input.placeholder = "Add a comment";
    input.setAttribute("aria-label", "Add a comment");

    const button = document.createElement("button");
    button.className = "btn";
    button.type = "submit";
    button.textContent = "Post";

    const form = document.createElement("form");
    form.className = "comment-form";
    form.append(input, button);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const text = input.value.trim();
      if (text === "") return;

      button.disabled = true;
      showError("");

      try {
        await addDoc(comments, {
          text: text,
          userId: viewer.uid,
          createdAt: serverTimestamp(),
        });
        input.value = "";
        count += 1;
        showCount();
        await loadList();
      } catch (error) {
        showError("Could not post your comment, please try again");
        console.log(error.code, error.message);
      }

      button.disabled = false;
    });

    return form;
  }

  function createHint() {
    const link = document.createElement("a");
    link.href = SIGN_IN_PAGE;
    link.textContent = "Sign in";

    const hint = document.createElement("p");
    hint.className = "comment-hint";
    hint.append(link, " to comment.");
    return hint;
  }

  async function open() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    if (loaded) return;

    try {
      await loadList();
    } catch (error) {
      showError("Could not load comments, please try again");
      console.log(error.code, error.message);
    }
  }

  toggle.addEventListener("click", function () {
    if (panel.hidden) {
      open();
    } else {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  showCount();
  loadCount();
  return { toggle, panel };
}

// ================= Удаление фото (админ) =================

// Firestore не удаляет вложенные коллекции вместе с документом. Без этого лайки
// и комментарии остались бы в базе, а мы обещаем удалять данные полностью.
// Фото удаляем последним: если что-то сорвётся, можно просто нажать ещё раз.
export async function deletePhoto(photoRef) {
  const [likes, comments] = await Promise.all([
    getDocs(collection(photoRef, "likes")),
    getDocs(collection(photoRef, "comments")),
  ]);

  await Promise.all(
    [...likes.docs, ...comments.docs].map(function (item) {
      return deleteDoc(item.ref);
    })
  );

  await deleteDoc(photoRef);
}
