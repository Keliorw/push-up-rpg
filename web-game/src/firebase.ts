import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// Значения из Firebase Console → Project settings → Your apps → SDK setup (CDN).
// Публичны by design; безопасность — в Firestore Security Rules. Analytics не нужен.
const firebaseConfig = {
  apiKey: 'AIzaSyD7-mxTSyGKJ-qDMB543r8I7XTyAdTAMjU',
  authDomain: 'push-ups-rpg.firebaseapp.com',
  projectId: 'push-ups-rpg',
  storageBucket: 'push-ups-rpg.firebasestorage.app',
  messagingSenderId: '212910431084',
  appId: '1:212910431084:web:3a025b103755c097417149',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
