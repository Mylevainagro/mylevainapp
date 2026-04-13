"use client";

interface ValidationMessageProps {
  message: string | undefined;
}

/**
 * Affiche un message d'erreur de validation sous un champ.
 * Ne rend rien si le message est vide ou undefined.
 */
export function ValidationMessage({ message }: ValidationMessageProps) {
  if (!message) return null;

  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1" role="alert">
      <svg
        className="w-3.5 h-3.5 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}
