import { auth, db } from "./firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const form = document.getElementById("login-form");
const errorText = document.getElementById("login-error");
const album = document.getElementById("album-section");

onAuthStateChanged(auth, function (user) {
  if (user) {
    document.getElementById("user-email").textContent = user.email;
  }
  form.hidden = user !== null;
  album.hidden = user === null;
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  errorText.textContent = "";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("Signed in as", result.user.email);
  } catch (error) {
    errorText.textContent = "Wrong email or password";
    console.log(error.code);
  }
});




document.getElementById("sign-out").addEventListener("click", function () {
  signOut(auth);
});



const uploadForm = document.getElementById("upload-form");
const photoInput = document.getElementById("photo-input");
const uploadStatus = document.getElementById("upload-status");

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

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.8);
}