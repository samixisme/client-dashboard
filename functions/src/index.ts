import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Webhook verify token from environment variables (new method)
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my-super-secret-webhook-token-12345';

// Instagram OAuth credentials
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID || '';
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET || '';
const INSTAGRAM_REDIRECT_URI = 'https://us-central1-client-dashboard-v2.cloudfunctions.net/instagramOAuthCallback';

/**
 * Instagram Webhook Endpoint
 *
 * Permanent URL: https://us-central1-client-dashboard-v2.cloudfunctions.net/instagramWebhook
 *
 * This function handles:
 * - GET requests for webhook verification (from Meta)
 * - POST requests with webhook events (comments, messages, media, mentions)
 */
export const instagramWebhook = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');

  // ============================================================================
  // GET - Webhook Verification
  // ============================================================================
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    console.log('Instagram webhook verification request:', { mode, token });

    if (mode && token) {
      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ Instagram webhook verified successfully');
        res.status(200).send(challenge);
        return;
      } else {
        console.error('❌ Instagram webhook verification failed: token mismatch');
        res.sendStatus(403);
        return;
      }
    } else {
      console.error('❌ Instagram webhook verification failed: missing parameters');
      res.sendStatus(400);
      return;
    }
  }

  // ============================================================================
  // POST - Webhook Events
  // ============================================================================
  if (req.method === 'POST') {
    const body = req.body;

    console.log('📩 Instagram webhook event received:', JSON.stringify(body, null, 2));

    // Check if this is an Instagram event
    if (body.object === 'instagram') {
      try {
        // Process each entry (may contain multiple events)
        const promises = (body.entry || []).map(async (entry: any) => {
          console.log('Processing Instagram entry:', entry.id);

          // Process each change in the entry
          const changePromises = (entry.changes || []).map(async (change: any) => {
            const { field, value } = change;
            console.log(`Instagram ${field} event:`, value);

            // Handle different event types
            switch (field) {
              case 'comments':
                await handleCommentEvent(value);
                break;
              case 'messages':
                await handleMessageEvent(value);
                break;
              case 'media':
                await handleMediaEvent(value);
                break;
              case 'mentions':
                await handleMentionEvent(value);
                break;
              default:
                console.log('⚠️ Unhandled Instagram webhook field:', field);
            }
          });

          await Promise.all(changePromises);
        });

        await Promise.all(promises);

        // Return 200 OK to acknowledge receipt
        res.status(200).send('EVENT_RECEIVED');
      } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).send('ERROR_PROCESSING_EVENT');
      }
    } else {
      console.log('⚠️ Non-Instagram event received');
      res.sendStatus(404);
    }
    return;
  }

  // Unsupported method
  res.sendStatus(405);
});

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle comment events (new comment, edited comment, deleted comment)
 */
async function handleCommentEvent(value: any) {
  console.log('💬 Comment event:', {
    commentId: value.id,
    text: value.text,
    mediaId: value.media?.id,
    from: value.from,
  });

  try {
    // Store comment in Firestore
    await db.collection('socialComments').doc(value.id).set({
      id: value.id,
      platform: 'instagram',
      text: value.text,
      mediaId: value.media?.id,
      from: value.from,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      raw: value,
    }, { merge: true });

    console.log('✅ Comment stored in Firestore');
  } catch (error) {
    console.error('❌ Error storing comment:', error);
  }
}

/**
 * Handle message events (new message, message reply)
 */
async function handleMessageEvent(value: any) {
  console.log('✉️ Message event:', {
    messageId: value.id,
    text: value.text,
    from: value.from,
    to: value.to,
  });

  try {
    // Store message in Firestore
    await db.collection('socialMessages').doc(value.id).set({
      id: value.id,
      platform: 'instagram',
      text: value.text,
      from: value.from,
      to: value.to,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      raw: value,
    }, { merge: true });

    console.log('✅ Message stored in Firestore');
  } catch (error) {
    console.error('❌ Error storing message:', error);
  }
}

/**
 * Handle media events (new post created)
 */
