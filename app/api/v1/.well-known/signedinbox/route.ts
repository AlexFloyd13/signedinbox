import { NextRequest, NextResponse } from 'next/server';
import { getAllSigningKeys } from '@/lib/signedinbox/supabase';

export async function GET(_request: NextRequest) {
  try {
    const keys = await getAllSigningKeys();
    const jwkLike = keys.map(k => ({
      kid: k.key_id,
      kty: 'OKP',
      crv: 'Ed25519',
      x: k.public_key,
      active: k.is_active,
      created_at: k.created_at,
      rotated_at: k.rotated_at,
    }));

    return NextResponse.json(
      { keys: jwkLike, service: 'signedinbox.com', algorithm: 'Ed25519' },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('[signedinbox well-known]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
