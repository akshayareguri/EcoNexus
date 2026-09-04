import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  runTransaction,
  DocumentData
} from "firebase/firestore";
import { db, FIRESTORE_COLLECTIONS } from "@/lib/firebase";
import { WasteComplaint, ComplaintStatus } from "@/types/complaint";
import { WastePickupRequest, PickupStatus } from "@/types/pickup";
import { ExchangeListing, ExchangeRequest, ExchangeRequestStatus } from "@/types/exchange";
import { WasteAnalysisResult } from "@/services/wasteAnalysisService";
import { WasteRequest } from "@/types/wasteRequest";
import { WasteReport } from "@/types/wasteReport";
import { PointsTransaction } from "@/types/pointsTransaction";
import { Reward, RewardRedemption } from "@/types/reward";

// ==========================================
// 1. PUBLIC WASTE COMPLAINTS (waste_complaints)
// ==========================================

export async function fetchComplaintsFromFirestore(): Promise<WasteComplaint[]> {
  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.WASTE_COMPLAINTS)
    );
    const querySnapshot = await getDocs(q);
    const complaints: WasteComplaint[] = [];
    querySnapshot.forEach((docSnap) => {
      complaints.push(docSnap.data() as WasteComplaint);
    });
    return complaints;
  } catch (error) {
    console.warn("Firestore fetch complaints fallback:", error);
    return [];
  }
}

export function subscribeToComplaints(callback: (complaints: WasteComplaint[]) => void) {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.WASTE_COMPLAINTS));
    return onSnapshot(
      q,
      (snapshot) => {
        const complaints: WasteComplaint[] = [];
        snapshot.forEach((docSnap) => {
          complaints.push(docSnap.data() as WasteComplaint);
        });
        if (complaints.length > 0) {
          callback(complaints);
        }
      },
      (error) => {
        console.warn("Firestore complaints snapshot listener info:", error.message);
      }
    );
  } catch (error) {
    console.warn("Firestore complaints subscription fallback:", error);
    return () => {};
  }
}

export async function saveComplaintToFirestore(complaint: WasteComplaint): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.WASTE_COMPLAINTS, complaint.id);
    await setDoc(docRef, {
      ...complaint,
      createdAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore save complaint fallback:", error);
  }
}

export async function updateComplaintStatusInFirestore(
  id: string, 
  status: ComplaintStatus, 
  assignedCrew?: string,
  pointsAwarded?: boolean
): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.WASTE_COMPLAINTS, id);
    const updateData: DocumentData = { status };
    if (assignedCrew) updateData.assignedCrew = assignedCrew;
    if (pointsAwarded !== undefined) updateData.pointsAwarded = pointsAwarded;
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.warn("Firestore update complaint fallback:", error);
  }
}

// ==========================================
// 2. WASTE PICKUP REQUESTS (pickup_requests)
// ==========================================

export async function fetchPickupRequestsFromFirestore(): Promise<WastePickupRequest[]> {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.PICKUP_REQUESTS));
    const querySnapshot = await getDocs(q);
    const requests: WastePickupRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      requests.push(docSnap.data() as WastePickupRequest);
    });
    return requests;
  } catch (error) {
    console.warn("Firestore fetch pickup requests fallback:", error);
    return [];
  }
}

export function subscribeToPickupRequests(callback: (requests: WastePickupRequest[]) => void) {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.PICKUP_REQUESTS));
    return onSnapshot(
      q,
      (snapshot) => {
        const requests: WastePickupRequest[] = [];
        snapshot.forEach((docSnap) => {
          requests.push(docSnap.data() as WastePickupRequest);
        });
        if (requests.length > 0) {
          callback(requests);
        }
      },
      (error) => {
        console.warn("Firestore pickup requests snapshot info:", error.message);
      }
    );
  } catch (error) {
    console.warn("Firestore pickup requests subscription fallback:", error);
    return () => {};
  }
}

export async function savePickupRequestToFirestore(request: WastePickupRequest): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.PICKUP_REQUESTS, request.pickupRequestId);
    await setDoc(docRef, {
      ...request,
      createdAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore save pickup request fallback:", error);
  }
}

export async function updatePickupStatusInFirestore(
  requestId: string, 
  status: PickupStatus,
  pointsAwarded?: boolean
): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.PICKUP_REQUESTS, requestId);
    const updateData: DocumentData = { status };
    if (pointsAwarded !== undefined) updateData.pointsAwarded = pointsAwarded;
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.warn("Firestore update pickup status fallback:", error);
  }
}

