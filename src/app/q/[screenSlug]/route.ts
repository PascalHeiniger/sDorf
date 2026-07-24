import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screens, screenEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const DEFAULT_SECRET = 'sDorf-QSTN-shared-signing-handshake-secret-key-32b';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  try {
    const { screenSlug } = await params;
    const now = new Date();

    // 1. Fetch screen and validate slug
    const screenList = await db
      .select()
      .from(screens)
      .where(eq(screens.slug, screenSlug))
      .limit(1);

    if (screenList.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 });
    }

    const screen = screenList[0];

    // 2. Log QR code scan event for analytics
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    await db.insert(screenEvents).values({
      id: `evt_${Math.random().toString(36).substring(2, 11)}`,
      screenId: screen.id,
      eventType: 'qr_scan',
      eventDataJson: JSON.stringify({
        ip: clientIp,
        userAgent: req.headers.get('user-agent') || 'unknown',
        referer: req.headers.get('referer') || 'direct',
      }),
      createdAt: now,
    });

    // 3. Generate short-lived HMAC signed context token (10 minutes for relaxed local testing)
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    const payload = JSON.stringify({ screenSlug: screen.slug, expiresAt });
    const secret = process.env.SHARED_SIGNING_SECRET || DEFAULT_SECRET;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Combine payload in base64 and signature to create compact token
    const tokenPayloadBase64 = Buffer.from(payload).toString('base64');
    const signedToken = `${tokenPayloadBase64}.${signature}`;

    // 4. Redirect to QSTN mobile question interface (dynamically matching host IP so physical phone scans redirect to port 3001 on the Mac)
    const requestUrl = new URL(req.url);
    const host = requestUrl.hostname; // e.g. 'localhost' or '192.168.1.134'
    const qstnAppUrl = process.env.QSTN_APP_URL || `http://${host}:3001`;
    const redirectUrl = `${qstnAppUrl}/qstn/s/${screen.slug}?token=${signedToken}`;

    console.log(`[sDorf Redirect] Screen QR scanned for ${screen.slug}. Issuing short-lived token and redirecting to QSTN.`);

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error(`[sDorf QR Redirect API] Error processing redirect:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
