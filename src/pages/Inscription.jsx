import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import Message from "@/components/billing/Message";
import Recapitulatif from "@/components/billing/Recapitulatif";
import { BUSINESS } from "@/lib/business-info";
import { ApiError, getCatalogue, inscrire, lancerCheckout } from "@/lib/billing/api";
import { URL_MON_COMPTE } from "@/lib/billing/config";
import { extraireJetonRestreint } from "@/lib/billing/jeton";
import { calculer, selectionDepuisQuery, selectionVersCheckout } from "@/lib/billing/pricing";
import { ecrireSession, effacerSession, lireSession } from "@/lib/billing/session";
import { nettoyerSiret, validerInscription } from "@/lib/billing/validation";

const VIDE = {
  prenom: "", nom: "", email: "", motDePasse: "", confirmation: "",
  nomCommercial: "", raisonSociale: "", siret: "",
  ligne1: "", ligne2: "", codePostal: "", ville: "", cgv: false,
};

const INDISPONIBLE = "Le service est momentanément indisponible. Réessayez dans quelques minutes.";

const CLASSE_CHAMP =
  "w-full border bg-paper px-4 py-3 text-ink text-[15px] focus:outline-none focus:border-bottle disabled:opacity-60";

function Champ({ label, name, valeur, erreur, onChange, aide, facultatif, type = "text", ...props }) {
  const id = `champ-${name}`;
  const decrit = [aide && `${id}-aide`, erreur && `${id}-erreur`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-faint text-sm mb-2">
        {label}
        {facultatif && <span className="text-faint"> (facultatif)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={valeur}
        onChange={onChange}
        aria-invalid={erreur ? "true" : undefined}
        aria-describedby={decrit}
        className={`${CLASSE_CHAMP} ${erreur ? "border-[#8a2424]" : "border-border"}`}
        {...props}
      />
      {aide && !erreur && <p id={`${id}-aide`} className="text-faint text-[13px] mt-1.5">{aide}</p>}
      {erreur && <p id={`${id}-erreur`} className="text-[#8a2424] text-[14px] mt-1.5">{erreur}</p>}
    </div>
  );
}

// Redirection vers la page de paiement hébergée : on ne suit qu'une URL http(s).
function suivre(url) {
  try {
    const cible = new URL(url, window.location.href);
    if (cible.protocol === "https:" || cible.protocol === "http:") {
      window.location.assign(cible.href);
      return true;
    }
  } catch {
    // URL illisible : traitée comme une erreur par l'appelant
  }
  return false;
}

export default function Inscription() {
  const { search } = useLocation();
  const { data: catalogue, isPending, isError, refetch } = useQuery({
    queryKey: ["billing", "catalogue"],
    queryFn: getCatalogue,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const [valeurs, setValeurs] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [session, setSession] = useState(() => lireSession());
  const [envoi, setEnvoi] = useState(false);
  const [erreurGenerale, setErreurGenerale] = useState(null);
  const [erreurRecap, setErreurRecap] = useState(null);
  const envoiEnCours = useRef(false);
  const recapRef = useRef(null);

  useEffect(() => {
    if (erreurRecap && recapRef.current) recapRef.current.focus();
  }, [erreurRecap]);

  if (isPending) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24" role="status">
        <p className="text-muted">Chargement de votre formule…</p>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <Message type="error">
          <p>{INDISPONIBLE}</p>
          <button type="button" onClick={() => refetch()} className="link-underline mt-2">Réessayer</button>
        </Message>
      </div>
    );
  }

  const selection = selectionDepuisQuery(search, catalogue);
  if (!selection) return <Navigate to="/tarifs" replace />;
  const calcul = calculer(catalogue, selection);

  const modifier = (e) => {
    const { name, type, value, checked } = e.target;
    setValeurs((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
    setErreurs((err) => {
      if (!err[name]) return err;
      const { [name]: _retire, ...reste } = err;
      return reste;
    });
  };

  // Les erreurs de l'API qui concernent le choix de formule ramènent au récapitulatif.
  const expliquerChoix = (erreur) => {
    const libelle = (cle) => catalogue.categories.find((c) => c.cle === cle)?.libelle?.toLowerCase() ?? cle;
    switch (erreur.code) {
      case "ROLE_NON_AUTORISE_POUR_OFFRE":
        return `La formule ${calcul.offre.nom} n’accepte pas les comptes « ${libelle(erreur.detail?.categorie ?? "")} ». Modifiez votre choix pour continuer.`;
      case "COMPTES_INSUFFISANTS": {
        const requis = Object.entries(erreur.detail?.requis ?? {})
          .map(([cle, n]) => `${n} ${libelle(cle)}`)
          .join(", ");
        return `Les comptes de votre choix ne suffisent pas${requis ? ` : il en faut au moins ${requis}` : ""}. Modifiez votre choix pour continuer.`;
      }
      case "OFFRE_INVALIDE":
      case "VERSION_INDISPONIBLE":
        return "Cette formule n’est plus disponible telle quelle. Choisissez-la de nouveau depuis la page des tarifs.";
      default:
        return null;
    }
  };

  const paiement = async (jeton) => {
    try {
      const { url } = await lancerCheckout(jeton, selectionVersCheckout(selection));
      if (suivre(url)) return; // la page se quitte : le bouton reste désactivé
      setErreurGenerale(INDISPONIBLE);
    } catch (erreur) {
      const explication = expliquerChoix(erreur);
      if (explication) setErreurRecap({ texte: explication });
      else if (erreur.code === "ABONNEMENT_DEJA_ACTIF")
        setErreurGenerale("Un abonnement est déjà actif pour ce compte. Gérez-le depuis votre espace.");
      else if (erreur.status === 401 || erreur.status === 403) {
        effacerSession();
        setSession(null);
        setErreurGenerale("Votre session a expiré. Créez de nouveau votre compte pour continuer.");
      } else setErreurGenerale(INDISPONIBLE);
    }
    setEnvoi(false);
    envoiEnCours.current = false;
  };

  const soumettre = async (e) => {
    e.preventDefault();
    if (envoiEnCours.current) return;
    setErreurGenerale(null);
    setErreurRecap(null);

    const problemes = validerInscription(valeurs);
    if (Object.keys(problemes).length > 0) {
      setErreurs(problemes);
      const premier = Object.keys(problemes)[0];
      document.getElementById(`champ-${premier}`)?.focus();
      return;
    }

    envoiEnCours.current = true;
    setEnvoi(true);
    try {
      const adresse = {
        ligne1: valeurs.ligne1.trim(),
        codePostal: valeurs.codePostal.trim(),
        ville: valeurs.ville.trim(),
      };
      if (valeurs.ligne2.trim()) adresse.ligne2 = valeurs.ligne2.trim();

      const email = valeurs.email.trim();
      const reponse = await inscrire({
        responsable: { prenom: valeurs.prenom.trim(), nom: valeurs.nom.trim(), email, motDePasse: valeurs.motDePasse },
        restaurant: {
          nomCommercial: valeurs.nomCommercial.trim(),
          raisonSociale: valeurs.raisonSociale.trim(),
          siret: nettoyerSiret(valeurs.siret),
          adresse,
        },
        cgvAcceptees: true,
      });
      const token = extraireJetonRestreint(reponse);
      if (!token) throw new ApiError("ERREUR_INCONNUE");
      const nouvelle = { token, email };
      ecrireSession(nouvelle);
      setSession(nouvelle);
      setValeurs((v) => ({ ...v, motDePasse: "", confirmation: "" }));
      await paiement(token);
    } catch (erreur) {
      if (erreur.code === "EMAIL_DEJA_UTILISE") {
        setErreurs({
          email: (
            <>
              Un compte existe déjà avec cet e-mail.{" "}
              {URL_MON_COMPTE ? (
                <a href={URL_MON_COMPTE} className="link-underline">Connectez-vous à votre espace</a>
              ) : (
                "Connectez-vous à votre espace"
              )}{" "}
              pour choisir une formule.
            </>
          ),
        });
        document.getElementById("champ-email")?.focus();
      } else if (erreur.code === "SIRET_INVALIDE") {
        setErreurs({ siret: "Ce numéro SIRET n’est pas reconnu. Vérifiez-le." });
        document.getElementById("champ-siret")?.focus();
      } else setErreurGenerale(INDISPONIBLE);
      setEnvoi(false);
      envoiEnCours.current = false;
    }
  };

  // Compte déjà créé (échec du paiement, retour depuis Stripe) : on ne le recrée pas.
  const reprendrePaiement = async () => {
    if (envoiEnCours.current) return;
    envoiEnCours.current = true;
    setEnvoi(true);
    setErreurGenerale(null);
    setErreurRecap(null);
    await paiement(session.token);
  };

  const autreCompte = () => {
    effacerSession();
    setSession(null);
    setErreurGenerale(null);
  };

  return (
    <>
      <SEO
        title="Inscription à l’application RestOclair"
        description="Créez le compte de votre établissement et réglez votre abonnement RestOclair."
        canonicalUrl="https://restoclair.fr/inscription"
        noindex
      />

      <section className="pt-14 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <h1 className="text-ink mb-4">Créez votre compte.</h1>
          <p className="text-muted text-lg leading-relaxed mb-10 max-w-[560px]">
            Quelques informations sur vous et sur votre établissement, puis vous passez au paiement sécurisé.
          </p>

          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
            <aside className="md:col-span-5 md:col-start-8 md:row-start-1 md:sticky md:top-24" aria-label="Récapitulatif de votre formule">
              {erreurRecap && (
                <Message type="error" ref={recapRef} tabIndex={-1} className="mb-4">
                  {erreurRecap.texte}
                </Message>
              )}
              <Recapitulatif calcul={calcul} tvaPourcentage={catalogue.tvaPourcentage} />
              <p className="mt-4 text-[15px]">
                <Link to="/tarifs" className="link-underline">Modifier mon choix</Link>
              </p>
            </aside>

            <div className="md:col-span-7 md:row-start-1">
              {session ? (
                <div className="border-t border-border pt-8">
                  <Message type="info">
                    Votre compte est créé pour <strong>{session.email}</strong>. Il reste à régler votre abonnement.
                  </Message>
                  {erreurGenerale && <Message type="error" className="mt-4">{erreurGenerale}</Message>}
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <button type="button" className="btn-primary disabled:opacity-60 disabled:cursor-wait" disabled={envoi} aria-busy={envoi} onClick={reprendrePaiement}>
                      {envoi ? "Redirection…" : "Passer au paiement"}
                    </button>
                    <button type="button" onClick={autreCompte} disabled={envoi} className="link-underline text-[15px] text-left">
                      Ce n’est pas le bon compte ?
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={soumettre} noValidate className="border-t border-border pt-8">
                  <fieldset className="mb-10">
                    <legend className="text-ink font-sans font-semibold text-[18px] mb-5">Le responsable du compte</legend>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                      <Champ label="Prénom" name="prenom" valeur={valeurs.prenom} erreur={erreurs.prenom} onChange={modifier} autoComplete="given-name" maxLength={100} />
                      <Champ label="Nom" name="nom" valeur={valeurs.nom} erreur={erreurs.nom} onChange={modifier} autoComplete="family-name" maxLength={100} />
                      <div className="sm:col-span-2">
                        <Champ label="Adresse e-mail" name="email" type="email" valeur={valeurs.email} erreur={erreurs.email} onChange={modifier} autoComplete="email" maxLength={254} />
                      </div>
                      <Champ label="Mot de passe" name="motDePasse" type="password" valeur={valeurs.motDePasse} erreur={erreurs.motDePasse} onChange={modifier} autoComplete="new-password" aide="8 caractères minimum, avec au moins une lettre et un chiffre." />
                      <Champ label="Confirmation du mot de passe" name="confirmation" type="password" valeur={valeurs.confirmation} erreur={erreurs.confirmation} onChange={modifier} autoComplete="new-password" />
                    </div>
                  </fieldset>

                  <fieldset className="mb-8">
                    <legend className="text-ink font-sans font-semibold text-[18px] mb-5">L’établissement</legend>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                      <Champ label="Nom commercial" name="nomCommercial" valeur={valeurs.nomCommercial} erreur={erreurs.nomCommercial} onChange={modifier} autoComplete="organization" maxLength={150} />
                      <Champ label="Raison sociale" name="raisonSociale" valeur={valeurs.raisonSociale} erreur={erreurs.raisonSociale} onChange={modifier} maxLength={150} />
                      <div className="sm:col-span-2">
                        <Champ label="SIRET" name="siret" valeur={valeurs.siret} erreur={erreurs.siret} onChange={modifier} inputMode="numeric" autoComplete="off" aide="14 chiffres." maxLength={20} />
                      </div>
                      <div className="sm:col-span-2">
                        <Champ label="Adresse" name="ligne1" valeur={valeurs.ligne1} erreur={erreurs.ligne1} onChange={modifier} autoComplete="address-line1" maxLength={200} />
                      </div>
                      <div className="sm:col-span-2">
                        <Champ label="Complément d’adresse" name="ligne2" facultatif valeur={valeurs.ligne2} erreur={erreurs.ligne2} onChange={modifier} autoComplete="address-line2" maxLength={200} />
                      </div>
                      <Champ label="Code postal" name="codePostal" valeur={valeurs.codePostal} erreur={erreurs.codePostal} onChange={modifier} inputMode="numeric" autoComplete="postal-code" maxLength={5} />
                      <Champ label="Ville" name="ville" valeur={valeurs.ville} erreur={erreurs.ville} onChange={modifier} autoComplete="address-level2" maxLength={100} />
                    </div>
                  </fieldset>

                  <div>
                    <label className="flex items-start gap-3 text-sm text-muted leading-relaxed">
                      <input
                        id="champ-cgv"
                        type="checkbox"
                        name="cgv"
                        checked={valeurs.cgv}
                        onChange={modifier}
                        aria-invalid={erreurs.cgv ? "true" : undefined}
                        aria-describedby={erreurs.cgv ? "champ-cgv-erreur" : undefined}
                        className="mt-1 w-4 h-4 shrink-0 accent-[#1c4b38]"
                      />
                      <span>
                        J’accepte les{" "}
                        <Link to="/cgv" target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>{" "}
                        et les{" "}
                        <Link to="/cgu" target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales d’utilisation</Link>
                      </span>
                    </label>
                    {erreurs.cgv && <p id="champ-cgv-erreur" className="text-[#8a2424] text-[14px] mt-1.5">{erreurs.cgv}</p>}
                  </div>

                  {erreurGenerale && <Message type="error" className="mt-6">{erreurGenerale}</Message>}

                  <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                    <button type="submit" className="btn-primary disabled:opacity-60 disabled:cursor-wait" disabled={envoi} aria-busy={envoi}>
                      {envoi ? "Envoi en cours…" : "Créer mon compte et payer"}
                    </button>
                    <span className="text-faint text-sm">Besoin d’aide ? {BUSINESS.phone.display}</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