// ==========================================
// 3. CIRCULAR EXCHANGE LISTINGS (exchange_listings)
// ==========================================

const DEFAULT_EXCHANGE_PLACEHOLDER = "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80";

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "Furniture": "https://images.unsplash.com/photo-1580481072645-022f9a6d1270?auto=format&fit=crop&w=600&q=80",
  "Home & Lighting": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80",
  "Appliances": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  "Toys & Books": "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80",
  "Electronics": "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80",
};

export type RecordImageType = "exchangeListing" | "wasteReport" | "wasteRequest";

export function getRecordImageStorageKey(type: RecordImageType, id: string): string {
  return `econexus:image:${type}:${id}`;
}

export function saveRecordImageToLocalStorage(type: RecordImageType, recordId: string, imageDataUrl: string): void {
  if (typeof window === "undefined" || !recordId || !imageDataUrl) return;
  try {
    if (imageDataUrl.startsWith("data:image/")) {
      const key = getRecordImageStorageKey(type, recordId);
      localStorage.setItem(key, imageDataUrl);
      if (type === "exchangeListing") {
        localStorage.setItem(`econexus_exchange_image_${recordId}`, imageDataUrl);
      }
    }
  } catch {
    // Gracefully handle QuotaExceededError or disabled localStorage
  }
}

export function getStoredRecordImage(type: RecordImageType, recordId: string): string | null {
  if (typeof window === "undefined" || !recordId) return null;
  try {
    const key = getRecordImageStorageKey(type, recordId);
    let item = localStorage.getItem(key);
    if (!item && type === "exchangeListing") {
      item = localStorage.getItem(`econexus_exchange_image_${recordId}`);
    }
    if (item && (item.startsWith("data:image/") || item.startsWith("http://") || item.startsWith("https://"))) {
      return item;
    }
  } catch {
    // Gracefully handle invalid or missing localStorage
  }
  return null;
}

export const EXCHANGE_IMAGE_KEY_PREFIX = "econexus_exchange_image_";

export function saveListingImageToLocalStorage(listingId: string, imageDataUrl: string): void {
  saveRecordImageToLocalStorage("exchangeListing", listingId, imageDataUrl);
}

export function getStoredListingImage(listingId: string): string | null {
  return getStoredRecordImage("exchangeListing", listingId);
}

export function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 300,
  maxHeight = 300,
  quality = 0.55
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !dataUrl || !dataUrl.startsWith("data:image/")) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

export function getCategoryFallbackImage(category?: string): string {
  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category];
  }
  return DEFAULT_EXCHANGE_PLACEHOLDER;
}

function getValidExchangeImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const str = rawUrl.trim();
  if (str.startsWith("data:image/") && str.length < 100000) {
    return str;
  }
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }
  return null;
}

export async function fetchExchangeListingsFromFirestore(): Promise<ExchangeListing[]> {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.EXCHANGE_LISTINGS));
    const querySnapshot = await getDocs(q);
    const listings: ExchangeListing[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const validUrl = getValidExchangeImageUrl(data.imageUrl) || getValidExchangeImageUrl(data.image);
      const displayImage = validUrl || getCategoryFallbackImage(data.category);

      listings.push({
        id: docId,
        ownerId: data.ownerId || "",
        ownerName: data.ownerName || data.postedBy || "Eco Citizen",
        itemName: data.itemName || data.title || "Usable Item",
        title: data.title || data.itemName || "Usable Item",
        category: data.category || "General",
        condition: data.condition || "Good",
        location: data.location || "Community Ward",
        distance: data.distance || "0.5 miles away",
        postedBy: data.postedBy || data.ownerName || "Eco Citizen",
        postedTime: data.postedTime || "Recently",
        imageUrl: displayImage,
        image: displayImage,
        description: data.description || "",
        status: data.status || "available",
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
      });
    });
    return listings;
  } catch (error) {
    console.warn("Firestore fetch listings fallback:", error);
    return [];
  }
}

