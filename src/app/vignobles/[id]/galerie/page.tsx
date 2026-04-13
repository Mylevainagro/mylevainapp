"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PhotoGallery } from "@/components/gallery/PhotoGallery";

export default function GaleriePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <Link href={`/vignobles/${id}`} className="text-sm text-gray-500 hover:text-[#2d5016]">
        ← Retour à la parcelle
      </Link>
      <h1 className="text-xl font-bold text-[#2d5016] mt-2 mb-4">📸 Galerie photos</h1>
      <PhotoGallery parcelleId={id} />
    </div>
  );
}
