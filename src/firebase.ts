// Lightweight Firebase wrapper — allows disabling initialization in portable Electron builds.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, PhoneAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCYzLif-sT3dFqezeHJnRvK0o52ENBMzu4",
  authDomain: "justice-91571.firebaseapp.com",
  projectId: "justice-91571",
  storageBucket: "justice-91571.firebasestorage.app",
  messagingSenderId: "540483767278",
  appId: "1:540483767278:web:c5fe425e086a3303761cff",
  measurementId: "G-PTZXMXN3MX"
};

const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
const disableFirebase = typeof window !== 'undefined' && (window as any).__disableFirebase === true;

let _auth: any = null;
let _googleProvider: any = null;
let _phoneProvider: any = null;
let _db: any = null;
let _storage: any = null;
let _app: any = null;

if (isElectron && disableFirebase) {
  _auth = {};
  _googleProvider = {};
  _phoneProvider = {};
  _db = {};
  _storage = {};
} else {
  _app = initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _googleProvider = new GoogleAuthProvider();
  _googleProvider.setCustomParameters({ prompt: 'select_account' });
  _phoneProvider = new PhoneAuthProvider(_auth);
  _db = getFirestore(_app);
  _storage = getStorage(_app);
}

export const auth = _auth;
export const googleProvider = _googleProvider;
export const phoneProvider = _phoneProvider;
export const db = _db;
export const storage = _storage;
export default _app;