export function subscribeToExchangeListings(callback: (listings: ExchangeListing[]) => void) {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.EXCHANGE_LISTINGS));
    return onSnapshot(
      q,
      (snapshot) => {
        const listings: ExchangeListing[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const validUrl = getValidExchangeImageUrl(data.imageUrl) || getValidExchangeImageUrl(data.image);
          const displayImage = validUrl || getCategoryFallbackImage(data.category);

          listings.push({
            id: docId,
            ownerId: data.ownerId || "",
            ownerName: data.ownerName || data.postedBy || "Eco Citizen",
            itemName: data.itemName || data.title || "Usable Item",
            title: data.title || data.itemName || "Usable Item",
            category: data.category || "General",
            condition: data.condition || "Good",
            location: data.location || "Community Ward",
            distance: data.distance || "0.5 miles away",
            postedBy: data.postedBy || data.ownerName || "Eco Citizen",
            postedTime: data.postedTime || "Recently",
            imageUrl: displayImage,
            image: displayImage,
            description: data.description || "",
            status: data.status || "available",
            createdAt: data.createdAt || "",
            updatedAt: data.updatedAt || "",
          });
        });
        callback(listings);
      },
      (error) => {
        console.warn("Firestore exchange listings snapshot info:", error.message);
      }
    );
  } catch (error) {
    console.warn("Firestore exchange listings subscription fallback:", error);
    return () => {};
  }
}

export async function saveExchangeListingToFirestore(listing: ExchangeListing): Promise<void> {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.EXCHANGE_LISTINGS, listing.id);
  const now = new Date().toISOString();
  
  let validUrl = getValidExchangeImageUrl(listing.imageUrl) || getValidExchangeImageUrl(listing.image);

  if (validUrl && validUrl.startsWith("data:image/")) {
    validUrl = await compressImageDataUrl(validUrl, 300, 300, 0.55);
  }

  if (!validUrl) {
    validUrl = getCategoryFallbackImage(listing.category);
  }

  const payload = {
    id: listing.id,
    ownerId: listing.ownerId || "anonymous-user",
    ownerName: listing.ownerName || listing.postedBy || "Eco Citizen",
    itemName: listing.itemName || listing.title,
    title: listing.title || listing.itemName || "Usable Item",
    category: listing.category || "General",
    condition: listing.condition || "Good",
    description: listing.description || "",
    location: listing.location || "Community Ward",
    imageUrl: validUrl,
    image: validUrl,
    status: listing.status || "available",
    createdAt: listing.createdAt || now,
    updatedAt: listing.updatedAt || now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
}

export async function updateExchangeListingStatusInFirestore(
  id: string, 
  status: string
): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.EXCHANGE_LISTINGS, id);
    await updateDoc(docRef, { 
      status,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore update listing status fallback:", error);
  }
}

// ==========================================
// 4. CIRCULAR EXCHANGE REQUESTS (exchangeRequests)
// ==========================================

export async function fetchExchangeRequestsFromFirestore(): Promise<ExchangeRequest[]> {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.EXCHANGE_REQUESTS));
    const querySnapshot = await getDocs(q);
    const requests: ExchangeRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      requests.push({
        id: docSnap.id,
        requestId: data.requestId || docSnap.id,
        listingId: data.listingId || "",
        itemName: data.itemName || "",
        itemImage: data.itemImage || "",
        itemCategory: data.itemCategory || "",
        ownerId: data.ownerId || "",
        ownerName: data.ownerName || data.owner || "Item Owner",
        owner: data.owner || data.ownerName || "Item Owner",
        requesterId: data.requesterId || "",
        requesterName: data.requesterName || data.requester || "Citizen Requester",
        requester: data.requester || data.requesterName || "Citizen Requester",
        status: data.status || "pending",
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
      });
    });
    return requests;
  } catch (error) {
    console.warn("Firestore fetch exchange requests fallback:", error);
    return [];
  }
}

export function subscribeToExchangeRequests(callback: (requests: ExchangeRequest[]) => void) {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.EXCHANGE_REQUESTS));
    return onSnapshot(
      q,
      (snapshot) => {
        const requests: ExchangeRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          requests.push({
            id: docSnap.id,
            requestId: data.requestId || docSnap.id,
            listingId: data.listingId || "",
            itemName: data.itemName || "",
            itemImage: data.itemImage || "",
            itemCategory: data.itemCategory || "",
            ownerId: data.ownerId || "",
            ownerName: data.ownerName || data.owner || "Item Owner",
            owner: data.owner || data.ownerName || "Item Owner",
            requesterId: data.requesterId || "",
            requesterName: data.requesterName || data.requester || "Citizen Requester",
            requester: data.requester || data.requesterName || "Citizen Requester",
            status: data.status || "pending",
            createdAt: data.createdAt || "",
            updatedAt: data.updatedAt || "",
          });
        });
        callback(requests);
      },
      (error) => {
        console.warn("Firestore exchange requests snapshot info:", error.message);
      }
    );
  } catch (error) {
    console.warn("Firestore exchange requests subscription fallback:", error);
    return () => {};
  }
}

