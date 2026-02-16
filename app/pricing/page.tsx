"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntrepriseId() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single();

        if (profile?.entreprise_id) {
          setEntrepriseId(profile.entreprise_id);
        }
      } catch (err) {
        console.error('[Pricing] Erreur chargement entreprise:', err);
      }
    }

    loadEntrepriseId();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!entrepriseId) {
        throw new Error('Entreprise introuvable. Veuillez vous connecter.');
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Session non disponible. Veuillez vous connecter.');
      }

      const accessToken = session.access_token;

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ companyId: entrepriseId }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = data?.error || `Erreur checkout (${response.status})`;
        throw new Error(msg);
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('URL de paiement non reçue');
      }

      // Rediriger vers Stripe Checkout
      console.log('[subscribe] redirecting to', url);
      window.location.assign(url);
    } catch (err) {
      console.error('[Pricing] Erreur checkout:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du démarrage du paiement');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0e27] text-[#f5f5f5] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Réactiver votre abonnement</h1>
        <p className="mt-2 text-white/70">
          Votre période d'essai est terminée. Réactivez l'accès en souscrivant.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading || !entrepriseId}
          className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#f6c343] to-[#f07a2b] px-4 py-3 font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Chargement...' : "S'abonner"}
        </button>

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
