// Форма профиля на album.html: участник задаёт себе имя и аватар
import { db } from "./firebase.js";
import { cropAvatar } from "./image.js";
import { createAvatar, getProfile, rememberProfile } from "./people.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const MAX_AVATAR_LENGTH = 60000; // тот же предел стоит в firestore.rules

const editButton = document.getElementById("edit-profile");
const profileForm = document.getElementById("profile-form");
const nameInput = document.getElementById("profile-name");
const photoInput = document.getElementById("profile-photo");
const preview = document.getElementById("profile-preview");
const profileStatus = document.getElementById("profile-status");
const userName = document.getElementById("user-name");

let currentAccount = null;

// Вызывается при каждой смене пользователя: настраивает шапку и форму профиля
export async function showProfile(account) {
  currentAccount = account;
  editButton.hidden = account === null;
  profileForm.hidden = true;
  profileForm.reset();
  profileStatus.textContent = "";

  if (account === null) return;
  userName.textContent = account.email; // это видит только сам пользователь
  fillForm(await getProfile(account.uid));
}

function fillForm(profile) {
  if (profile.name) {
    userName.textContent = profile.name;
  }
  nameInput.value = profile.name ?? "";
  preview.replaceChildren(createAvatar(profile));
}

editButton.addEventListener("click", function () {
  profileForm.hidden = !profileForm.hidden;
});

profileForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  const account = currentAccount;
  if (account === null) return;

  profileStatus.textContent = "Saving...";

  try {
    const oldProfile = await getProfile(account.uid);
    const newProfile = { name: nameInput.value.trim() };

    const file = photoInput.files[0];
    const avatar = file ? await cropAvatar(file) : oldProfile.avatar;
    if (avatar) {
      newProfile.avatar = avatar;
    }

    if (newProfile.name === "") {
      profileStatus.textContent = "Please enter a name";
      return;
    }
    if (avatar && avatar.length > MAX_AVATAR_LENGTH) {
      profileStatus.textContent = "This photo is too large, try another one";
      return;
    }

    await setDoc(doc(db, "profiles", account.uid), newProfile);

    rememberProfile(account.uid, newProfile);
    fillForm(newProfile);
    photoInput.value = "";
    profileStatus.textContent = "Saved";
  } catch (error) {
    profileStatus.textContent = "Could not save, please try again";
    console.log(error.code, error.message);
  }
});
