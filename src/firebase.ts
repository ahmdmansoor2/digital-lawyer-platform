// Lightweight Firebase wrapper — prevents bundling Firebase into the main renderer chunk
// and allows disabling initialization in portable Electron builds.

// Firebase config (kept here; safe in renderer for this app)
const firebaseConfig = {
  apiKey: "AIzaSyCYzLif-sT3dFqezeHJnRvK0o52ENBMzu4",
  authDomain: "justice-91571.firebaseapp.com",
  projectId: "justice-91571",
  storageBucket: "justice-91571.firebasestorage.app",
  messagingSenderId: "540483767278",
  appId: "1:540483767278:web:c5fe425e086a3303761cff",
  measurementId: "G-PTZXMXN3MX"
};

// Guard: detect Electron + disable flag set by preload
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
const disableFirebase = typeof window !== 'undefined' && (window as any).__disableFirebase === true;

// ── إعداد Firebase الثابت لمنع أي خطأ في بيئة التشغيل ──────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCYzLif-sT3dFqezeHJnRvK0o52ENBMzu4",
  authDomain: "justice-91571.firebaseapp.com",
  projectId: "justice-91571",
  storageBucket: "justice-91571.firebasestorage.app",
  messagingSenderId: "540483767278",
  appId: "1:540483767278:web:c5fe425e086a3303761cff",
  measurementId: "G-PTZXMXN3MX"
};

// Guard: allow disabling Firebase in packaged Electron builds to avoid redirect/popup issues.
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
const disableFirebase = typeof window !== 'undefined' && (window as any).__disableFirebase === true;

// prepare exports
let _auth: any = null;
let _googleProvider: any = null;
let _phoneProvider: any = null;
let _db: any = null;
let _storage: any = null;
let _app: any = null;

if (isElectron && disableFirebase) {
  // stubs (no initialization)
  _auth = {};
  _googleProvider = {};
  _phoneProvider = {};
  _db = {};
  _storage = {};
  _app = null;
} else {
  // initialize Firebase normally
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

