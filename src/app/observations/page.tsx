"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ObservationsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/historique"); }, [router]);
  return null;
}
