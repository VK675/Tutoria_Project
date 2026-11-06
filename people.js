// Имена и аватары участников: их показывают карточки фото и комментарии.
// Email здесь нет: другим людям на сайте он никогда не показывается.
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const DEFAULT_NAME = "Classmate";

// Кэш: автор десяти комментариев скачивается один раз, а не десять.
// Храним сам запрос (Promise), чтобы одновременные вызовы тоже не дублировались.
const profiles = new Map();

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

// После сохранения профиля кладём новую версию в кэш
export function rememberProfile(userId, profile) {
  profiles.set(userId, Promise.resolve(profile));
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
