import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — list all users (admin only, checked client-side)
export async function GET() {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, email, nom, role, approved, created_at, last_login')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data });
}

// PATCH — approve/reject a user (admin only)
export async function PATCH(req: NextRequest) {
  const { user_id, approved } = await req.json();

  if (!user_id || typeof approved !== 'boolean') {
    return NextResponse.json({ error: 'user_id et approved requis' }, { status: 400 });
  }

  const { error } = await supabase
    .from('app_users')
    .update({ approved })
    .eq('id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove a user (admin only)
export async function DELETE(req: NextRequest) {
  const { user_id } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'user_id requis' }, { status: 400 });
  }

  // Prevent deleting admin
  const { data: user } = await supabase
    .from('app_users')
    .select('role')
    .eq('id', user_id)
    .single();

  if (user?.role === 'admin') {
    return NextResponse.json({ error: 'Impossible de supprimer l\'administrateur' }, { status: 403 });
  }

  const { error } = await supabase.from('app_users').delete().eq('id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
