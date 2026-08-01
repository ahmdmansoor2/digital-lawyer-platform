// Runtime Firebase initializer (dynamic imports)
// Ensures Firebase is only loaded when needed and allows portable Electron builds to disable it.

const firebaseConfig = {
  apiKey: "AIzaSyCYzLif-sT3dFqezeHJnRvK0o52ENBMzu4",
  authDomain: "justice-91571.firebaseapp.com",
  projectId: "justice-91571",
  storageBucket: "justice-91571.firebasestorage.app",
  messagingSenderId: "540483767278",
  appId: "1:540483767278:web:c5fe425e086a3303761cff",
  measurementId: "G-PTZXMXN3MX"
};

let _instance: any = null;

export async function getFirebase() {
  if (_instance) return _instance;

  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
  const disableFirebase = typeof window !== 'undefined' && (window as any).__disableFirebase === true;
  if (isElectron && disableFirebase) {
    _instance = { disabled: true, app: null, auth: {}, db: {}, storage: {}, googleProvider: {}, phoneProvider: {} };
    return _instance;
  }

  const [{ initializeApp }, { getAuth, GoogleAuthProvider, PhoneAuthProvider }, { getFirestore }, { getStorage }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/storage'),
  ]);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();
  try { googleProvider.setCustomParameters({ prompt: 'select_account' }); } catch (e) {}
  const phoneProvider = new PhoneAuthProvider(auth);
  const db = getFirestore(app);
  const storage = getStorage(app);

  _instance = { disabled: false, app, auth, db, storage, googleProvider, phoneProvider };
  return _instance;
}
