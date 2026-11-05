// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBW8YpTvGMg4T_KmWpDrI4wLMKaPYrEbZE",
  authDomain: "porto-trip-2fc73.firebaseapp.com",
  projectId: "porto-trip-2fc73",
  storageBucket: "porto-trip-2fc73.firebasestorage.app",
  messagingSenderId: "453483836837",
  appId: "1:453483836837:web:e5758b40372646f47da44c",
  measurementId: "G-81CT9580VR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);     
console.log("Firebase OK", app.name);

