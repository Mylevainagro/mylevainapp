import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: 'reportId manquant' },
        { status: 400 }
      );
    }

    // 1. Vérifier que le rapport existe
    const { data: report, error: reportError } = await supabase
      .from('soil_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Rapport introuvable' },
        { status: 404 }
      );
    }

    // 2. DONNÉES TEST (simule extraction du PDF)
    const extractedReport = {
      laboratory_identifier: '870-2025-00043994',
      laboratory_name: 'Eurofins Galys Blois',
      report_edition_date: '2025-03-28',
      reception_date: '2025-03-13',
      sampling_date: '2025-03-07',
      parcel_name: 'AUBRION - PAR - 3 - P1 - 03 - 25',
      parcel_commune: 'AUBIE ET ESPESSAS',
      parcel_surface_ha: 1,
      gps_lat: 45.0297897,
      gps_lng: -0.4019605,
      technician_name: 'DAVY DUBOY',
      customer_name: 'MYLEVAIN',
      report_status: 'extracted'
    };

    const extractedMeasurements = {
      report_id: reportId,
      soil_type: 'Sable limoneux',
      clay_percent: 9.6,
      silt_percent: 29.2,
      sand_percent: 58.8,
      organic_matter_percent: 2.4,
      useful_water_reserve_mm: 19,
      ph_water: 6.2,
      cec_meq_kg: 70.1,
      copper_cu_mg_kg: 55.8,
      cation_ca_percent: 58.2,
      cation_k_percent: 6.4,
      cation_mg_percent: 18.3,
      cation_h_percent: 17.1
    };

    const extractedRatios = {
      report_id: reportId,
      ratio_k2o_mgo: 0.82,
      ratio_cao_k2o: 5.39,
      ratio_mo_cu: 0.44,
      ratio_p2o5_zn: 2.04,
      ratio_cao_mgo: 4.41
    };

    // 3. Mettre à jour soil_reports
    const { error: updateError } = await supabase
      .from('soil_reports')
      .update(extractedReport)
      .eq('id', reportId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // 4. Insérer mesures
    const { error: measureError } = await supabase
      .from('soil_measurements')
      .insert(extractedMeasurements);

    if (measureError) {
      return NextResponse.json(
        { error: measureError.message },
        { status: 500 }
      );
    }

    // 5. Insérer ratios
    const { error: ratioError } = await supabase
      .from('soil_ratios')
      .insert(extractedRatios);

    if (ratioError) {
      return NextResponse.json(
        { error: ratioError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Insertion OK',
      reportId
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}