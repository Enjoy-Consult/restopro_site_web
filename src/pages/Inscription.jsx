import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import AjoutComptes from "@/components/billing/AjoutComptes";
import Etapes from "@/components/billing/Etapes";
import Message from "@/components/billing/Message";
import Recapitulatif from "@/components/billing/Recapitulatif";
import { BUSINESS } from "@/lib/business-info";
import { getCatalogue, inscrire, lancerCheckout } from "@/lib/billing/api";
import { URL_MON_COMPTE } from "@/lib/billing/config";
import { calculer, nombreAjouts, selectionDepuisQuery, selectionVersCheckout, selectionVersQuery } from "@/lib/billing/pricing";
import { MESSAGE_CGV_A_REACCEPTER, MESSAGE_INDISPONIBLE, PHRASE_ESSAI_INTERROMPU, decouperEspace, erreursDeValidation, estActivationEnCoursRefus, messageCatalogue, messageErreur, traiterFinDeSession } from "@/lib/billing/erreurs";
import { blocCgv, cgvAReaccepter, cheminCgv, cheminVersionne, corpsInscription, lireSaisie, mentionsAbonnement, retenirExplicationChoix, retenirSaisie, suivrePaiement } from "@/lib/billing/inscription";
import { ADRESSE_ACTIVATION_EN_COURS } from "@/lib/billing/retour";
import { ecrireSession, effacerSession, lireSession } from "@/lib/billing/session";
import { BORNES, validerInscription } from "@/lib/billing/validation";
import { INDEX_LEGAL } from "virtual:documents-legaux";

// Version des CGV, envoyée à l'inscription et au checkout (Apirest refuse un bloc absent ou qui n'est plus en vigueur : 409).
const CGV = blocCgv(INDEX_LEGAL);

// Liens de la case d'acceptation : la version précise que le visiteur accepte (routes /<document>/:version de App.jsx).
const LIEN_CGV = cheminVersionne(INDEX_LEGAL, "cgv") ?? "/cgv";
const LIEN_ACCORD = cheminVersionne(INDEX_LEGAL, "accord-sous-traitance") ?? "/accord-sous-traitance";
const LIEN_CGU = cheminVersionne(INDEX_LEGAL, "cgu-app") ?? "/application/cgu";

// Un caractère de plus que la borne : un mot de passe collé trop long est signalé par le contrôle, jamais tronqué sans le dire.
const MAX_SAISIE_MOT_DE_PASSE = BORNES.motDePasse + 1;

const VIDE = {
  prenom: "", nom: "", email: "", motDePasse: "", confirmation: "",
  nomCommercial: "", raisonSociale: "", siret: "",
  ligne1: "", ligne2: "", codePostal: "", ville: "", cgv: false,
};

const CLASSE_CHAMP =
  "w-full border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";

