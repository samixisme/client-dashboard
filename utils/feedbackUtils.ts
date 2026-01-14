
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  collectionGroup
} from "firebase/firestore";
import { db } from "./firebase";
import { FeedbackItem, FeedbackItemComment, FeedbackStatus } from "../types";

// --- Feedback Items ---

/**
 * Fetches all feedback items for a specific project.
 */
export const getFeedbackItems = async (projectId: string): Promise<FeedbackItem[]> => {
  try {
    const q = query(
      collection(db, "projects", projectId, "feedbackItems"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FeedbackItem));
  } catch (error) {
    console.error("Error fetching feedback items:", error);
    throw error;
  }
};

/**
 * Creates a new feedback item in the project's feedbackItems subcollection.
 */
export const addFeedbackItem = async (
  projectId: string, 
  itemData: Omit<FeedbackItem, "id" | "createdAt" | "projectId">
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "projects", projectId, "feedbackItems"), {
      ...itemData,
      projectId,
      createdAt: serverTimestamp(),
      commentCount: 0
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding feedback item:", error);
    throw error;
  }
};

/**
 * Updates the status of a specific feedback item.
 */
export const updateFeedbackItemStatus = async (
  projectId: string, 
  itemId: string, 
  status: FeedbackStatus
): Promise<void> => {
  try {
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, { status });
  } catch (error) {
    console.error("Error updating feedback item status:", error);
    throw error;
  }
};

/**
 * Fetches a single feedback item.
 */
export const getFeedbackItem = async (projectId: string, itemId: string): Promise<FeedbackItem | null> => {
  try {
    const docRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FeedbackItem;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting feedback item:", error);
    throw error;
  }
}


// --- Comments ---

/**
 * Subscribes to comments for a specific feedback item.
 */
export const subscribeToComments = (
  projectId: string, 
  itemId: string, 
  callback: (comments: FeedbackItemComment[]) => void
) => {
  const q = query(
    collection(db, "projects", projectId, "feedbackItems", itemId, "comments"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FeedbackItemComment));
    callback(comments);
  }, (error) => {
    console.error("Error subscribing to comments:", error);
  });
};

/**
 * Adds a new comment to the feedback item's comments subcollection.
 */
export const addComment = async (
  projectId: string, 
  itemId: string, 
  commentData: Omit<FeedbackItemComment, "id" | "createdAt" | "feedbackItemId" | "resolved">
): Promise<string> => {
  try {
    // 1. Add the comment
    const commentRef = await addDoc(collection(db, "projects", projectId, "feedbackItems", itemId, "comments"), {
      ...commentData,
      feedbackItemId: itemId,
      createdAt: serverTimestamp(),
      resolved: false
    });

    // 2. Update the comment count on the parent item (optional but recommended for performance)
    // Note: In a real production app, this should ideally be a cloud function to ensure atomicity
    // or use a transaction. For this scope, a direct update is acceptable.
    // We'll skip the count update for now to keep it simple, or we can implement it if needed.
    
    return commentRef.id;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

/**
 * Resolves or unresolves a comment.
 */
export const toggleCommentResolved = async (
  projectId: string,
  itemId: string,
  commentId: string,
  currentStatus: boolean
): Promise<void> => {
  try {
     const commentRef = doc(db, "projects", projectId, "feedbackItems", itemId, "comments", commentId);
     await updateDoc(commentRef, { resolved: !currentStatus });
  } catch (error) {
     console.error("Error toggling comment resolved status:", error);
     throw error;
  }
}

// --- Global Queries (Admin) ---

/**
 * Fetches all feedback items across all projects using a Collection Group Query.
 */
export const getAllFeedbackItems = async (): Promise<FeedbackItem[]> => {
  try {
    const q = query(
      collectionGroup(db, "feedbackItems"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FeedbackItem));
  } catch (error) {
    console.error("Error fetching all feedback items:", error);
    throw error;
  }
};