async function handleMediaEvent(value: any) {
  console.log('📸 Media event:', {
    mediaId: value.id,
    mediaType: value.media_type,
    caption: value.caption,
  });

  try {
    // Update or create post in socialPosts collection
    await db.collection('socialPosts').doc(value.id).set({
      id: value.id,
      platform: 'instagram',
      mediaType: value.media_type,
      caption: value.caption,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: value,
    }, { merge: true });

    console.log('✅ Media event stored in Firestore');
  } catch (error) {
    console.error('❌ Error storing media event:', error);
  }
}

/**
 * Handle mention events (account mentioned in story/comment)
 */
async function handleMentionEvent(value: any) {
  console.log('@️ Mention event:', {
    mentionId: value.id,
    mediaId: value.media_id,
    from: value.from,
  });

  try {
    // Store mention notification
    await db.collection('socialMentions').doc(value.id).set({
      id: value.id,
      platform: 'instagram',
      mediaId: value.media_id,
      from: value.from,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      raw: value,
    }, { merge: true });

    console.log('✅ Mention stored in Firestore');
  } catch (error) {
    console.error('❌ Error storing mention:', error);
  }
}

// ============================================================================
// Instagram OAuth Callback
// ============================================================================

/**
 * Instagram OAuth Callback Endpoint
 *
 * Permanent URL: https://us-central1-client-dashboard-v2.cloudfunctions.net/instagramOAuthCallback
 *
 * This function handles the OAuth redirect from Instagram after user authorization.
 * It exchanges the authorization code for an access token and stores it in Firestore.
 */
export const instagramOAuthCallback = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');

  try {
    const { code, state, error, error_description } = req.query;

    console.log('Instagram OAuth callback received:', { code: !!code, state, error });

    // Check for errors from Instagram
    if (error) {
      console.error('Instagram OAuth error:', error, error_description);
      return res.redirect(`http://localhost:3000/#/social-media?error=${error}&message=${error_description || 'Authorization failed'}`);
    }

    // Check if code is present
    if (!code) {
      console.error('No authorization code received');
      return res.redirect('http://localhost:3000/#/social-media?error=no_code&message=No authorization code received');
    }

    // Exchange authorization code for access token (Instagram API with Instagram Login uses Facebook OAuth)
    const tokenResponse = await fetch('https://graph.facebook.com/v22.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_CLIENT_ID,
        client_secret: INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: INSTAGRAM_REDIRECT_URI,
        code: code as string,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return res.redirect(`http://localhost:3000/#/social-media?error=token_exchange_failed&message=${errorData.error_message || 'Failed to exchange token'}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Access token received:', { user_id: tokenData.user_id });

    // Get long-lived access token (60 days instead of 1 hour)
    const longLivedTokenResponse = await fetch(
      `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${INSTAGRAM_CLIENT_SECRET}&` +
      `access_token=${tokenData.access_token}`
    );

    const longLivedTokenData = await longLivedTokenResponse.json();
    console.log('Long-lived token received:', { expires_in: longLivedTokenData.expires_in });

    // Get user profile information
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${longLivedTokenData.access_token}`
    );
    const profileData = await profileResponse.json();

    // Store account information in Firestore
    const accountData = {
      platform: 'instagram',
      platformUserId: profileData.id,
      username: profileData.username,
      accountType: profileData.account_type,
      accessToken: longLivedTokenData.access_token,
      tokenExpiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + (longLivedTokenData.expires_in * 1000))
      ),
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRefreshed: admin.firestore.FieldValue.serverTimestamp(),
      metrics: {
        followers: 0,
        following: 0,
        posts: profileData.media_count || 0,
      },
      isActive: true,
    };

    await db.collection('socialAccounts').doc(profileData.id).set(accountData, { merge: true });

    console.log('✅ Instagram account connected successfully:', profileData.username);

    // Redirect back to social media page with success
    res.redirect('http://localhost:3000/#/social-media?success=true&platform=instagram&username=' + profileData.username);
  } catch (error) {
    console.error('❌ Error in OAuth callback:', error);
    res.redirect('http://localhost:3000/#/social-media?error=server_error&message=Internal server error');
  }
});

