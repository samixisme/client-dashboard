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
  increment,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { FeedbackItem, FeedbackItemComment, FeedbackStatus } from "../types";

// --- Feedback Items ---

/**
 * Fetches all feedback items for a specific project.
 */
export const getFeedbackItems = async (
  projectId: string,
): Promise<FeedbackItem[]> => {
  try {
    const q = query(
      collection(db, "projects", projectId, "feedbackItems"),
      orderBy("createdAt", "desc"),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as FeedbackItem,
    );
  } catch (error) {
    console.error("Error fetching feedback items:", error);
    throw error;
  }
};

/**
 * Creates a new feedback item in the project's feedbackItems subcollection.
 */
import { slugify } from "./slugify";

/**
 * Creates a new feedback item in the project's feedbackItems subcollection.
 */
export const addFeedbackItem = async (
  projectId: string,
  itemData: Omit<FeedbackItem, "id" | "createdAt" | "projectId">,
): Promise<string> => {
  try {
    const slug = slugify(itemData.name);
    // Ensure uniqueness or handle overwrites?
    // Using simple slug for now as per 'Projects' pattern. 
    // If collision, it will overwrite, which might be intended or acceptable for now given strict naming.
    // Ideally we'd append a suffix if exists, but keeping consistency with existing codebase patterns first.
    
    const docRef = doc(db, "projects", projectId, "feedbackItems", slug);
    
    await setDoc(docRef, {
        ...itemData,
        projectId,
        createdAt: serverTimestamp(),
        commentCount: 0,
    });
    return slug;
  } catch (error) {
    console.error("Error adding feedback item:", error);
    throw error;
  }
};

// --- Activities ---

/**
 * Logs an activity to the global activities collection (or project subcollection if preferred, but usually global for easy querying)
 * We will use a top-level 'activities' collection for simplicity based on DataContext usage.
 */
export const logActivity = async (
  projectId: string,
  objectId: string,
  objectType: "feedback_item" | "comment",
  description: string,
  userId: string,
  feedbackItemId?: string,
  sourceType?: 'mockup' | 'website' | 'video',
): Promise<void> => {
  try {
    // Write to top-level activities collection for easy project-wide querying
    await addDoc(collection(db, "activities"), {
      projectId,
      objectId,
      objectType,
      description,
      userId,
      feedbackItemId: feedbackItemId || objectId, // For routing
      sourceType: sourceType || 'mockup', // mockup/website/video
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

/**
 * Subscribes to activities for a specific object (e.g. feedback item).
 */
export const subscribeToActivities = (
  projectId: string,
  objectId: string,
  callback: (activities: any[]) => void,
) => {
  const q = query(
    collection(db, "projects", projectId, "activities"),
    where("objectId", "==", objectId),
    orderBy("timestamp", "desc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const activities = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(activities);
    },
    (error) => {
      console.error("Error subscribing to activities:", error);
    },
  );
};

/**
 * Updates the status of a specific feedback item.
 */
export const updateFeedbackItemStatus = async (
  projectId: string,
  itemId: string,
  status: FeedbackStatus,
  userId?: string, // Optional user ID for logging
): Promise<void> => {
  try {
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, { status });

    if (userId) {
      await logActivity(
        projectId,
        itemId,
        "feedback_item",
        `changed status to ${status}`,
        userId,
      );
    }
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
  pages: { id: string; name: string; url: string; approved?: boolean }[],
): Promise<void> => {
  try {
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, { pages });
  } catch (error) {
    console.error("Error updating feedback item pages:", error);
    throw error;
  }
};

/**
 * Updates the images list of a specific mockup feedback item.
 */
export const updateFeedbackItemImages = async (
  projectId: string,
  itemId: string,
  images: { id: string; name: string; url: string; approved?: boolean }[],
): Promise<void> => {
  try {
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, { images });
  } catch (error) {
    console.error("Error updating feedback item images:", error);
    throw error;
  }
};

/**
 * Updates the videos list of a specific video feedback item.
 */
export const updateFeedbackItemVideos = async (
  projectId: string,
  itemId: string,
  videos: { id: string; name: string; url: string; approved?: boolean }[],
): Promise<void> => {
  try {
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, { videos });
  } catch (error) {
    console.error("Error updating feedback item videos:", error);
    throw error;
  }
};

/**
 * Fetches a single feedback item.
 */
export const getFeedbackItem = async (
  projectId: string,
  itemId: string,
): Promise<FeedbackItem | null> => {
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
};

// --- Comments ---

/**
 * Subscribes to comments for a specific feedback item.
 */
export const subscribeToComments = (
  projectId: string,
  itemId: string,
  callback: (comments: FeedbackItemComment[]) => void,
) => {
  const q = query(
    collection(db, "projects", projectId, "feedbackItems", itemId, "comments"),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const comments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          feedbackItemId: itemId, // Inject itemId to ensure delete works
          ...data,
        } as FeedbackItemComment;
      });
      callback(comments);
    },
    (error) => {
      console.error("Error subscribing to comments:", error);
    },
  );
};