function Champ({ label, name, valeur, erreur, onChange, aide, facultatif, type = "text", ...props }) {
  const id = `champ-${name}`;
  const decrit = [aide && `${id}-aide`, erreur && `${id}-erreur`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-muted text-[14px] mb-2">
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

// Message général : « votre espace » devient un lien si l'adresse est configurée, et une panne donne le téléphone.
function TexteErreur({ texte }) {
  const { avant, espace, apres } = decouperEspace(texte);
  return (
    <>
      {avant}
      {espace && (URL_MON_COMPTE ? <a href={URL_MON_COMPTE} className="link-underline">{espace}</a> : espace)}
      {apres}
      {texte === MESSAGE_INDISPONIBLE && (
        <>
          {" "}Vous pouvez aussi nous appeler au <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
        </>
      )}
    </>
  );
}

export default function Inscription() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { data: catalogue, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["billing", "catalogue"],
    queryFn: getCatalogue,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Retour de « Modifier mon choix » : la saisie gardée en mémoire revient, sans le mot de passe.
  const [valeurs, setValeurs] = useState(() => ({ ...VIDE, ...lireSaisie() }));
  const [erreurs, setErreurs] = useState({});
  const [session, setSession] = useState(() => lireSession());
  const [envoi, setEnvoi] = useState(false);
  const [erreurGenerale, setErreurGenerale] = useState(null);
  // Version des CGV envoyée : celle de cette page, puis celle qu'un 409 CGV_VERSION_OBSOLETE demande d'accepter.
  const [cgv, setCgv] = useState(CGV);
  const [cgvChangee, setCgvChangee] = useState(false);
  const [nouvelleCgvAcceptee, setNouvelleCgvAcceptee] = useState(false);
  const [erreurRecap, setErreurRecap] = useState(null);
  // Session expirée ou abonnement déjà actif : { type, texte } remplace le paiement.
  const [finSession, setFinSession] = useState(null);
  // null : ouvert seulement si des comptes ou l'option sont déjà choisis.
  const [ajoutsOuverts, setAjoutsOuverts] = useState(null);
  const envoiEnCours = useRef(false);
  const recapRef = useRef(null);

  useEffect(() => {
    if (erreurRecap && recapRef.current) recapRef.current.focus();
  }, [erreurRecap]);

  // Retour arrière depuis la page de paiement : le navigateur restaure la page telle quelle, bouton désactivé compris,
  // et sans savoir que la page de retour a pu effacer le jeton depuis.
  useEffect(() => {
    const auRetour = (e) => {
      if (!e.persisted) return;
      envoiEnCours.current = false;
      setEnvoi(false);
      setSession(lireSession());
    };
    window.addEventListener("pageshow", auRetour);
    return () => window.removeEventListener("pageshow", auRetour);
  }, []);

  if (isPending) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24" role="status">
        <p className="text-muted">Chargement de votre formule…</p>
      </div>
    );
  }
  // Un rafraîchissement raté garde le catalogue déjà reçu : le formulaire en cours reste à l'écran.
  if (isError && !catalogue) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <Message type="error">
          <p>
            {messageCatalogue(error) ?? MESSAGE_INDISPONIBLE} Vous pouvez aussi nous appeler au{" "}
            <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
          </p>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="link-underline mt-2 disabled:opacity-60">
            {isFetching ? "Nouvelle tentative…" : "Réessayer"}
          </button>
        </Message>
      </div>
    );
  }

  const selection = selectionDepuisQuery(search, catalogue);
  if (!selection) {
    retenirExplicationChoix(search);
    return <Navigate to="/tarifs" replace />;
  }
  const calcul = calculer(catalogue, selection);
  const ouvrirAjouts = ajoutsOuverts ?? nombreAjouts(selection) > 0;

  // Le choix vit dans l'URL : « Modifier mon choix », un rechargement ou un retour de Stripe le retrouvent.
  const changerSelection = (nouvelle) => {
    if (!calculer(catalogue, nouvelle).ok) return;
    setAjoutsOuverts((o) => o ?? true); // le panneau reste ouvert pendant qu'on s'en sert, même à 0 ajout
    setErreurRecap(null);
    navigate({ search: `?${selectionVersQuery(nouvelle)}` }, { replace: true });
  };

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
    // « 2 cuisiniers », « 1 responsable », « 2 services techniques »
    const quantite = (cle, n) => {
      const mot = libelle(cle);
      return `${n} ${n > 1 && !mot.endsWith("s") ? `${mot}s` : mot}`;
    };
    switch (erreur.code) {
      case "ROLE_NON_AUTORISE_POUR_OFFRE":
        return `La formule ${calcul.offre.nom} n’accepte pas les comptes « ${libelle(erreur.detail?.categorie ?? "")} ». Retirez-les ci-dessus ou modifiez votre choix.`;
      case "COMPTES_INSUFFISANTS": {
        const requis = Object.entries(erreur.detail?.requis ?? {})
          .map(([cle, n]) => quantite(cle, n))
          .join(", ");
        return `Les comptes de votre choix ne suffisent pas${requis ? ` : il en faut au moins ${requis}` : ""}. Ajoutez-les ci-dessus pour continuer.`;
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
      const { url } = await lancerCheckout(jeton, selectionVersCheckout(selection, cgv));
      if (suivrePaiement(url)) return; // la page se quitte : le bouton reste désactivé
      setErreurGenerale(MESSAGE_INDISPONIBLE);
    } catch (erreur) {
      // Le paiement attend sa confirmation : on relit le compte, sans nouveau Checkout. Le jeton reste.
      if (estActivationEnCoursRefus(erreur)) {
        navigate(ADRESSE_ACTIVATION_EN_COURS);
        return;
      }
      // Les CGV ont changé : on affiche la nouvelle version et on la fait accepter, puis le même Checkout repart.
      const nouvelle = cgvAReaccepter(erreur);
      if (nouvelle) {
        setCgv(nouvelle);
        setCgvChangee(true);
        setNouvelleCgvAcceptee(false);
        setEnvoi(false);
        envoiEnCours.current = false;
        return;
      }
      const fin = traiterFinDeSession(erreur);
      const explication = fin ? null : expliquerChoix(erreur);
      if (fin) {
        setSession(null);
        setFinSession(fin);
      } else if (explication) {
        setErreurRecap({ texte: explication });
        if (erreur.code === "ROLE_NON_AUTORISE_POUR_OFFRE" || erreur.code === "COMPTES_INSUFFISANTS") setAjoutsOuverts(true);
      }
      // 429 : trop d'essais ; 403 : le refus reçu (ou le message générique pour un code inconnu) ;
      // GERE_PAR_ABONNEMENT, FACTURE_IMPAYEE, CGV_VERSION_OBSOLETE sans version lisible : renvoi vers l'espace client
      else setErreurGenerale(messageErreur(erreur));
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

    setErreurs({});
    envoiEnCours.current = true;
    setEnvoi(true);
    try {
      const { token } = await inscrire(corpsInscription(valeurs, cgv));
      const nouvelle = { token, email: valeurs.email.trim() };
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
              pour choisir une formule. {PHRASE_ESSAI_INTERROMPU}
            </>
          ),
        });
        document.getElementById("champ-email")?.focus();
      } else if (cgvAReaccepter(erreur)) {
        // Les CGV ont changé depuis le chargement de la page : la case affiche la nouvelle version, à cocher de nouveau.
        const nouvelle = cgvAReaccepter(erreur);
        setCgv(nouvelle);
        setCgvChangee(true);
        setValeurs((v) => ({ ...v, cgv: false }));
        setErreurs({ cgv: MESSAGE_CGV_A_REACCEPTER });
        document.getElementById("champ-cgv")?.focus();
      } else if (erreur.code === "CGV_VERSION_OBSOLETE") {
        // Version illisible dans la réponse : seul un rechargement donne la nouvelle version.
        setValeurs((v) => ({ ...v, cgv: false }));
        setErreurs({
          cgv: (
            <>
              Les conditions générales de vente ont été mises à jour.{" "}
              <button type="button" onClick={() => window.location.reload()} className="link-underline">
                Rechargez la page
              </button>{" "}
              pour lire et accepter la nouvelle version.
            </>
          ),
        });
        document.getElementById("champ-cgv")?.focus();
      } else if (erreur.code === "SIRET_INVALIDE") {
        setErreurs({ siret: "Ce numéro SIRET n’est pas reconnu. Vérifiez-le." });
        document.getElementById("champ-siret")?.focus();
      } else if (erreur.code === "VALIDATION_ERROR") {
        const { champs, general } = erreursDeValidation(erreur.detail);
        setErreurs(champs);
        if (general) setErreurGenerale(general);
        const premier = Object.keys(champs)[0];
        if (premier) document.getElementById(`champ-${premier}`)?.focus();
      } else setErreurGenerale(messageErreur(erreur));
      setEnvoi(false);
      envoiEnCours.current = false;
    }
  };

  // Compte déjà créé (échec du paiement, retour depuis Stripe) : on ne le recrée pas.
  const reprendrePaiement = async () => {
    if (envoiEnCours.current) return;
    if (cgvChangee && !nouvelleCgvAcceptee) return;
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
    // Un autre compte, c'est une nouvelle acceptation des conditions.
    setValeurs((v) => ({ ...v, cgv: false }));
    setNouvelleCgvAcceptee(false);
  };

  return (
    <>
      <SEO
        title="Inscription à l’application RestOclair"
        description="Créez le compte de votre établissement et réglez votre abonnement RestOclair."
        canonicalUrl="https://restoclair.fr/inscription"
        noindex
      />

      <section className="pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6">
          <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] mb-5">Inscription</p>
          <h1 className="text-ink mb-5">Créez votre compte.</h1>
          <p className="text-muted text-[17px] md:text-lg leading-relaxed mb-7 max-w-[560px]">
            Quelques informations sur vous et sur votre établissement, puis vous passez au paiement sécurisé.
          </p>
          <div className="mb-12 md:mb-14"><Etapes courant={2} /></div>

          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-start">
            <aside className="md:col-span-5 md:col-start-8 md:row-start-1" aria-label="Récapitulatif de votre formule">
              <Recapitulatif calcul={calcul} tvaPourcentage={catalogue.tvaPourcentage}>
                <AjoutComptes
                  catalogue={catalogue}
                  calcul={calcul}
                  selection={selection}
                  onChange={changerSelection}
                  ouvert={ouvrirAjouts}
                  onBasculer={() => setAjoutsOuverts(!ouvrirAjouts)}
                  desactive={envoi}
                />
                {/* Sous les réglages : quand il disparaît, les boutons +/− ne bougent pas. */}
                {erreurRecap && (
                  <Message type="error" ref={recapRef} tabIndex={-1} className="mt-4">
                    {erreurRecap.texte}
                  </Message>
                )}
              </Recapitulatif>
              {!envoi && (
                <p className="mt-4 text-[15px]">
                  <Link to={`/tarifs${search}`} onClick={() => retenirSaisie(valeurs)} className="link-underline">Modifier mon choix</Link>
                </p>
              )}
              <div className="mt-5 flex flex-col gap-2 text-muted text-[13px] leading-relaxed">
                {mentionsAbonnement(calcul.version).map((mention) => (
                  <p key={mention}>{mention}</p>
                ))}
                <p>
                  Détail et cas particuliers :{" "}
                  <Link to={LIEN_CGV} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>.
                </p>
              </div>
            </aside>

            <div className="md:col-span-7 md:row-start-1">
              {finSession ? (
                <div className="border-t border-border pt-8">
                  <Message type={finSession.type}>{finSession.texte}</Message>
                  {URL_MON_COMPTE && (
                    <a href={URL_MON_COMPTE} className="btn-primary mt-6 w-full sm:w-auto text-center">Accéder à mon espace</a>
                  )}
                </div>
              ) : session ? (
                <div className="border-t border-border pt-8">
                  <Message type="info">
                    Votre compte est créé pour <strong>{session.email}</strong>. Si votre abonnement n’est pas encore réglé, passez au paiement. Si vous venez de payer, ne recommencez pas : vous recevrez un e-mail dès que votre abonnement sera actif.
                  </Message>
                  {erreurGenerale && <Message type="error" className="mt-4"><TexteErreur texte={erreurGenerale} /></Message>}
                  {cgvChangee && (
                    <div className="mt-4">
                      <Message type="info">{MESSAGE_CGV_A_REACCEPTER}</Message>
                      <label className="mt-4 flex items-start gap-3 text-sm text-muted leading-relaxed">
                        <input
                          id="champ-nouvelle-cgv"
                          type="checkbox"
                          checked={nouvelleCgvAcceptee}
                          disabled={envoi}
                          onChange={(e) => setNouvelleCgvAcceptee(e.target.checked)}
                          className="mt-1 w-4 h-4 shrink-0 accent-[#1c4b38]"
                        />
                        <span>
                          J’ai lu et j’accepte les{" "}
                          <Link to={cheminCgv(cgv.version)} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>{" "}
                          (version {cgv.version}).
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <button type="button" className="btn-primary w-full sm:w-auto text-center disabled:opacity-60 disabled:cursor-wait" disabled={envoi || (cgvChangee && !nouvelleCgvAcceptee)} aria-busy={envoi} onClick={reprendrePaiement}>
                      {envoi ? "Redirection…" : "Passer au paiement"}
                    </button>
                    <button type="button" onClick={autreCompte} disabled={envoi} className="link-underline text-[15px] text-left">
                      Ce n’est pas le bon compte ?
                    </button>
                  </div>
                  {/* Le checkout envoie la version de cette page : le visiteur doit voir ce qu'il accepte, sans case à cocher ici.
                      Après un 409 CGV_VERSION_OBSOLETE, la case ci-dessus la remplace. */}
                  {!cgvChangee && (
                    <p className="text-muted text-[13px] leading-relaxed mt-4">
                      En passant au paiement, vous acceptez les{" "}
                      <Link to={LIEN_CGV} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>.
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={soumettre} noValidate className="border-t border-border pt-8">
                  {URL_MON_COMPTE && (
                    <p className="text-muted text-[15px] mb-8">
                      Vous avez déjà un compte ? <a href={URL_MON_COMPTE} className="link-underline">Reprenez depuis votre espace</a>
                    </p>
                  )}
                  <fieldset className="mb-12">
                    <legend className="text-ink font-serif text-[24px] mb-6">Le responsable du compte</legend>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                      <Champ label="Prénom" name="prenom" valeur={valeurs.prenom} erreur={erreurs.prenom} onChange={modifier} autoComplete="given-name" maxLength={BORNES.prenom} />
                      <Champ label="Nom" name="nom" valeur={valeurs.nom} erreur={erreurs.nom} onChange={modifier} autoComplete="family-name" maxLength={BORNES.nom} />
                      <div className="sm:col-span-2">
                        <Champ label="Adresse e-mail" name="email" type="email" valeur={valeurs.email} erreur={erreurs.email} onChange={modifier} autoComplete="email" maxLength={BORNES.email} />
                      </div>
                      <Champ label="Mot de passe" name="motDePasse" type="password" valeur={valeurs.motDePasse} erreur={erreurs.motDePasse} onChange={modifier} autoComplete="new-password" maxLength={MAX_SAISIE_MOT_DE_PASSE} aide="8 caractères minimum, avec au moins une lettre et un chiffre." />
                      <Champ label="Confirmation du mot de passe" name="confirmation" type="password" valeur={valeurs.confirmation} erreur={erreurs.confirmation} onChange={modifier} autoComplete="new-password" maxLength={MAX_SAISIE_MOT_DE_PASSE} />
                    </div>
                  </fieldset>

                  <fieldset className="mb-8">
                    <legend className="text-ink font-serif text-[24px] mb-6">L’établissement</legend>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                      <Champ label="Nom commercial" name="nomCommercial" valeur={valeurs.nomCommercial} erreur={erreurs.nomCommercial} onChange={modifier} autoComplete="organization" maxLength={BORNES.nomCommercial} />
                      <Champ label="Raison sociale" name="raisonSociale" valeur={valeurs.raisonSociale} erreur={erreurs.raisonSociale} onChange={modifier} maxLength={BORNES.raisonSociale} />
                      <div className="sm:col-span-2">
                        <Champ label="SIRET" name="siret" valeur={valeurs.siret} erreur={erreurs.siret} onChange={modifier} inputMode="numeric" autoComplete="off" aide="14 chiffres." maxLength={20} />
                      </div>
                      <div className="sm:col-span-2">
                        <Champ label="Adresse" name="ligne1" valeur={valeurs.ligne1} erreur={erreurs.ligne1} onChange={modifier} autoComplete="address-line1" maxLength={BORNES.ligne1} />
                      </div>
                      <div className="sm:col-span-2">
                        <Champ label="Complément d’adresse" name="ligne2" facultatif valeur={valeurs.ligne2} erreur={erreurs.ligne2} onChange={modifier} autoComplete="address-line2" maxLength={BORNES.ligne2} />
                      </div>
                      <Champ label="Code postal" name="codePostal" valeur={valeurs.codePostal} erreur={erreurs.codePostal} onChange={modifier} inputMode="numeric" autoComplete="postal-code" maxLength={5} />
                      <Champ label="Ville" name="ville" valeur={valeurs.ville} erreur={erreurs.ville} onChange={modifier} autoComplete="address-level2" maxLength={BORNES.ville} />
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
                        <Link to={cgvChangee ? cheminCgv(cgv.version) : LIEN_CGV} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>{" "}
                        ({cgvChangee && <>version {cgv.version}, </>}et leur annexe, l’<Link to={LIEN_ACCORD} target="_blank" rel="noopener noreferrer" className="link-underline">accord de sous-traitance des données</Link>) et les{" "}
                        <Link to={LIEN_CGU} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales d’utilisation</Link>
                      </span>
                    </label>
                    {erreurs.cgv && <p id="champ-cgv-erreur" className="text-[#8a2424] text-[14px] mt-1.5">{erreurs.cgv}</p>}
                  </div>

                  {erreurGenerale && <Message type="error" className="mt-6"><TexteErreur texte={erreurGenerale} /></Message>}

                  <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                    <button type="submit" className="btn-primary w-full sm:w-auto text-center disabled:opacity-60 disabled:cursor-wait" disabled={envoi} aria-busy={envoi}>
                      {envoi ? "Envoi en cours…" : "Créer mon compte et payer"}
                    </button>
                    <span className="text-faint text-sm">Besoin d’aide ? {BUSINESS.phone.display}</span>
                  </div>

                  <p className="text-muted text-[13px] leading-relaxed mt-6">
                    Pour savoir comment nous traitons vos données, lisez notre{" "}
                    <Link to="/confidentialite" target="_blank" rel="noopener noreferrer" className="link-underline">politique de confidentialité</Link>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
