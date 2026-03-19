import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const webhookRouter = Router();

// Webhook verify token - should match what you set in Meta App Dashboard
// This is stored in .env and used to verify Meta's subscription request
/**
 * Helper to get the token, allowing tests to run if it is not explicitly configured
 */
const getWebhookVerifyToken = () => {
    const token = process.env.WEBHOOK_VERIFY_TOKEN;
    if (!token && process.env.NODE_ENV !== 'test') {
        throw new Error('CRITICAL SECURITY ERROR: WEBHOOK_VERIFY_TOKEN environment variable is required.');
    }
    return token || 'test-token';
};

const getInstagramClientSecret = () => {
    const secret = process.env.INSTAGRAM_CLIENT_SECRET;
    if (!secret && process.env.NODE_ENV !== 'test') {
        throw new Error('CRITICAL SECURITY ERROR: INSTAGRAM_CLIENT_SECRET environment variable is required for signature verification.');
    }
    return secret || 'test-secret';
};

/**
 * GET /api/webhooks/instagram
 *
 * Meta sends a GET request to verify your webhook endpoint.
 * You must respond with the challenge parameter if the verify_token matches.
 */
webhookRouter.get('/instagram', (req: Request, res: Response) => {
    // Parse params from query string
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Instagram webhook verification request:', { mode });

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === 'subscribe' && token === getWebhookVerifyToken()) {
            // Respond with 200 OK and challenge token from the request
            console.log('Instagram webhook verified successfully');
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            console.error('Instagram webhook verification failed: token mismatch');
            res.sendStatus(403);
        }
    } else {
        console.error('Instagram webhook verification failed: missing parameters');
        res.sendStatus(400);
    }
});

/**
 * POST /api/webhooks/instagram
 *
 * Meta sends POST requests with webhook events.
 * This is where you receive real-time updates about posts, comments, messages, etc.
 */
webhookRouter.post('/instagram', async (req: Request, res: Response) => {
    // Verify HMAC signature
    const signatureHeader = req.headers['x-hub-signature-256'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const rawBody = (req as any).rawBody;

    if (!signature || !rawBody) {
        console.error('Instagram webhook verification failed: missing signature or rawBody');
        return res.status(401).send('Unauthorized');
    }

    const expectedSignature = `sha256=${crypto
        .createHmac('sha256', getInstagramClientSecret())
        .update(rawBody)
        .digest('hex')}`;

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const signatureBuffer = Buffer.from(signature, 'utf-8');

    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
        console.error('Instagram webhook verification failed: signature mismatch');
        return res.status(401).send('Unauthorized');
    }

    const body = req.body;

    console.log('Instagram webhook event received:', JSON.stringify(body, null, 2));

    // Check if this is an event from a page subscription
    if (body.object === 'instagram') {
        // Iterate over each entry (may contain multiple events)
        body.entry?.forEach((entry: any) => {
            console.log('Processing Instagram entry:', entry.id);

            // Get the webhook changes
            const changes = entry.changes || [];
            changes.forEach((change: any) => {
                const { field, value } = change;
                console.log(`Instagram ${field} event:`, value);

                // Handle different event types
                switch (field) {
                    case 'comments':
                        handleCommentEvent(value);
                        break;
                    case 'messages':
                        handleMessageEvent(value);
                        break;
                    case 'media':
                        handleMediaEvent(value);
                        break;
                    case 'mentions':
                        handleMentionEvent(value);
                        break;
                    default:
                        console.log('Unhandled Instagram webhook field:', field);
                }
            });
        });

        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Return a '404 Not Found' if event is not from Instagram
        res.sendStatus(404);
    }
});

/**
 * Handle comment events (new comment, edited comment, deleted comment)
 */
function handleCommentEvent(value: any) {
    console.log('Comment event:', {
        commentId: value.id,
        text: value.text,
        mediaId: value.media?.id,
        from: value.from,
    });

    // TODO: Store in Firebase, notify user, send to frontend via real-time listener
    // Example: Save to Firestore `socialComments` collection
    // Example: Trigger notification to user
}

/**
 * Handle message events (new message, message reply)
 */
function handleMessageEvent(value: any) {
    console.log('Message event:', {
        messageId: value.id,
        text: value.text,
        from: value.from,
        to: value.to,
    });

    // TODO: Store in Firebase, send notification
}

/**
 * Handle media events (new post created)
 */
async function handleMediaEvent(value: any) {
    console.log('Media event:', {
        mediaId: value.id,
        mediaType: value.media_type,
        caption: value.caption,
    });

    try {
        const db = getFirestore();
        const postRef = db.collection('socialPosts').doc(value.id);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            await postRef.set({
                id: value.id,
                platform: 'instagram',
                mediaType: value.media_type,
                caption: value.caption,
                publishedAt: admin.firestore.FieldValue.serverTimestamp(),
                raw: value,
            }, { merge: true });
            console.log('Successfully synced new media to socialPosts');
        } else {
            console.log('Media already exists in socialPosts, skipping');
        }
    } catch (error) {
        console.error('Error syncing media event to Firebase:', error);
    }
}

/**
 * Handle mention events (account mentioned in story/comment)
 */
function handleMentionEvent(value: any) {
    console.log('Mention event:', {
        mentionId: value.id,
        mediaId: value.media_id,
        from: value.from,
    });

    // TODO: Store mention notification in Firebase
}

export default webhookRouter;
