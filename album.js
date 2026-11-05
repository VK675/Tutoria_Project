import { auth } from "./firebase.js";
import {
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
