import { auth, db } from "./firebase.js";
import { compressImage } from "./image.js";
import { showProfile } from "./profile.js";
import { createPost } from "./post.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  startAfter,
  where,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const form = document.getElementById("login-form");
const errorText = document.getElementById("login-error");
const album = document.getElementById("album-section");
const gallery = document.getElementById("gallery");
const galleryEmpty = document.getElementById("gallery-empty");
const loadMoreButton = document.getElementById("load-more");
const signInLink = document.getElementById("sign-in");
const signOutButton = document.getElementById("sign-out");
const userLine = document.getElementById("album-user");
const guestHint = document.getElementById("guest-hint");
const uploadForm = document.getElementById("upload-form");
const photoInput = document.getElementById("photo-input");
const uploadStatus = document.getElementById("upload-status");

const PAGE_SIZE = 12; // сколько фото грузим за раз: экономим лимит трафика Firestore
let lastPhoto = null; // последнее загруженное фото: следующая порция начнётся после него

// Кто смотрит страницу: uid и роль guest, member или admin
let viewer = { uid: null, role: "guest" };

onAuthStateChanged(auth, async function (user) {
  const uid = user?.uid ?? null;
  viewer = { uid: uid, role: "guest" };

  const role = await getRole(user);

  // Пока ждали ответ, пользователь мог смениться: тогда этот ответ устарел
  if (viewer.uid !== uid) return;
  viewer.role = role;

  if (user !== null) {
    form.reset(); // пароль не должен оставаться в поле
    history.replaceState(null, "", location.pathname);
  }

  signInLink.hidden = user !== null;
  guestHint.hidden = user !== null;
  signOutButton.hidden = user === null;
  userLine.hidden = user === null;
  uploadForm.hidden = user === null;
  uploadStatus.textContent = ""; // сообщение прошлого пользователя здесь ни к чему
  showProfile(user);

  showPage();
  resetGallery();
  loadGallery();
});

// Только для интерфейса: настоящую защиту дают правила в firestore.rules
async function getRole(user) {
  if (user === null) return "guest";

  try {
    const adminDoc = await getDoc(doc(db, "admins", user.uid));
    return adminDoc.exists() ? "admin" : "member";
  } catch (error) {
    console.log(error.code, error.message);
    return "member";
  }
}

// Форму входа показываем только по ссылке Sign in, альбом виден всем
function showPage() {
  const showLogin = location.hash === "#sign-in" && viewer.uid === null;
  form.hidden = !showLogin;
  album.hidden = showLogin;
}

window.addEventListener("hashchange", showPage);

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  errorText.textContent = "";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    errorText.textContent = "Wrong email or password";
    console.log(error.code);
  }
});

signOutButton.addEventListener("click", function () {
  signOut(auth);
});

uploadForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const file = photoInput.files[0];
  uploadStatus.textContent = "Uploading...";

  try {
    const photo = await compressImage(file);

    if (photo.length > 1000000) {
      uploadStatus.textContent = "This photo is too large, try another one";
      return;
    }

    await addDoc(collection(db, "photos"), {
      image: photo,
      userId: auth.currentUser.uid,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    uploadStatus.textContent = "Uploaded! It will appear after approval.";
    uploadForm.reset();
  } catch (error) {
    uploadStatus.textContent = "Upload failed, please try again";
    console.log(error.code, error.message);
  }
});

function resetGallery() {
  gallery.replaceChildren();
  lastPhoto = null;
  loadMoreButton.hidden = true;
  galleryEmpty.textContent = "No photos yet.";
  galleryEmpty.hidden = true; // покажем, только когда база ответит, что фото нет
}

async function loadGallery() {
  loadMoreButton.disabled = true;

  try {
    const filters = [where("status", "==", "approved"), limit(PAGE_SIZE)];
    if (lastPhoto !== null) {
      filters.push(startAfter(lastPhoto));
    }

    const snapshot = await getDocs(query(collection(db, "photos"), ...filters));

    snapshot.forEach(function (photoDoc) {
      gallery.append(createPost(photoDoc, viewer, showEmptyNote));
    });

    if (!snapshot.empty) {
      lastPhoto = snapshot.docs[snapshot.docs.length - 1];
    }

    // Пришла неполная порция — значит, больше фото нет
    loadMoreButton.hidden = snapshot.size < PAGE_SIZE;
    showEmptyNote();
  } catch (error) {
    galleryEmpty.textContent = "Could not load photos, please refresh the page";
    galleryEmpty.hidden = false;
    console.log(error.code, error.message);
  }

  loadMoreButton.disabled = false;
}

function showEmptyNote() {
  galleryEmpty.hidden = gallery.children.length > 0;
}

loadMoreButton.addEventListener("click", loadGallery);
