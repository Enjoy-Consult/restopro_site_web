import React, { useEffect, useReducer, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import AjoutComptes from "@/components/billing/AjoutComptes";
import Etapes from "@/components/billing/Etapes";
import LienReprise from "@/components/billing/LienReprise";
import Message from "@/components/billing/Message";
import Recapitulatif from "@/components/billing/Recapitulatif";
import { BUSINESS } from "@/lib/business-info";
import { getCatalogue, inscrire, lancerCheckout } from "@/lib/billing/api";
import { APP_WEB_URL } from "@/lib/billing/config";
import LienEspace from "@/components/billing/LienEspace";
import { calculer, nombreAjouts, selectionDepuisQuery, selectionVersCheckout, selectionVersQuery } from "@/lib/billing/pricing";
import { MESSAGE_CGV_A_REACCEPTER, MESSAGE_INDISPONIBLE, PHRASE_ESSAI_INTERROMPU, decouperLien, erreursDeValidation, estActivationEnCoursRefus, messageCatalogue, messageErreur, traiterFinDeSession } from "@/lib/billing/erreurs";
import { blocCgv, cgvAReaccepter, cheminCgv, cheminVersionne, corpsInscription, etatCgvDepart, garderCgv, lireSaisie, mentionsAbonnement, paiementBloqueParCgv, retenirExplicationChoix, retenirSaisie, suivreCgv, suivrePaiement } from "@/lib/billing/inscription";
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

// Pas de mot de passe : le titulaire reçoit ses identifiants par e-mail après le paiement (CGV 0.2, article 4.7).
const VIDE = {
  prenom: "", nom: "", email: "", confirmationEmail: "",
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

// Message général : « reprendre votre inscription » mène à la page de reprise, avec l'adresse connue ;
// « votre espace abonnement » mène à compte.restoclair.fr/mon-abonnement ; une panne donne le téléphone.
function TexteErreur({ texte, email }) {
  const { avant, lien, apres } = decouperLien(texte);
  return (
    <>
      {avant}
      {lien?.type === "reprise" && <LienReprise email={email}>{lien.texte}</LienReprise>}
      {lien?.type === "espace" && <LienEspace>{lien.texte}</LienEspace>}
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

  // Retour de « Modifier mon choix » : la saisie gardée en mémoire revient, sans la case d'acceptation.
  const [valeurs, setValeurs] = useState(() => ({ ...VIDE, ...lireSaisie() }));
  const [erreurs, setErreurs] = useState({});
  const [session, setSession] = useState(() => lireSession());
  const [envoi, setEnvoi] = useState(false);
  const [erreurGenerale, setErreurGenerale] = useState(null);
  // Version des CGV envoyée : celle de cette page, puis celle qu'un 409 CGV_VERSION_OBSOLETE demande d'accepter.
  // La case du panneau « compte créé » n'apparaît qu'après un 409 au Checkout (voir suivreCgv).
  const [etatCgv, majCgv] = useReducer(suivreCgv, CGV, etatCgvDepart);
  const { cgv } = etatCgv;
  const paiementBloque = paiementBloqueParCgv(etatCgv);
  const lienCgv = etatCgv.versionRecue ? cheminCgv(cgv.version) : LIEN_CGV;
  const caseCgvRef = useRef(null);
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

  // 409 au Checkout : le formulaire a disparu ou le bouton reste désactivé, le focus va sur la case à cocher,
  // qui porte le message. Chaque refus apporte un nouveau bloc cgv, donc un nouveau passage ici.
  useEffect(() => {
    if (etatCgv.aAccepterAuPaiement && caseCgvRef.current) caseCgvRef.current.focus();
  }, [etatCgv.aAccepterAuPaiement, etatCgv.cgv]);

  // Refus des CGV à l'inscription : le focus va sur la case une fois rendue, décochée et reliée à son message.
  const [focusCaseCgv, setFocusCaseCgv] = useState(0);
  useEffect(() => {
    if (focusCaseCgv) document.getElementById("champ-cgv")?.focus();
  }, [focusCaseCgv]);

  // La version reçue survit à « Modifier mon choix » (mémoire de module, rien dans le navigateur).
  useEffect(() => {
    garderCgv(etatCgv);
  }, [etatCgv]);

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
        majCgv({ type: "refus-paiement", cgv: nouvelle });
        setEnvoi(false);
        envoiEnCours.current = false;
        return;
      }
      const fin = traiterFinDeSession(erreur);
      const explication = fin ? null : expliquerChoix(erreur);
      if (fin) {
        // L'adresse du compte suit vers la page de reprise : celle de la session, ou celle que le formulaire vient d'envoyer.
        setFinSession({ ...fin, email: session?.email || valeurs.email.trim() });
        setSession(null);
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
      // La case du formulaire était cochée pour exactement ce bloc : rien à refaire accepter au paiement.
      majCgv({ type: "compte-cree" });
      await paiement(token);
    } catch (erreur) {
      if (erreur.code === "EMAIL_DEJA_UTILISE") {
        // Pas de mot de passe avant le paiement : une inscription interrompue se reprend par un lien reçu par e-mail.
        setErreurs({
          email: (
            <>
              Un compte existe déjà avec cet e-mail. <TexteErreur texte={PHRASE_ESSAI_INTERROMPU} email={valeurs.email} /> Si votre abonnement est
              déjà actif,{" "}
              {APP_WEB_URL ? <a href={APP_WEB_URL} className="link-underline">connectez-vous à l’application</a> : "connectez-vous à l’application"}.
            </>
          ),
        });
        document.getElementById("champ-email")?.focus();
      } else if (cgvAReaccepter(erreur)) {
        // Les CGV ont changé depuis le chargement de la page : la case affiche la nouvelle version, à cocher de nouveau.
        majCgv({ type: "refus-inscription", cgv: cgvAReaccepter(erreur) });
        setValeurs((v) => ({ ...v, cgv: false }));
        setErreurs({ cgv: MESSAGE_CGV_A_REACCEPTER });
        setFocusCaseCgv((n) => n + 1);
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
        setFocusCaseCgv((n) => n + 1);
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
    if (paiementBloque) return;
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
    majCgv({ type: "autre-compte" });
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
            Vous n’avez pas de mot de passe à choisir : vos identifiants de connexion vous sont envoyés par e-mail dès la signature du mandat SEPA ou le paiement par carte.
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
                  <Message type={finSession.type}><TexteErreur texte={finSession.texte} email={finSession.email} /></Message>
                  {finSession.type === "error" ? (
                    <LienReprise email={finSession.email} className="btn-primary mt-6 w-full sm:w-auto text-center">Recevoir un lien de reprise</LienReprise>
                  ) : (
                    <LienEspace className="btn-primary mt-6 w-full sm:w-auto text-center">Accéder à mon espace abonnement</LienEspace>
                  )}
                </div>
              ) : session ? (
                <div className="border-t border-border pt-8">
                  <Message type="info">
                    {/* Texte du contrat d'Apirest (identifiants: "par_email"). Après une reprise, l'adresse n'est pas renvoyée : le nom de l'établissement la remplace. */}
                    {session.email ? (
                      <>Votre compte est créé. Vos identifiants de connexion vous seront envoyés à <strong>{session.email}</strong> dès la signature du mandat SEPA ou le paiement par carte.</>
                    ) : (
                      <>
                        Votre compte est créé{session.restaurant && <> pour <strong>{session.restaurant}</strong></>}. Vos identifiants de connexion vous seront envoyés à
                        l’adresse e-mail du compte dès la signature du mandat SEPA ou le paiement par carte.
                      </>
                    )} Si votre abonnement n’est pas encore réglé, passez au paiement. Si vous venez de payer, ne recommencez pas : vous recevrez un e-mail dès que votre abonnement sera actif.
                  </Message>
                  {erreurGenerale && <Message type="error" className="mt-4"><TexteErreur texte={erreurGenerale} email={session.email} /></Message>}
                  {etatCgv.aAccepterAuPaiement && (
                    <div className="mt-4">
                      <Message type="info" id="champ-nouvelle-cgv-message">{MESSAGE_CGV_A_REACCEPTER}</Message>
                      <label className="mt-4 flex items-start gap-3 text-sm text-muted leading-relaxed">
                        <input
                          ref={caseCgvRef}
                          id="champ-nouvelle-cgv"
                          type="checkbox"
                          checked={etatCgv.caseCochee}
                          disabled={envoi}
                          onChange={(e) => majCgv({ type: "case", cochee: e.target.checked })}
                          aria-invalid={etatCgv.caseCochee ? undefined : "true"}
                          aria-describedby="champ-nouvelle-cgv-message"
                          className="mt-1 w-4 h-4 shrink-0 accent-[#1c4b38]"
                        />
                        <span>
                          J’ai lu et j’accepte les{" "}
                          <Link to={lienCgv} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>{" "}
                          (version {cgv.version}).
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <button
                      type="button"
                      className={`btn-primary w-full sm:w-auto text-center disabled:opacity-60 ${envoi ? "disabled:cursor-wait" : "disabled:cursor-not-allowed"}`}
                      disabled={envoi || paiementBloque}
                      aria-busy={envoi}
                      aria-describedby={paiementBloque ? "champ-nouvelle-cgv-message" : undefined}
                      onClick={reprendrePaiement}
                    >
                      {envoi ? "Redirection…" : "Passer au paiement"}
                    </button>
                    <button type="button" onClick={autreCompte} disabled={envoi} className="link-underline text-[15px] text-left">
                      Ce n’est pas le bon compte ?
                    </button>
                  </div>
                  {/* Le checkout envoie la version de cette page, ou celle qu'un 409 à l'inscription a fait accepter :
                      le visiteur doit voir ce qu'il accepte, sans case à cocher ici. Après un 409 au Checkout, la case ci-dessus la remplace. */}
                  {!etatCgv.aAccepterAuPaiement && (
                    <p className="text-muted text-[13px] leading-relaxed mt-4">
                      En passant au paiement, vous acceptez les{" "}
                      <Link to={lienCgv} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>.
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={soumettre} noValidate className="border-t border-border pt-8">
                  <p className="text-muted text-[15px] mb-8">
                    Inscription commencée sans payer ? <LienReprise email={valeurs.email}>Recevez un lien pour la reprendre</LienReprise>.
                  </p>
                  <fieldset className="mb-12">
                    <legend className="text-ink font-serif text-[24px] mb-6">Le responsable du compte</legend>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                      <Champ label="Prénom" name="prenom" valeur={valeurs.prenom} erreur={erreurs.prenom} onChange={modifier} autoComplete="given-name" maxLength={BORNES.prenom} />
                      <Champ label="Nom" name="nom" valeur={valeurs.nom} erreur={erreurs.nom} onChange={modifier} autoComplete="family-name" maxLength={BORNES.nom} />
                      <div className="sm:col-span-2">
                        <Champ label="Adresse e-mail" name="email" type="email" valeur={valeurs.email} erreur={erreurs.email} onChange={modifier} autoComplete="email" maxLength={BORNES.email} aide="Vos identifiants de connexion seront envoyés à cette adresse." />
                      </div>
                      <div className="sm:col-span-2">
                        <Champ label="Confirmez votre adresse e-mail" name="confirmationEmail" type="email" valeur={valeurs.confirmationEmail} erreur={erreurs.confirmationEmail} onChange={modifier} autoComplete="email" maxLength={BORNES.email} />
                      </div>
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
                        <Link to={lienCgv} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales de vente</Link>{" "}
                        ({etatCgv.versionRecue && <>version {cgv.version}, </>}et leur annexe, l’<Link to={LIEN_ACCORD} target="_blank" rel="noopener noreferrer" className="link-underline">accord de sous-traitance des données</Link>) et les{" "}
                        <Link to={LIEN_CGU} target="_blank" rel="noopener noreferrer" className="link-underline">conditions générales d’utilisation</Link>
                      </span>
                    </label>
                    {erreurs.cgv && <p id="champ-cgv-erreur" className="text-[#8a2424] text-[14px] mt-1.5">{erreurs.cgv}</p>}
                  </div>

                  {erreurGenerale && <Message type="error" className="mt-6"><TexteErreur texte={erreurGenerale} email={valeurs.email} /></Message>}

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
