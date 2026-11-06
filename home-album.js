// Блок альбома на главной: те же карточки, что и на album.html, но только первые
import { auth, db } from "./firebase.js";
import { createPost } from "./post.js";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const PREVIEW_SIZE = 6;

const section = document.getElementById("album");
const gallery = document.getElementById("home-gallery");
const empty = document.getElementById("home-empty");

async function loadPreview() {
  try {
    // Ждём, пока Firebase вспомнит вошедшего: от этого зависят лайк и форма комментария.
    // Модерация только в альбоме, поэтому здесь админ — обычный участник.
    await auth.authStateReady();
    const user = auth.currentUser;
    const viewer = { uid: user?.uid ?? null, role: user === null ? "guest" : "member" };

    const approved = query(
      collection(db, "photos"),
      where("status", "==", "approved"),
      limit(PREVIEW_SIZE)
    );
    const snapshot = await getDocs(approved);

    snapshot.forEach(function (photoDoc) {
      gallery.append(createPost(photoDoc, viewer));
    });

    empty.hidden = !snapshot.empty;
  } catch (error) {
    empty.textContent = "Could not load photos, please refresh the page";
    empty.hidden = false;
    console.log(error.code, error.message);
  }
}

// Фото тяжёлые, а бесплатный трафик Firestore ограничен: грузим только тем,
// кто докрутил почти до этого блока, а не всем, кто открыл страницу.
const observer = new IntersectionObserver(function (entries) {
  if (entries[0].isIntersecting) {
    observer.disconnect();
    loadPreview();
  }
}, { rootMargin: "600px" });

observer.observe(section);
