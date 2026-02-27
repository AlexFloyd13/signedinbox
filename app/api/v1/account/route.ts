import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { deleteUserAccount } from '@/lib/signedinbox/supabase';

export async function DELETE(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await deleteUserAccount(user.id);
  return NextResponse.json({ success: true });
}
