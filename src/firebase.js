import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAbKkILS-Ig1xUgnNkMublBnrrKWOBwHEQ",
  authDomain: "maqadi-app-faa60.firebaseapp.com",
  projectId: "maqadi-app-faa60",
  storageBucket: "maqadi-app-faa60.firebasestorage.app",
  messagingSenderId: "984148100883",
  appId: "1:984148100883:web:67222f59023371cee03ce6"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export async function saveToCloud(docId, data) {
  try {
    await setDoc(doc(db, 'maqadi', docId), data)
  } catch (e) {
    console.error('Cloud save error:', e)
  }
}

export function listenToCloud(docId, callback) {
  return onSnapshot(doc(db, 'maqadi', docId), (snap) => {
    if (snap.exists()) callback(snap.data())
  })
}

export async function readFromCloud(docId) {
  try {
    const snap = await getDoc(doc(db, 'maqadi', docId))
    return snap.exists() ? snap.data() : null
  } catch (e) {
    return null
  }
}
