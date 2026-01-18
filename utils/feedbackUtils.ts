
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  collectionGroup,
  increment
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
 * Updates the pages list of a specific website feedback item.
 */
export const updateFeedbackItemPages = async (
  projectId: string,
  itemId: string,
  pages: {id: string, name: string, url: string}[]
): Promise<void> => {
  try {
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, { pages });
  } catch (error) {
    console.error("Error updating feedback item pages:", error);
    throw error;
  }
}

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
    const comments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            feedbackItemId: itemId, // Inject itemId to ensure delete works
            ...data,
        } as FeedbackItemComment;
    });
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

    // 2. Update the comment count on the parent item
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, {
        commentCount: increment(1)
    });
    
    // 3. Sync to calendar if dueDate is present
    if (commentData.pageUrl && commentData.commentText) { // Reuse type checking if possible
        // Note: For now we handle calendar sync separately or implicitly here?
        // Let's rely on explicit calls or check for dueDate.
        // The type 'commentData' might not strict have 'dueDate' yet in Omit<...>.
        // Let's assume the caller handles calendar sync or we add it here.
    }
    
    return commentRef.id;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

/**
 * Updates a comment (e.g. adding reply, changing status, due date)
 */
export const updateComment = async (
    projectId: string,
    itemId: string,
    commentId: string,
    updates: Partial<FeedbackItemComment>
): Promise<void> => {
    try {
        const commentRef = doc(db, "projects", projectId, "feedbackItems", itemId, "comments", commentId);
        await updateDoc(commentRef, updates);
    } catch (error) {
        console.error("Error updating comment:", error);
        throw error;
    }
}


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

/**
 * Deletes a comment.
 */
export const deleteComment = async (
  projectId: string,
  itemId: string,
  commentId: string
): Promise<void> => {
  try {
     console.log("Deleting comment:", commentId, "from item:", itemId, "in project:", projectId);
     const commentRef = doc(db, "projects", projectId, "feedbackItems", itemId, "comments", commentId);
     await deleteDoc(commentRef);
     
     // Update the comment count on the parent item
     const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
     await updateDoc(itemRef, {
         commentCount: increment(-1)
     });
  } catch (error) {
     console.error("Error deleting comment:", error);
     throw error;
  }
}

/**
 * Creates a calendar event linked to a feedback comment.
 */
export const syncCommentToCalendar = async (
    commentId: string, 
    commentText: string, 
    dueDate: string, 
    authorId: string,
    projectId: string
): Promise<void> => {
    try {
        await addDoc(collection(db, "events"), {
            title: `Feedback: ${commentText.substring(0, 30)}...`,
            startDate: dueDate,
            endDate: dueDate, // Assuming 1 hour or instant
            type: 'comment',
            sourceId: commentId,
            userId: authorId,
            projectId: projectId,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error syncing to calendar:", error);
    }
};

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
