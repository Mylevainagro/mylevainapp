import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractValue(text: string, label: string) {
  const regex = new RegExp(label + '[^0-9]*([0-9]+[.,]?[0-9]*)', 'i');
  const match = text.match(regex);
  if (!match) return null;
  return parseFloat(match[1].replace(',', '.'));
}

export async function GET() {
  try {
    const reportId = 'dc17daf7-2d84-46fe-98cb-06666587099a';

    const { data: report } = await supabase
      .from('soil_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report introuvable' }, { status: 404 });
    }

    // 📥 1. Télécharger le PDF
const { data: file, error: downloadError } = await supabase.storage
  .from('pdf-reports')
  .download(report.storage_path);

if (downloadError || !file) {
  return NextResponse.json(
    {
      error: 'PDF introuvable',
      storage_path: report.storage_path,
      supabase_error: downloadError?.message || null
    },
    { status: 500 }
  );
}

    const buffer = Buffer.from(await file.arrayBuffer());

    // 📄 2. Lire le texte du PDF
   const pdfParseModule: any = await import('pdf-parse/lib/pdf-parse.js');
   const pdfParse = pdfParseModule.default || pdfParseModule;

   const data = await pdfParse(buffer);
   const text = data.text;

    console.log('PDF TEXT:', text);

    // 🔍 3. Extraction des données
    const ph = extractValue(text, 'pH');
    const cuivre = extractValue(text, 'Cuivre');
    const manganese = extractValue(text, 'Manganèse');
    const mo = extractValue(text, 'MO');
    const cec = extractValue(text, 'CEC');

    // 💾 4. Sauvegarde en base
    await supabase
      .from('soil_measurements')
      .insert({
        report_id: reportId,
        ph_water: ph,
        copper_cu_mg_kg: cuivre,
        manganese_mn_mg_kg: manganese,
        organic_matter_percent: mo,
        cec_meq_kg: cec
      });

    return NextResponse.json({
  success: true,
  extracted: {
    ph,
    cuivre,
    manganese,
    mo,
    cec
  },
  textPreview: text.slice(0, 3000)
});

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}