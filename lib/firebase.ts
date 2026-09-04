import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Environment-driven Firebase Web App configuration for project econexus-c8620
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "econexus-c8620.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "econexus-c8620",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "econexus-c8620.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton initialization for Next.js SSR / Client re-renders
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Configure Firebase Client SDK Services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Firestore Collection Names for EcoNexus Data Streams
export const FIRESTORE_COLLECTIONS = {
  WASTE_ANALYSIS: "waste_analysis",
  WASTE_COMPLAINTS: "waste_complaints",
  PICKUP_REQUESTS: "pickup_requests",
  EXCHANGE_LISTINGS: "exchangeListings",
  EXCHANGE_REQUESTS: "exchangeRequests",
  WASTE_REQUESTS: "wasteRequests",
  WASTE_REPORTS: "wasteReports",
  POINTS_TRANSACTIONS: "pointsTransactions",
  ECO_POINTS: "eco_points",
  REWARD_REDEMPTIONS: "rewardRedemptions",
  REWARDS: "rewards",
  USERS: "users",
} as const;

// Firebase Storage Folders for Uploaded Media
export const STORAGE_FOLDERS = {
  WASTE_IMAGES: "waste_images",
  COMPLAINT_PHOTOS: "complaint_photos",
  EXCHANGE_PHOTOS: "exchange_photos",
} as const;

// Firebase Authentication Role Definitions
export const USER_ROLES = {
  CITIZEN: "citizen",
  RECYCLER: "recycler",
  MUNICIPALITY: "municipality",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export default app;
