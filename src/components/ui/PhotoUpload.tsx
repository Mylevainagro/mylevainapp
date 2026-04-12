"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface PhotoUploadProps {
  observationId?: string;
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  photos: UploadedPhoto[];
}

export interface UploadedPhoto {
  file?: File;
  url: string;
  type: "feuille" | "grappe" | "sol" | "rang" | "autre";
  preview: string;
  uploading?: boolean;
}

const PHOTO_TYPES = [
  { value: "feuille", label: "🍃 Feuille" },
  { value: "grappe", label: "🍇 Grappe" },
  { value: "sol", label: "🟤 Sol" },
  { value: "rang", label: "🌿 Rang" },
  { value: "autre", label: "📷 Autre" },
] as const;

export function PhotoUpload({ onPhotosChange, photos }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: UploadedPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newPhotos.push({
        file,
        url: "",
        type: "feuille",
        preview: URL.createObjectURL(file),
      });
    }
    onPhotosChange([...photos, ...newPhotos]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(index: number) {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  }

  function changeType(index: number, type: UploadedPhoto["type"]) {
    const updated = [...photos];
    updated[index] = { ...updated[index], type };
    onPhotosChange(updated);
  }

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative group">
              <img
                src={photo.preview}
                alt={`Photo ${i + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              {/* Type selector */}
              <select
                value={photo.type}
                onChange={(e) => changeType(i, e.target.value as UploadedPhoto["type"])}
                className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded-b-lg border-0 focus:outline-none"
              >
                {PHOTO_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add photo buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.capture = "environment";
              inputRef.current.click();
            }
          }}
          className="flex-1 bg-[#2d5016]/10 text-[#2d5016] rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
        >
          📸 Prendre photo
        </button>
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
            }
          }}
          className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
        >
          📁 Galerie
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {photos.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {photos.length} photo{photos.length > 1 ? "s" : ""} sélectionnée{photos.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

/**
 * Upload les photos vers Supabase Storage et insère les métadonnées en base
 */
export async function uploadPhotos(
  photos: UploadedPhoto[],
  observationId: string
): Promise<void> {
  for (const photo of photos) {
    if (!photo.file) continue;

    const ext = photo.file.name.split(".").pop() || "jpg";
    const path = `${observationId}/${Date.now()}_${photo.type}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(path, photo.file, { contentType: photo.file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      continue;
    }

    const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);

    await supabase.from("photos").insert({
      observation_id: observationId,
      type: photo.type,
      url: urlData.publicUrl,
      legende: null,
    });
  }
}
