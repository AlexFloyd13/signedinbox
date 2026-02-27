import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/signedinbox/supabase';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { error } = await db.from('beta_waitlist').insert({ email: email.toLowerCase().trim() });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already on the list' }, { status: 409 });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