// ============================================================================
// Instagram Deauthorize Callback (GDPR Compliance)
// ============================================================================

/**
 * Instagram Deauthorize Callback Endpoint
 *
 * Permanent URL: https://us-central1-client-dashboard-v2.cloudfunctions.net/instagramDeauthorizeCallback
 *
 * This function is called when a user removes your app from their Instagram settings.
 * Required for GDPR compliance - must clean up user data and revoke access tokens.
 */
export const instagramDeauthorizeCallback = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    res.sendStatus(405);
    return;
  }

  try {
    const { signed_request } = req.body;

    console.log('🚫 Instagram deauthorization request received');

    // Parse the signed request (Meta sends a base64 encoded signature + payload)
    if (!signed_request) {
      console.error('No signed_request in deauthorization callback');
      res.status(400).json({ error: 'Missing signed_request' });
      return;
    }

    // Decode the signed request
    const [_encodedSig, payload] = signed_request.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));

    console.log('Deauthorization data:', { user_id: data.user_id, algorithm: data.algorithm });

    const platformUserId = data.user_id;

    // Find and deactivate the account in Firestore
    const accountSnapshot = await db.collection('socialAccounts')
      .where('platform', '==', 'instagram')
      .where('platformUserId', '==', platformUserId)
      .limit(1)
      .get();

    if (!accountSnapshot.empty) {
      const accountDoc = accountSnapshot.docs[0];

      // Mark account as deactivated and remove access token
      await accountDoc.ref.update({
        isActive: false,
        accessToken: admin.firestore.FieldValue.delete(),
        deauthorizedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Instagram account deauthorized:', platformUserId);
    } else {
      console.log('⚠️ No account found for user:', platformUserId);
    }

    // Respond with confirmation URL (Meta requires this format)
    const confirmationCode = `${platformUserId}_${Date.now()}`;
    const statusUrl = `https://us-central1-client-dashboard-v2.cloudfunctions.net/instagramDeauthorizeCallback?status=${confirmationCode}`;

    res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error('❌ Error in deauthorization callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Instagram Data Deletion Callback (GDPR Compliance)
// ============================================================================

/**
 * Instagram Data Deletion Request Endpoint
 *
 * Permanent URL: https://us-central1-client-dashboard-v2.cloudfunctions.net/instagramDataDeletionCallback
 *
 * This function is called when a user requests data deletion (GDPR right to be forgotten).
 * Required for GDPR compliance - must delete ALL user data from your systems.
 */
export const instagramDataDeletionCallback = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    res.sendStatus(405);
    return;
  }

  try {
    const { signed_request } = req.body;

    console.log('🗑️ Instagram data deletion request received');

    // Parse the signed request (Meta sends a base64 encoded signature + payload)
    if (!signed_request) {
      console.error('No signed_request in data deletion callback');
      res.status(400).json({ error: 'Missing signed_request' });
      return;
    }

    // Decode the signed request
    const [_encodedSig, payload] = signed_request.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));

    console.log('Data deletion request:', { user_id: data.user_id, algorithm: data.algorithm });

    const platformUserId = data.user_id;

    // Delete all user data from Firestore (GDPR compliance)
    const batch = db.batch();
    let deletionCount = 0;

    // 1. Delete social account
    const accountSnapshot = await db.collection('socialAccounts')
      .where('platform', '==', 'instagram')
      .where('platformUserId', '==', platformUserId)
      .get();

    accountSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 2. Delete comments from this user
    const commentsSnapshot = await db.collection('socialComments')
      .where('platform', '==', 'instagram')
      .where('from.id', '==', platformUserId)
      .get();

    commentsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 3. Delete messages from this user
    const messagesSnapshot = await db.collection('socialMessages')
      .where('platform', '==', 'instagram')
      .where('from.id', '==', platformUserId)
      .get();

    messagesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 4. Delete posts from this user
    const postsSnapshot = await db.collection('socialPosts')
      .where('platform', '==', 'instagram')
      .where('platformUserId', '==', platformUserId)
      .get();

    postsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 5. Delete mentions
    const mentionsSnapshot = await db.collection('socialMentions')
      .where('platform', '==', 'instagram')
      .where('from.id', '==', platformUserId)
      .get();

    mentionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // Commit the batch deletion
    await batch.commit();

    console.log(`✅ Deleted ${deletionCount} records for user ${platformUserId}`);

    // Respond with confirmation URL (Meta requires this format)
    const confirmationCode = `deletion_${platformUserId}_${Date.now()}`;
    const statusUrl = `https://us-central1-client-dashboard-v2.cloudfunctions.net/instagramDataDeletionCallback?status=${confirmationCode}`;

    res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error('❌ Error in data deletion callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Facebook OAuth Credentials
// ============================================================================

const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || '';
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || '';
const FACEBOOK_REDIRECT_URI = 'https://us-central1-client-dashboard-v2.cloudfunctions.net/facebookOAuthCallback';

// ============================================================================
// Facebook OAuth Callback
// ============================================================================

/**
 * Facebook OAuth Callback Endpoint
 *
 * Permanent URL: https://us-central1-client-dashboard-v2.cloudfunctions.net/facebookOAuthCallback
 *
 * This function handles the OAuth redirect from Facebook after user authorization.
 * It exchanges the authorization code for a long-lived access token and stores it in Firestore.
 */
export const facebookOAuthCallback = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');

  try {
    const { code, state, error, error_description } = req.query;

    console.log('Facebook OAuth callback received:', { code: !!code, state, error });

    // Check for errors from Facebook
    if (error) {
      console.error('Facebook OAuth error:', error, error_description);
      return res.redirect(`http://localhost:3000/#/social-media?error=${error}&message=${error_description || 'Authorization failed'}`);
    }

    // Check if code is present
    if (!code) {
      console.error('No authorization code received');
      return res.redirect('http://localhost:3000/#/social-media?error=no_code&message=No authorization code received');
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      `client_id=${FACEBOOK_CLIENT_ID}&` +
      `client_secret=${FACEBOOK_CLIENT_SECRET}&` +
      `code=${code}&` +
      `redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}`
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return res.redirect(`http://localhost:3000/#/social-media?error=token_exchange_failed&message=${errorData.error?.message || 'Failed to exchange token'}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Access token received');

    // Exchange for long-lived token (60 days instead of 1 hour)
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${FACEBOOK_CLIENT_ID}&` +
      `client_secret=${FACEBOOK_CLIENT_SECRET}&` +
      `fb_exchange_token=${tokenData.access_token}`
    );

    const longLivedTokenData = await longLivedTokenResponse.json();
    console.log('Long-lived token received:', { expires_in: longLivedTokenData.expires_in });

    // Get user profile information
    const profileResponse = await fetch(
      `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${longLivedTokenData.access_token}`
    );
    const profileData = await profileResponse.json();

    // Store account information in Firestore
    const accountData = {
      platform: 'facebook',
      platformUserId: profileData.id,
      username: profileData.name,
      displayName: profileData.name,
      accessToken: longLivedTokenData.access_token,
      tokenExpiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + (longLivedTokenData.expires_in * 1000))
      ),
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRefreshed: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      isConnected: true,
    };

    await db.collection('socialAccounts').doc(`facebook-${profileData.id}`).set(accountData, { merge: true });

    console.log('✅ Facebook account connected successfully:', profileData.name);

    // Redirect back to social media page with success
    res.redirect('http://localhost:3000/#/social-media?success=true&platform=facebook&username=' + encodeURIComponent(profileData.name));
  } catch (error) {
    console.error('❌ Error in Facebook OAuth callback:', error);
    res.redirect('http://localhost:3000/#/social-media?error=server_error&message=Internal server error');
  }
});

