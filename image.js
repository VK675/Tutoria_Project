// Сжатие картинок в браузере. Firebase Storage платный, поэтому фото лежат
// прямо в документах Firestore текстом (base64), и размер здесь важен.
// Заодно canvas переносит только пиксели, поэтому EXIF и GPS из файла пропадают.

const AVATAR_SIZE = 200;

// Фото для альбома: длинная сторона не больше 1600 px, пропорции сохраняются
export async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.8);
}

// Аватар: вырезаем квадрат из середины картинки и уменьшаем до 200×200
export async function cropAvatar(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const left = (bitmap.width - side) / 2;
  const top = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  canvas.getContext("2d").drawImage(bitmap, left, top, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  return canvas.toDataURL("image/jpeg", 0.8);
}
