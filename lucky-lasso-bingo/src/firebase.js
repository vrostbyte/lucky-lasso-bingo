// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyDTQDZl3N1k8OF16T65sG8h08OwYlGWCuQ",
  authDomain: "lucky-lasso-bingo.firebaseapp.com",
  projectId: "lucky-lasso-bingo",
  storageBucket: "lucky-lasso-bingo.appspot.com", // Fixed this line
  messagingSenderId: "479392611525",
  appId: "1:479392611525:web:78faec4482ab375249c4ac",
  measurementId: "G-6WPQ7QQQKR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app); // Optional, if you want to use analytics

export { app, db, auth, analytics }; // Added analytics to exports