/**
 * Adds a new comment to the feedback item's comments subcollection.
 */
export const addComment = async (
  projectId: string,
  itemId: string,
  commentData: Omit<
    FeedbackItemComment,
    "id" | "createdAt" | "feedbackItemId" | "resolved"
  >,
): Promise<string> => {
  try {
    // Sanitize data to remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(commentData).filter(([_, v]) => v !== undefined),
    );

    // 1. Add the comment
    const commentRef = await addDoc(
      collection(
        db,
        "projects",
        projectId,
        "feedbackItems",
        itemId,
        "comments",
      ),
      {
        ...cleanData,
        feedbackItemId: itemId,
        createdAt: serverTimestamp(),
        resolved: false,
      },
    );

    // 2. Update the comment count on the parent item
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, {
      commentCount: increment(1),
    });

    // 3. Log activity for this comment
    await logActivity(
      projectId,
      commentRef.id,
      'comment',
      `added a comment: "${(commentData.commentText || '').substring(0, 50)}${(commentData.commentText || '').length > 50 ? '...' : ''}"`,
      commentData.authorId
    );

    // 4. Sync to task if dueDate is present
    if ((commentData as any).dueDate) {
      await syncCommentToTask(
        commentRef.id,
        commentData.commentText || '',
        (commentData as any).dueDate,
        commentData.authorId,
        projectId,
        itemId
      );
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
  updates: Partial<FeedbackItemComment>,
): Promise<void> => {
  try {
    const commentRef = doc(
      db,
      "projects",
      projectId,
      "feedbackItems",
      itemId,
      "comments",
      commentId,
    );
    await updateDoc(commentRef, updates);
  } catch (error) {
    console.error("Error updating comment:", error);
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
  currentStatus: boolean,
  userId?: string,
): Promise<void> => {
  try {
    const commentRef = doc(
      db,
      "projects",
      projectId,
      "feedbackItems",
      itemId,
      "comments",
      commentId,
    );
    await updateDoc(commentRef, { resolved: !currentStatus });

    // Log activity for resolve/unresolve
    if (userId) {
      await logActivity(
        projectId,
        commentId,
        'comment',
        !currentStatus ? 'resolved a comment' : 'reopened a comment',
        userId,
      );
    }
  } catch (error) {
    console.error("Error toggling comment resolved status:", error);
    throw error;
  }
};

/**
 * Deletes a comment.
 */
export const deleteComment = async (
  projectId: string,
  itemId: string,
  commentId: string,
  userId?: string,
): Promise<void> => {
  try {
    console.log(
      "Deleting comment:",
      commentId,
      "from item:",
      itemId,
      "in project:",
      projectId,
    );
    const commentRef = doc(
      db,
      "projects",
      projectId,
      "feedbackItems",
      itemId,
      "comments",
      commentId,
    );
    await deleteDoc(commentRef);

    // Update the comment count on the parent item
    const itemRef = doc(db, "projects", projectId, "feedbackItems", itemId);
    await updateDoc(itemRef, {
      commentCount: increment(-1),
    });

    // Delete any linked task
    const tasksQuery = query(
      collection(db, "tasks"),
      where("sourceCommentId", "==", commentId),
    );
    const linkedTasks = await getDocs(tasksQuery);
    for (const taskDoc of linkedTasks.docs) {
      await deleteDoc(doc(db, "tasks", taskDoc.id));
    }

    // Log activity for deletion
    if (userId) {
      await logActivity(
        projectId,
        commentId,
        'comment',
        'deleted a comment',
        userId,
      );
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

/**
 * Creates a calendar event linked to a feedback comment.
 */
export const syncCommentToCalendar = async (
  commentId: string,
  commentText: string,
  dueDate: string,
  authorId: string,
  projectId: string,
): Promise<void> => {
  try {
    await addDoc(collection(db, "events"), {
      title: `Feedback: ${commentText.substring(0, 30)}...`,
      startDate: dueDate,
      endDate: dueDate, // Assuming 1 hour or instant
      type: "comment",
      sourceId: commentId,
      userId: authorId,
      projectId: projectId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error syncing to calendar:", error);
  }
};

/**
 * Syncs a comment with a due date to the tasks collection.
 * Creates a new task if none exists, updates if already linked, removes if due date is cleared.
 */
export const syncCommentToTask = async (
  commentId: string,
  commentText: string,
  dueDate: string | null | undefined,
  authorId: string,
  projectId: string,
  feedbackItemId: string,
  feedbackItemName?: string,
  feedbackItemType?: 'mockup' | 'website' | 'video',
): Promise<void> => {
  try {
    // Check if a task already exists for this comment
    const tasksQuery = query(
      collection(db, "tasks"),
      where("sourceCommentId", "==", commentId),
    );
    const existingTasks = await getDocs(tasksQuery);

    if (dueDate) {
      // Create or update task
      const taskData = {
        title: `[Feedback] ${commentText.substring(0, 50)}${commentText.length > 50 ? "..." : ""}`,
        description: commentText,
        dueDate: dueDate,
        status: "pending" as const,
        priority: "medium" as const,
        creatorId: authorId, // Changed from assigneeId to creatorId
        projectId: projectId,
        sourceCommentId: commentId,
        sourceFeedbackItemId: feedbackItemId,
        sourceFeedbackItemName: feedbackItemName || "Feedback Item",
        sourceType: feedbackItemType || 'mockup', // Store the actual type (mockup/video/website)
        updatedAt: serverTimestamp(),
      };

      if (existingTasks.empty) {
        // Create new task
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          createdAt: serverTimestamp(),
        });
      } else {
        // Update existing task
        const taskDoc = existingTasks.docs[0];
        await updateDoc(doc(db, "tasks", taskDoc.id), taskData);
      }
    } else {
      // Due date cleared - remove linked task
      if (!existingTasks.empty) {
        const taskDoc = existingTasks.docs[0];
        await deleteDoc(doc(db, "tasks", taskDoc.id));
      }
    }
  } catch (error) {
    console.error("Error syncing comment to task:", error);
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
      orderBy("createdAt", "desc"),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as FeedbackItem,
    );
  } catch (error) {
    console.error("Error fetching all feedback items:", error);
    throw error;
  }
};

/**
 * Cleans up orphaned tasks and activities for a project.
 * Call this to remove stale data that doesn't correspond to actual comments.
 */
export const cleanupOrphanedData = async (projectId: string): Promise<{ tasksDeleted: number; activitiesDeleted: number }> => {
  let tasksDeleted = 0;
  let activitiesDeleted = 0;

  try {
    // Delete all tasks for this project
    const tasksQuery = query(
      collection(db, "tasks"),
      where("projectId", "==", projectId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    for (const taskDoc of tasksSnapshot.docs) {
      await deleteDoc(doc(db, "tasks", taskDoc.id));
      tasksDeleted++;
    }

    // Delete all activities for this project
    const activitiesQuery = query(
      collection(db, "activities"),
      where("projectId", "==", projectId)
    );
    const activitiesSnapshot = await getDocs(activitiesQuery);
    for (const activityDoc of activitiesSnapshot.docs) {
      await deleteDoc(doc(db, "activities", activityDoc.id));
      activitiesDeleted++;
    }

    console.log(`Cleanup complete: ${tasksDeleted} tasks and ${activitiesDeleted} activities deleted for project ${projectId}`);
    return { tasksDeleted, activitiesDeleted };
  } catch (error) {
    console.error("Error cleaning up orphaned data:", error);
    throw error;
  }
};