export async function saveExchangeRequestToFirestore(request: ExchangeRequest): Promise<void> {
  const reqId = request.requestId || request.id || `EX-REQ-${Date.now()}`;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.EXCHANGE_REQUESTS, reqId);
  const now = new Date().toISOString();

  const payload = {
    id: reqId,
    requestId: reqId,
    listingId: request.listingId,
    itemName: request.itemName,
    ownerId: request.ownerId || "",
    ownerName: request.ownerName || request.owner || "Item Owner",
    owner: request.owner || request.ownerName || "Item Owner",
    requesterId: request.requesterId || "",
    requesterName: request.requesterName || request.requester || "Citizen Requester",
    requester: request.requester || request.requesterName || "Citizen Requester",
    status: request.status || "pending",
    createdAt: request.createdAt || now,
    updatedAt: request.updatedAt || now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
}

export async function updateExchangeRequestStatusInFirestore(
  requestId: string, 
  status: ExchangeRequestStatus,
  pointsAwarded?: boolean
): Promise<void> {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.EXCHANGE_REQUESTS, requestId);
  const updateData: DocumentData = { 
    status,
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  };
  if (pointsAwarded !== undefined) updateData.pointsAwarded = pointsAwarded;
  await updateDoc(docRef, updateData);
}

// ==========================================
// 5. WASTE ANALYSIS RECORDS (waste_analysis)
// ==========================================

