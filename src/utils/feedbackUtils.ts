import { db } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FeedbackItemVersion } from '../../types';

/**
 * Create a new version for a feedback item
 * Increments version number and adds to versions array
 */
export const createFeedbackItemVersion = async (
    projectId: string,
    feedbackItemId: string,
    newAssetUrl: string,
    userId: string,
    notes?: string
): Promise<number> => {
    const feedbackItemRef = doc(db, 'projects', projectId, 'feedback_items', feedbackItemId);
    const feedbackDoc = await getDoc(feedbackItemRef);

    if (!feedbackDoc.exists()) {
        throw new Error('Feedback item not found');
    }

    const currentData = feedbackDoc.data();
    const currentVersion = currentData.version || 1;
    const newVersion = currentVersion + 1;

    const newVersionEntry: FeedbackItemVersion = {
        versionNumber: newVersion,
        assetUrl: newAssetUrl,
        createdAt: serverTimestamp(),
        createdBy: userId,
        notes: notes || ''
    };

    // Get existing versions or create array with current version as v1
    const existingVersions = currentData.versions || [{
        versionNumber: 1,
        assetUrl: currentData.assetUrl,
        createdAt: currentData.createdAt || serverTimestamp(),
        createdBy: currentData.createdBy || userId,
        notes: 'Initial version'
    }];

    await updateDoc(feedbackItemRef, {
        version: newVersion,
        assetUrl: newAssetUrl,
        versions: [...existingVersions, newVersionEntry]
    });

    return newVersion;
};

/**
 * Get all versions for a feedback item
 */
export const getFeedbackItemVersions = async (
    projectId: string,
    feedbackItemId: string
): Promise<FeedbackItemVersion[]> => {
    const feedbackItemRef = doc(db, 'projects', projectId, 'feedback_items', feedbackItemId);
    const feedbackDoc = await getDoc(feedbackItemRef);

    if (!feedbackDoc.exists()) {
        return [];
    }

    const data = feedbackDoc.data();

    // If no versions array, create one from current data
    if (!data.versions) {
        return [{
            versionNumber: data.version || 1,
            assetUrl: data.assetUrl,
            createdAt: data.createdAt || serverTimestamp(),
            createdBy: data.createdBy || 'unknown',
            notes: 'Initial version'
        }];
    }

    return data.versions;
};

/**
 * Switch to a specific version
 * Updates the active assetUrl and version number
 */
export const switchToFeedbackItemVersion = async (
    projectId: string,
    feedbackItemId: string,
    versionNumber: number
): Promise<void> => {
    const feedbackItemRef = doc(db, 'projects', projectId, 'feedback_items', feedbackItemId);
    const feedbackDoc = await getDoc(feedbackItemRef);

    if (!feedbackDoc.exists()) {
        throw new Error('Feedback item not found');
    }

    const data = feedbackDoc.data();
    const versions = data.versions || [];

    const targetVersion = versions.find((v: FeedbackItemVersion) => v.versionNumber === versionNumber);
    if (!targetVersion) {
        throw new Error('Version not found');
    }

    await updateDoc(feedbackItemRef, {
        version: versionNumber,
        assetUrl: targetVersion.assetUrl
    });
};
