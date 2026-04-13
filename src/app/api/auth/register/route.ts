import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { email, password, nom } = await req.json();

  if (!email || !password || !nom) {
    return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères' }, { status: 400 });
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from('app_users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { error } = await supabase.from('app_users').insert({
    email: email.toLowerCase().trim(),
    password_hash,
    nom,
    role: 'user',
    approved: false,
  });

  if (error) {
    return NextResponse.json({ error: 'Erreur lors de l\'inscription' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Inscription réussie. En attente d\'approbation par l\'administrateur.' });
}
