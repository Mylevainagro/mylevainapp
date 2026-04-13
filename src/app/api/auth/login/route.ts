import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
  }

  if (!user.approved && user.role !== 'admin') {
    return NextResponse.json({ error: 'Votre compte est en attente d\'approbation par l\'administrateur' }, { status: 403 });
  }

  // Update last_login
  await supabase.from('app_users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, nom: user.nom, role: user.role, approved: user.approved },
  });
}
