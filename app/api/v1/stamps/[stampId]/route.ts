import { NextRequest, NextResponse } from 'next/server';
import { applySecurity, getClientIP } from '@/lib/security';
import { validateStamp } from '@/lib/signedinbox/stamps';
import { hashIp } from '@/lib/signedinbox/crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stampId: string }> }
) {
  const sec = await applySecurity(request, { rateLimitType: 'validation' });
  if (sec.blocked) return sec.response!;

  try {
    const { stampId } = await params;
    const ip = getClientIP(request);
    const ipHash = ip !== 'unknown' ? hashIp(ip) : null;
    const userAgent = request.headers.get('user-agent');
    const referrer = request.headers.get('referer');

    const result = await validateStamp(stampId, ipHash, userAgent, referrer);
    return NextResponse.json(result, { status: result.valid ? 200 : 404, headers: sec.headers });
  } catch (err) {
    console.error('[signedinbox validate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: sec.headers });
  }
}
