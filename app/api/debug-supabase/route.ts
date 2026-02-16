import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const result: any = {
    urlHost: null,
    anonKeyPrefix: null,
    anonKeyLength: null,
    supabaseStatus: null,
    supabaseBodySnippet: null,
    error: null,
  };

  // Lire les variables d'environnement
  if (!supabaseUrl) {
    result.error = "NEXT_PUBLIC_SUPABASE_URL manquant";
    return NextResponse.json(result);
  }

  if (!supabaseAnonKey) {
    result.error = "NEXT_PUBLIC_SUPABASE_ANON_KEY manquant";
    return NextResponse.json(result);
  }

  try {
    // Extraire le host de l'URL
    const urlObj = new URL(supabaseUrl);
    result.urlHost = urlObj.host;

    // Informations sur la clé (sans l'exposer complètement)
    result.anonKeyPrefix = supabaseAnonKey.substring(0, 8);
    result.anonKeyLength = supabaseAnonKey.length;

    // Test de validation de la clé via appel Supabase
    try {
      const testUrl = `${supabaseUrl}/rest/v1/`;
      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      result.supabaseStatus = response.status;

      // Lire le body pour détecter les erreurs spécifiques
      const bodyText = await response.text();
      result.supabaseBodySnippet = bodyText.substring(0, 100);

      // Interpréter le résultat
      if (response.status === 401 || bodyText.includes("Invalid API key")) {
        result.error = "Clé API invalide ou mauvais projet Supabase";
      } else if (response.status === 200 || response.status === 404) {
        // 200 ou 404 sont OK pour /rest/v1/ (404 signifie juste que la route n'existe pas, mais l'auth fonctionne)
        result.error = null;
      }
    } catch (fetchError: any) {
      result.error = `Erreur lors du test Supabase: ${fetchError?.message || String(fetchError)}`;
      result.supabaseStatus = "ERROR";
      result.supabaseBodySnippet = fetchError?.message || String(fetchError);
    }
  } catch (err: any) {
    result.error = `Erreur de traitement: ${err?.message || String(err)}`;
  }

  return NextResponse.json(result);
}
