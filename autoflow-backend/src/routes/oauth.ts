import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import axios from 'axios';
import { google } from 'googleapis';

const router = Router();

// --- Slack OAuth ---
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:4000/api/oauth/slack/callback';

router.get('/slack', (req: Request, res: Response) => {
  const state = req.query.state || '';
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=chat:write,channels:read,users:read&redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}&state=${state}`;
  res.redirect(url);
});

router.get('/slack/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  try {
    const tokenRes = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      },
    });
    const { access_token, refresh_token, expires_in, authed_user, team } = tokenRes.data;
    // You should get userId from session or state param
    const userId = state as string; // For demo, use state as userId
    await prisma.userIntegration.upsert({
      where: { userId_provider: { userId, provider: 'slack' } },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        extra: { authed_user, team },
      },
      create: {
        userId,
        provider: 'slack',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        extra: { authed_user, team },
      },
    });
    res.send('Slack connected! You can close this window.');
  } catch (err) {
    res.status(500).send('Slack OAuth failed');
  }
});

// --- Google and Airtable placeholders ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

router.get('/google', (req, res) => {
  const state = req.query.state || '';
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/forms.body.readonly',
      'https://www.googleapis.com/auth/forms.responses.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
    state: String(state),
    prompt: 'consent'
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const { tokens } = await oauth2Client.getToken(String(code));
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  const userId = state as string;
  await prisma.userIntegration.upsert({
    where: { userId_provider: { userId, provider: 'google' } },
    update: {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      extra: { email: data.email }
    },
    create: {
      userId,
      provider: 'google',
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      extra: { email: data.email }
    }
  });
  res.redirect(`/editor?connected=google`);
});

// --- Google Forms API: Fetch forms for a user ---
router.get('/google/forms', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const integration = await prisma.userIntegration.findFirst({ where: { userId: String(userId), provider: 'google' } });
  if (!integration) return res.status(404).json({ error: 'Google not connected' });
  try {
    // Use Google Forms API (mock for now)
    // In production, use integration.accessToken to call Google Forms API
    // Example: https://forms.googleapis.com/v1/forms
    // For MVP, return mock forms
    return res.json({ forms: [
      { id: 'form1', title: 'Demo Form 1' },
      { id: 'form2', title: 'Demo Form 2' },
    ] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// --- OAuth connection status endpoint ---
router.get('/status/:provider', async (req, res) => {
  const { provider } = req.params;
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ connected: false, error: 'Missing userId' });
  const integration = await prisma.userIntegration.findFirst({ where: { userId, provider } });
  res.json({ connected: !!integration });
});

export default router; 