// Карточка фото: автор, снимок, лайки и комментарии.
// Одна и та же карточка показывается в альбоме и на главной.
import { createAvatar, displayName, getProfile } from "./people.js";
import { createComments, createLikeButton, deletePhoto } from "./social.js";

// viewer: { uid, role }. onDeleted вызывается, когда админ удалил фото.
export function createPost(photoDoc, viewer, onDeleted) {
  const { image: photo, userId } = photoDoc.data();

  const author = document.createElement("div");
  author.className = "post-author";
  showAuthor(author, userId);

  const image = document.createElement("img");
  image.src = photo;
  image.alt = "Trip photo";

  const figure = document.createElement("figure");
  figure.className = "photo";
  figure.append(image);

  const errorLine = document.createElement("p");
  errorLine.className = "form-error";
  errorLine.setAttribute("role", "alert");

  function showError(message) {
    errorLine.textContent = message;
  }

  const comments = createComments(photoDoc.ref, viewer, showError);

  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.append(createLikeButton(photoDoc.ref, showError), comments.toggle);

  const post = document.createElement("article");
  post.className = "post";

  if (viewer.role === "admin") {
    actions.append(createDeleteButton(photoDoc.ref, post, showError, onDeleted));
  }

  post.append(author, figure, actions, errorLine, comments.panel);
  return post;
}

async function showAuthor(author, userId) {
  const profile = await getProfile(userId);

  const name = document.createElement("strong");
  name.textContent = displayName(profile);

  author.append(createAvatar(profile), name);
}

function createDeleteButton(photoRef, post, showError, onDeleted) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "post-action post-delete";
  button.textContent = "Delete";

  button.addEventListener("click", async function () {
    // Удаление нельзя отменить, поэтому спрашиваем
    if (!confirm("Delete this photo with its likes and comments for good?")) return;

    button.disabled = true;
    showError("");

    try {
      await deletePhoto(photoRef);
      post.remove();
      onDeleted();
    } catch (error) {
      button.disabled = false;
      showError("Could not delete the photo, please try again");
      console.log(error.code, error.message);
    }
  });

  return button;
}