export async function saveWasteAnalysisRecordToFirestore(
  analysis: WasteAnalysisResult,
  userId = "anonymous-citizen"
): Promise<void> {
  try {
    const recordId = `ANALYSIS-${Date.now()}`;
    const docRef = doc(db, FIRESTORE_COLLECTIONS.WASTE_ANALYSIS, recordId);
    await setDoc(docRef, {
      recordId,
      userId,
      itemName: analysis.itemName,
      category: analysis.category,
      material: analysis.material,
      confidence: analysis.confidence,
      recommendedAction: analysis.recommendedAction,
      aiReasoning: analysis.aiReasoning,
      createdAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore save waste analysis record fallback:", error);
  }
}

// ==========================================
// 6. USERS & ECO POINTS (users, eco_points, reward_redemptions)
// ==========================================

export async function syncUserPointsToFirestore(userId: string, points: number): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.ECO_POINTS, userId);
    await setDoc(docRef, {
      userId,
      points,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn("Firestore sync user points fallback:", error);
  }
}

export async function saveRewardRedemptionToFirestore(
  userId: string,
  voucherId: string,
  cost: number,
  code: string
): Promise<void> {
  try {
    const redemptionId = `RED-${Date.now()}`;
    const docRef = doc(db, FIRESTORE_COLLECTIONS.REWARD_REDEMPTIONS, redemptionId);
    await setDoc(docRef, {
      redemptionId,
      userId,
      voucherId,
      cost,
      code,
      createdAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore save reward redemption fallback:", error);
  }
}

// ==========================================
// 7. WASTE REQUESTS (wasteRequests)
// ==========================================

export async function saveWasteRequestToFirestore(request: WasteRequest): Promise<void> {
  const reqId = request.requestId || request.id || `WASTE-REQ-${Date.now()}`;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.WASTE_REQUESTS, reqId);
  const now = new Date().toISOString();

  const rawImage = (request as unknown as { image?: string; imageUrl?: string }).image || request.imageUrl;
  if (rawImage && rawImage.startsWith("data:image/")) {
    saveRecordImageToLocalStorage("wasteRequest", reqId, rawImage);
  }

  const payload = {
    id: reqId,
    requestId: reqId,
    userId: request.userId || "anonymous-citizen",
    userName: request.userName || "Eco Citizen",
    action: request.action,
    itemName: request.itemName,
    category: request.category || "General Waste",
    location: request.location || "Community Ward",
    status: request.status || "pending",
    createdAt: request.createdAt || now,
    updatedAt: request.updatedAt || now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
}

// ==========================================
// 8. PUBLIC WASTE REPORTS (wasteReports)
// ==========================================

export async function saveWasteReportToFirestore(report: WasteReport): Promise<void> {
  const repId = report.reportId || report.id || `REP-${Date.now()}`;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.WASTE_REPORTS, repId);
  const now = new Date().toISOString();

  if (report.imageUrl && report.imageUrl.startsWith("data:image/")) {
    saveRecordImageToLocalStorage("wasteReport", repId, report.imageUrl);
  }

  // Exclude Base64 data URLs from Firestore payload
  let validImageUrl: string | null = null;
  if (report.imageUrl && (report.imageUrl.startsWith("http://") || report.imageUrl.startsWith("https://"))) {
    if (!report.imageUrl.startsWith("data:") && report.imageUrl.length < 2000) {
      validImageUrl = report.imageUrl;
    }
  }

  const payload = {
    id: repId,
    reportId: repId,
    reporterId: report.reporterId || "anonymous-citizen",
    reporterName: report.reporterName || "Eco Citizen",
    issueType: report.issueType || "Public Waste Issue",
    description: report.description || "",
    location: report.location || "Community Ward",
    latitude: report.latitude !== undefined ? report.latitude : null,
    longitude: report.longitude !== undefined ? report.longitude : null,
    imageUrl: validImageUrl,
    priority: (report.priority || "high").toLowerCase(),
    status: "reported",
    createdAt: report.createdAt || now,
    updatedAt: report.updatedAt || now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
}

// ==========================================
// 9. ECO POINTS & TRANSACTIONS (pointsTransactions)
// ==========================================

export async function awardEcoPointsTransaction(
  userId: string,
  type: string,
  points: number,
  description: string,
  referenceId: string
): Promise<{ success: boolean; duplicate: boolean; newTotal?: number }> {
  if (!userId || !referenceId || points <= 0) {
    return { success: false, duplicate: false };
  }

  // Deterministic document ID to atomically prevent duplicate point rewards in Firestore
  const sanitizedRefId = referenceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const txDocId = `tx_${userId}_${sanitizedRefId}`;
  const txDocRef = doc(db, FIRESTORE_COLLECTIONS.POINTS_TRANSACTIONS, txDocId);

  try {
    const txSnap = await getDoc(txDocRef);
    if (txSnap.exists()) {
      console.log(`[EcoPoints] Transaction already exists for referenceId: ${referenceId}`);
      return { success: false, duplicate: true };
    }

    const nowIso = new Date().toISOString();
    const txData: DocumentData = {
      id: txDocId,
      userId,
      type,
      points,
      description,
      referenceId,
      createdAt: nowIso,
      createdAtServer: serverTimestamp(),
    };

    // 1. Save point transaction document
    await setDoc(txDocRef, txData);

    // 2. Read and update user's total ecoPoints in users collection
    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userDocRef);
    let currentTotal = 0;
    if (userSnap.exists()) {
      currentTotal = userSnap.data()?.ecoPoints || 0;
    }
    const newTotal = currentTotal + points;

    await setDoc(userDocRef, {
      ecoPoints: newTotal,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });

    // Also sync eco_points collection
    const ecoPointsRef = doc(db, FIRESTORE_COLLECTIONS.ECO_POINTS, userId);
    await setDoc(ecoPointsRef, { userId, points: newTotal, updatedAtServer: serverTimestamp() }, { merge: true });

    return { success: true, duplicate: false, newTotal };
  } catch (error) {
    console.warn("Firestore awardEcoPointsTransaction error:", error);
    return { success: false, duplicate: false };
  }
}

export function subscribeToUserEcoPoints(
  userId: string,
  callback: (points: number) => void
) {
  if (!userId) return () => {};
  try {
    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    return onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pts = typeof data.ecoPoints === "number" ? data.ecoPoints : 0;
          callback(pts);
        } else {
          callback(0);
        }
      },
      (err) => console.warn("User ecoPoints snapshot info:", err.message)
    );
  } catch (err) {
    console.warn("subscribeToUserEcoPoints fallback error:", err);
    return () => {};
  }
}

export function subscribeToPointsTransactions(
  userId: string,
  callback: (transactions: PointsTransaction[]) => void
) {
  if (!userId) return () => {};
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.POINTS_TRANSACTIONS));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: PointsTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.userId === userId || userId === "all") {
            list.push({
              id: docSnap.id,
              userId: data.userId || "",
              type: data.type || "EARN",
              points: data.points || 0,
              description: data.description || "",
              referenceId: data.referenceId || "",
              createdAt: data.createdAt || "",
            });
          }
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => console.warn("Points transactions snapshot info:", err.message)
    );
  } catch (err) {
    console.warn("subscribeToPointsTransactions fallback error:", err);
    return () => {};
  }
}

