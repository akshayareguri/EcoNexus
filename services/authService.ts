import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  onAuthStateChanged,
  User as FirebaseUser 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db, FIRESTORE_COLLECTIONS } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "citizen" | "recycler" | "municipality";
  ecoPoints?: number;
  createdAt: string;
}

/**
 * Save or update user profile document in Firestore 'users' collection using user's UID as doc ID
 */
export async function saveUserProfileToFirestore(
  uid: string,
  email: string | null,
  displayName: string | null,
  role: "citizen" | "recycler" | "municipality" = "citizen"
): Promise<UserProfile> {
  const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  const snap = await getDoc(userDocRef);

  let existingEcoPoints = 0;
  if (snap.exists() && typeof snap.data()?.ecoPoints === "number") {
    existingEcoPoints = snap.data().ecoPoints;
  }

  const profile: UserProfile = {
    uid,
    email: email || null,
    displayName: displayName || null,
    role,
    ecoPoints: existingEcoPoints,
    createdAt: snap.exists() ? (snap.data()?.createdAt || new Date().toISOString()) : new Date().toISOString(),
  };

  await setDoc(userDocRef, {
    ...profile,
    ecoPoints: existingEcoPoints,
    updatedAtServer: serverTimestamp(),
    createdAtServer: serverTimestamp(),
  }, { merge: true });

  return profile;
}

/**
 * Fetch user profile document from Firestore 'users' collection
 */
export async function getUserProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

/**
 * Sign up new user with Email and Password and persist user profile in Firestore 'users' collection
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: "citizen" | "recycler" | "municipality" = "citizen"
): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  // 1. Create user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Update display name in Firebase Auth profile
  if (displayName) {
    try {
      await updateProfile(user, { displayName });
    } catch (err) {
      console.warn("Update profile displayName warning:", err);
    }
  }

  // 3. Write user profile to Cloud Firestore 'users' collection with user.uid as Document ID
  const profile = await saveUserProfileToFirestore(
    user.uid, 
    user.email, 
    displayName || user.displayName, 
    role
  );

  return { user, profile };
}

/**
 * Log in existing user with Email and Password
 */
export async function logInWithEmail(
  email: string, 
  password: string
): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Log out current user
 */
export async function logOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Real-time listener for Auth State changes
 */
export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null, profile: UserProfile | null) => void
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        let profile = await getUserProfileFromFirestore(firebaseUser.uid);
        if (!profile) {
          profile = await saveUserProfileToFirestore(
            firebaseUser.uid,
            firebaseUser.email,
            firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Eco Citizen",
            "citizen"
          );
        }
        callback(firebaseUser, profile);
      } catch (err) {
        console.warn("Auth state change user profile fetch warning:", err);
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Eco Citizen",
          role: "citizen",
          createdAt: new Date().toISOString(),
        };
        callback(firebaseUser, fallbackProfile);
      }
    } else {
      callback(null, null);
    }
  });
}
