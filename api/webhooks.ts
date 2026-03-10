import { Router, Request, Response, NextFunction } from 'express';
import { getFirestore } from './firebaseAdmin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

const webhookRouter = Router();

// Webhook verify token - should match what you set in Meta App Dashboard
// This is stored in .env and used to verify Meta's subscription request
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

/**
 * Middleware to verify Meta Webhook signature
 */
function verifyMetaSignature(req: Request, res: Response, next: NextFunction) {
    const signatureHeader = req.headers['x-hub-signature-256'];
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!appSecret) {
        console.error('Missing INSTAGRAM_CLIENT_SECRET in environment variables');
        return res.status(500).send('Server configuration error');
    }

    if (!signatureHeader || typeof signatureHeader !== 'string') {
        console.error('Missing or invalid X-Hub-Signature-256 header');
        return res.status(401).send('Unauthorized: Missing signature');
    }

    if (!req.rawBody) {
        console.error('req.rawBody is missing. Ensure express.json is configured to expose it.');
        return res.status(500).send('Server configuration error');
    }

    const expectedSignature = `sha256=${crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex')}`;

    try {
        if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature))) {
            console.error('Signature mismatch');
            return res.status(401).send('Unauthorized: Invalid signature');
        }
    } catch (error) {
        console.error('Error during signature comparison:', error);
        return res.status(401).send('Unauthorized: Invalid signature format');
    }

    next();
}

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
        if (!WEBHOOK_VERIFY_TOKEN) {
            console.error('Missing WEBHOOK_VERIFY_TOKEN in environment variables');
            res.sendStatus(500);
        } else if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
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
webhookRouter.post('/instagram', verifyMetaSignature, async (req: Request, res: Response) => {
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