export function subscribeToWasteReports(
  callback: (reports: WasteReport[]) => void
) {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.WASTE_REPORTS));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: WasteReport[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const repId = data.reportId || docSnap.id;
          const storedLocalImage = getStoredRecordImage("wasteReport", repId);
          const displayImage = storedLocalImage || (data.imageUrl && !data.imageUrl.startsWith("data:") ? data.imageUrl : null);

          list.push({
            id: docSnap.id,
            reportId: repId,
            reporterId: data.reporterId || "anonymous-citizen",
            reporterName: data.reporterName || "Eco Citizen",
            issueType: data.issueType || "Public Waste Issue",
            description: data.description || "",
            location: data.location || "Community Ward",
            latitude: data.latitude !== undefined ? data.latitude : null,
            longitude: data.longitude !== undefined ? data.longitude : null,
            imageUrl: displayImage,
            priority: data.priority || "high",
            status: data.status || "reported",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as WasteReport);
        });
        callback(list);
      },
      (err) => console.warn("Waste reports snapshot info:", err.message)
    );
  } catch (err) {
    console.warn("subscribeToWasteReports fallback error:", err);
    return () => {};
  }
}

export async function updateWasteReportStatusInFirestore(
  reportId: string,
  status: string,
  assignedCrew?: string
): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.WASTE_REPORTS, reportId);
    const updateData: DocumentData = {
      status,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    };
    if (assignedCrew) {
      updateData.assignedCrew = assignedCrew;
    }
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.warn("Firestore updateWasteReportStatusInFirestore error:", error);
  }
}

export function subscribeToWasteRequests(
  callback: (requests: WasteRequest[]) => void
) {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.WASTE_REQUESTS));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: WasteRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const reqId = data.requestId || docSnap.id;
          const storedLocalImage = getStoredRecordImage("wasteRequest", reqId);
          const displayImage = storedLocalImage || (data.imageUrl && !data.imageUrl.startsWith("data:") ? data.imageUrl : undefined);

          list.push({
            id: docSnap.id,
            requestId: reqId,
            userId: data.userId || "anonymous-citizen",
            userName: data.userName || "Eco Citizen",
            action: data.action || "recycle",
            itemName: data.itemName || "Waste Item",
            category: data.category || "General Waste",
            location: data.location || "Community Ward",
            status: data.status || "pending",
            image: displayImage,
            imageUrl: displayImage,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as WasteRequest);
        });
        callback(list);
      },
      (err) => console.warn("Waste requests snapshot info:", err.message)
    );
  } catch (err) {
    console.warn("subscribeToWasteRequests fallback error:", err);
    return () => {};
  }
}

export async function updateWasteRequestStatusInFirestore(
  requestId: string,
  status: string
): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.WASTE_REQUESTS, requestId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Firestore updateWasteRequestStatusInFirestore error:", error);
  }
}

// ==========================================
// 10. REWARDS & REDEMPTIONS (rewards & rewardRedemptions)
// ==========================================

const INITIAL_REWARDS: Reward[] = [
  {
    id: "rew-1",
    rewardId: "rew-1",
    name: "$10 Public Transit Pass Credit",
    description: "Valid for local metro bus and light rail system rides across all city zones.",
    pointsCost: 300,
    category: "Public Transit",
    available: true,
    merchant: "City Metro Transit Authority",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
    code: "METRO-ECO-8821",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rew-2",
    rewardId: "rew-2",
    name: "20% Off Organic Zero-Waste Market",
    description: "Discount coupon on bulk grains, eco-soaps, and zero-plastic home goods.",
    pointsCost: 200,
    category: "Eco Grocery",
    available: true,
    merchant: "Green Earth Market",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
    code: "GREEN20-X892",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rew-3",
    rewardId: "rew-3",
    name: "City Botanical Gardens Day Pass",
    description: "Free single admission to municipal greenhouses, orchid gardens, and eco tours.",
    pointsCost: 250,
    category: "Parks & Recreation",
    available: true,
    merchant: "Department of Parks & Wildlife",
    image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80",
    code: "GARDEN-PASS-901",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rew-4",
    rewardId: "rew-4",
    name: "$15 Municipal Water Tax Rebate",
    description: "Direct credit applied against your monthly city water and recycling bill.",
    pointsCost: 500,
    category: "Municipal Perks",
    available: true,
    merchant: "City Financial Services",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    code: "TAX-REBATE-771A",
    createdAt: new Date().toISOString(),
  },
];

