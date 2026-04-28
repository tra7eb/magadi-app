// ─── أضف بيانات Firebase الخاصة بك هنا ───────────────────────────────────────
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCw2m9OxPLAYKMTx6g3U_z2-KoVwWCnnzA",
  authDomain: "maqadi-app.firebaseapp.com",
  projectId: "maqadi-app",
  storageBucket: "maqadi-app.firebasestorage.app",
  messagingSenderId: "451321987754",
  appId: "1:451321987754:web:8ab942d3b20c7d32e986d3"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// ─── SYNC HELPERS ─────────────────────────────────────────────────────────────

// حفظ البيانات في Firestore
export async function saveToCloud(docId, data) {
  try {
    await setDoc(doc(db, 'maqadi', docId), data)
  } catch (e) {
    console.error('Cloud save error:', e)
  }
}

// الاستماع للتغييرات في الوقت الفعلي
export function listenToCloud(docId, callback) {
  return onSnapshot(doc(db, 'maqadi', docId), (snap) => {
    if (snap.exists()) callback(snap.data())
  })
}

// قراءة مرة واحدة
export async function readFromCloud(docId) {
  try {
    const snap = await getDoc(doc(db, 'maqadi', docId))
    return snap.exists() ? snap.data() : null
  } catch (e) {
    return null
  }
}