// ============================================================================
// Facebook Deauthorize Callback (GDPR Compliance)
// ============================================================================

/**
 * Facebook Deauthorize Callback Endpoint
 *
 * Permanent URL: https://us-central1-client-dashboard-v2.cloudfunctions.net/facebookDeauthorizeCallback
 *
 * This function is called when a user deauthorizes your app from Facebook.
 * Required for GDPR compliance.
 */
export const facebookDeauthorizeCallback = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    res.sendStatus(405);
    return;
  }

  try {
    const { signed_request } = req.body;

    console.log('🔓 Facebook deauthorization request received');

    if (!signed_request) {
      console.error('No signed_request in deauthorization callback');
      res.status(400).json({ error: 'Missing signed_request' });
      return;
    }

    // Decode the signed request
    const [_encodedSig, payload] = signed_request.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));

    console.log('Deauthorization data:', { user_id: data.user_id });

    const platformUserId = data.user_id;

    // Find and deactivate the account in Firestore
    const accountSnapshot = await db.collection('socialAccounts')
      .where('platform', '==', 'facebook')
      .where('platformUserId', '==', platformUserId)
      .limit(1)
      .get();

    if (!accountSnapshot.empty) {
      const accountDoc = accountSnapshot.docs[0];

      // Mark account as deactivated and remove access token
      await accountDoc.ref.update({
        isActive: false,
        isConnected: false,
        accessToken: admin.firestore.FieldValue.delete(),
        deauthorizedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Facebook account deauthorized:', platformUserId);
    } else {
      console.log('⚠️ No account found for user:', platformUserId);
    }

    // Respond with confirmation URL
    const confirmationCode = `${platformUserId}_${Date.now()}`;
    const statusUrl = `https://us-central1-client-dashboard-v2.cloudfunctions.net/facebookDeauthorizeCallback?status=${confirmationCode}`;

    res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error('❌ Error in Facebook deauthorization callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Facebook Data Deletion Callback (GDPR Compliance)
// ============================================================================

/**
 * Facebook Data Deletion Request Endpoint
 *
 * Permanent URL: https://us-central1-client-dashboard-v2.cloudfunctions.net/facebookDataDeletionCallback
 *
 * This function is called when a user requests data deletion (GDPR right to be forgotten).
 * Required for GDPR compliance - must delete ALL user data from your systems.
 */
export const facebookDataDeletionCallback = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    res.sendStatus(405);
    return;
  }

  try {
    const { signed_request } = req.body;

    console.log('🗑️ Facebook data deletion request received');

    if (!signed_request) {
      console.error('No signed_request in data deletion callback');
      res.status(400).json({ error: 'Missing signed_request' });
      return;
    }

    // Decode the signed request
    const [_encodedSig, payload] = signed_request.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));

    console.log('Data deletion request:', { user_id: data.user_id });

    const platformUserId = data.user_id;

    // Delete all user data from Firestore (GDPR compliance)
    const batch = db.batch();
    let deletionCount = 0;

    // 1. Delete social account
    const accountSnapshot = await db.collection('socialAccounts')
      .where('platform', '==', 'facebook')
      .where('platformUserId', '==', platformUserId)
      .get();

    accountSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 2. Delete comments from this user
    const commentsSnapshot = await db.collection('socialComments')
      .where('platform', '==', 'facebook')
      .where('from.id', '==', platformUserId)
      .get();

    commentsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 3. Delete messages from this user
    const messagesSnapshot = await db.collection('socialMessages')
      .where('platform', '==', 'facebook')
      .where('from.id', '==', platformUserId)
      .get();

    messagesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 4. Delete posts from this user
    const postsSnapshot = await db.collection('socialPosts')
      .where('platform', '==', 'facebook')
      .where('platformUserId', '==', platformUserId)
      .get();

    postsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // 5. Delete mentions
    const mentionsSnapshot = await db.collection('socialMentions')
      .where('platform', '==', 'facebook')
      .where('from.id', '==', platformUserId)
      .get();

    mentionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deletionCount++;
    });

    // Commit the batch deletion
    await batch.commit();

    console.log(`✅ Deleted ${deletionCount} records for Facebook user ${platformUserId}`);

    // Respond with confirmation URL
    const confirmationCode = `deletion_${platformUserId}_${Date.now()}`;
    const statusUrl = `https://us-central1-client-dashboard-v2.cloudfunctions.net/facebookDataDeletionCallback?status=${confirmationCode}`;

    res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error('❌ Error in Facebook data deletion callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
