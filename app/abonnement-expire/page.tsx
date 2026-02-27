import Link from "next/link";
import { APP_NAME } from "@/lib/app-config";

export default function AbonnementExpirePage() {
  return (
    <main className="min-h-screen bg-[#0a0e27] text-[#f5f5f5] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Abonnement expiré</h1>
        <p className="mt-2 text-white/70">
          Votre accès est suspendu. Réactivez l'abonnement pour continuer à utiliser {APP_NAME}.
        </p>

        <Link
          href="/pricing"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f6c343] to-[#f07a2b] px-4 py-3 font-semibold text-black"
        >
          Réactiver mon abonnement
        </Link>

        <Link
          href="/login"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-3 font-medium text-white/90"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
