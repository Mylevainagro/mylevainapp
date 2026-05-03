import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toNumber(value: string | undefined | null) {
  if (!value) return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function matchNumber(text: string, regex: RegExp) {
  const m = text.match(regex);
  return toNumber(m?.[1]);
}

export async function POST(req: Request) {
  try {
    const { analyseId, storagePath } = await req.json();

    if (!analyseId || !storagePath) {
      return NextResponse.json(
        { error: 'analyseId ou storagePath manquant' },
        { status: 400 }
      );
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (downloadError || !file) {
      return NextResponse.json(
        {
          error: 'PDF introuvable',
          storagePath,
          detail: downloadError?.message,
        },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const pdfParseModule: any = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfParseModule.default || pdfParseModule;

    const parsed = await pdfParse(buffer);
    const text = parsed.text as string;

    const cuivre = matchNumber(
      text,
      /cuivre très élevée\s*\(?\s*([0-9]+[.,]?[0-9]*)\s*mg\/kg/i
    );

    const matiereOrganique = matchNumber(
      text,
      /MO\s*\n\s*([0-9]+[.,]?[0-9]*)%/i
    );

    const cec = matchNumber(
      text,
      /CEC moyenne de votre sol\s*\(?\s*([0-9]+[.,]?[0-9]*)\s*meq\/kg/i
    );

    const argile = matchNumber(text, /Argile\s*\n\s*([0-9]+[.,]?[0-9]*)%/i);
    const sable = matchNumber(text, /Sables\s*\n\s*([0-9]+[.,]?[0-9]*)%/i);
    const limon = matchNumber(text, /Limons\s*\n\s*([0-9]+[.,]?[0-9]*)%/i);

    const { error: updateError } = await supabase
      .from('analyses_sol')
      .update({
        cuivre_mg_kg: cuivre,
        matiere_organique_pct: matiereOrganique,
        cec_meq_kg: cec,
        argile_pct: argile,
        sable_pct: sable,
        limon_pct: limon,
        fichier_pdf_storage_path: storagePath,
      })
      .eq('id', analyseId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      extracted: {
        cuivre,
        matiereOrganique,
        cec,
        argile,
        sable,
        limon,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}