// Профиль участника: имя и аватар, которые класс видит рядом с комментариями.
// Email на сайте никогда не показывается другим людям.
import { db } from "./firebase.js";
import { cropAvatar } from "./image.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const DEFAULT_NAME = "Classmate";
const MAX_AVATAR_LENGTH = 60000; // тот же предел стоит в firestore.rules

const editButton = document.getElementById("edit-profile");
const profileForm = document.getElementById("profile-form");
const nameInput = document.getElementById("profile-name");
const photoInput = document.getElementById("profile-photo");
const preview = document.getElementById("profile-preview");
const profileStatus = document.getElementById("profile-status");
const userName = document.getElementById("user-name");

// Кэш: автор десяти комментариев скачивается один раз, а не десять.
// Храним сам запрос (Promise), чтобы одновременные вызовы тоже не дублировались.
const profiles = new Map();
let currentAccount = null;

export function getProfile(userId) {
  if (!profiles.has(userId)) {
    const request = getDoc(doc(db, "profiles", userId))
      .then(function (snapshot) {
        return snapshot.data() ?? {};
      })
      .catch(function (error) {
        console.log(error.code, error.message);
        return {};
      });
    profiles.set(userId, request);
  }
  return profiles.get(userId);
}

export function displayName(profile) {
  return profile.name ?? DEFAULT_NAME;
}

// Круглый аватар. Нет фото — показываем первую букву имени.
export function createAvatar(profile) {
  if (profile.avatar) {
    const image = document.createElement("img");
    image.className = "avatar";
    image.src = profile.avatar;
    image.alt = "";
    return image;
  }

  const letter = document.createElement("span");
  letter.className = "avatar";
  letter.textContent = [...displayName(profile)][0].toUpperCase(); // [...] не разрежет эмодзи пополам
  return letter;
}

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

    profiles.set(account.uid, Promise.resolve(newProfile));
    fillForm(newProfile);
    photoInput.value = "";
    profileStatus.textContent = "Saved";
  } catch (error) {
    profileStatus.textContent = "Could not save, please try again";
    console.log(error.code, error.message);
  }
});
