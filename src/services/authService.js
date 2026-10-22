import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "../firebaseAuth";

export async function adminLogin(email, password) {
  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return result.user;
}

export async function adminLogout() {
  await signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}