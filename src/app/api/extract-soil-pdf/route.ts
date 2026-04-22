import { NextRequest, NextResponse } from 'next/server';
import { parseLaboText } from '@/lib/pdf-labo-parser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 });
    }

    // Read PDF buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF text server-side
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
    const pdfData = await pdfParse(buffer);

    // Extract soil analysis values
    const result = parseLaboText(pdfData.text, file.name);

    return NextResponse.json({
      success: true,
      fichier_nom: file.name,
      texte_brut: pdfData.text.slice(0, 2000), // First 2000 chars for debug
      nb_pages: pdfData.numpages,
      valeurs: result.valeurs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