export async function seedInitialRewardsIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, FIRESTORE_COLLECTIONS.REWARDS);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return;
    }
    for (const rew of INITIAL_REWARDS) {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.REWARDS, rew.rewardId || rew.id || `rew-${Date.now()}`);
      await setDoc(docRef, {
        ...rew,
        createdAtServer: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Firestore seedInitialRewardsIfEmpty warning:", err);
  }
}

export function subscribeToRewards(callback: (rewards: Reward[]) => void) {
  try {
    const q = query(collection(db, FIRESTORE_COLLECTIONS.REWARDS));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Reward[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            rewardId: data.rewardId || docSnap.id,
            name: data.name || "Eco Reward",
            description: data.description || "",
            pointsCost: typeof data.pointsCost === "number" ? data.pointsCost : 100,
            category: data.category || "General",
            available: data.available !== false,
            merchant: data.merchant || "Eco Partner",
            image: data.image || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
            code: data.code || "ECO-REDEEM-CODE",
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        callback(list);
      },
      (err) => console.warn("Rewards snapshot info:", err.message)
    );
  } catch (err) {
    console.warn("subscribeToRewards fallback error:", err);
    return () => {};
  }
}

export async function redeemRewardTransaction(
  userId: string,
  userName: string,
  rewardId: string
): Promise<{ success: boolean; newPoints?: number; redemption?: RewardRedemption; error?: string }> {
  if (!userId || !rewardId) {
    return { success: false, error: "Authentication and reward selection are required." };
  }

  const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
  const rewardDocRef = doc(db, FIRESTORE_COLLECTIONS.REWARDS, rewardId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const rewardSnap = await transaction.get(rewardDocRef);
      if (!rewardSnap.exists()) {
        throw new Error("The selected reward was not found in Firestore.");
      }

      const rewardData = rewardSnap.data() as Reward;
      if (rewardData.available === false) {
        throw new Error("This reward is currently unavailable.");
      }

      const userSnap = await transaction.get(userDocRef);
      let currentPoints = 0;
      if (userSnap.exists()) {
        currentPoints = userSnap.data()?.ecoPoints || 0;
      }

      if (currentPoints < rewardData.pointsCost) {
        throw new Error(`Insufficient Eco Points. Required: ${rewardData.pointsCost} pts, Available: ${currentPoints} pts.`);
      }

      const newPoints = currentPoints - rewardData.pointsCost;
      const redemptionId = `RED-REG-${Date.now()}`;
      const redemptionDocRef = doc(db, FIRESTORE_COLLECTIONS.REWARD_REDEMPTIONS, redemptionId);
      const nowIso = new Date().toISOString();

      const redemptionRecord: RewardRedemption = {
        id: redemptionId,
        redemptionId,
        userId,
        userName: userName || "Eco Citizen",
        rewardId,
        rewardName: rewardData.name,
        pointsSpent: rewardData.pointsCost,
        status: "redeemed",
        createdAt: nowIso,
        code: rewardData.code || `ECO-VOUCHER-${Date.now()}`,
      };

      // Atomic mutation: update user ecoPoints balance (guarantee non-negative)
      transaction.set(userDocRef, {
        ecoPoints: newPoints,
        updatedAtServer: serverTimestamp(),
      }, { merge: true });

      // Sync eco_points collection
      transaction.set(doc(db, FIRESTORE_COLLECTIONS.ECO_POINTS, userId), {
        userId,
        points: newPoints,
        updatedAtServer: serverTimestamp(),
      }, { merge: true });

      // Create rewardRedemptions record
      transaction.set(redemptionDocRef, {
        ...redemptionRecord,
        createdAtServer: serverTimestamp(),
      });

      return { newPoints, redemptionRecord };
    });

    return {
      success: true,
      newPoints: result.newPoints,
      redemption: result.redemptionRecord,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Reward redemption transaction failed.";
    console.warn("Firestore redeemRewardTransaction error:", errMessage);
    return { success: false, error: errMessage };
  }
}

