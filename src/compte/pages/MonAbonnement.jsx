import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Message from "@/components/billing/Message";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { annulerResiliation, getCompteEspace, ouvrirPortail, resilier, seDeconnecter, telechargerExport } from "@/lib/billing/api";
import { BILLING_MOCK } from "@/lib/billing/config";
import { MESSAGE_TROP_D_ESSAIS } from "@/lib/billing/erreurs";
import {
  DEBUT_CONTACT_FORMULE,
  DEBUT_CONTACT_SOUSCRIRE,
  LIBELLE_GARDER_ABONNEMENT,
  TEXTE_DECONNECTE,
  TEXTE_EXPORT_A_LA_FIN,
  TEXTE_MISE_A_JOUR_ETAT,
  TEXTE_RESILIATION_ANNULEE,
  TEXTE_SESSION_EXPIREE,
  TEXTE_SUPPORT,
  ecrireSessionEspace,
  effacerSessionEspace,
  estSessionFinie,
  issueResiliation,
  lireSessionEspace,
  messageRefusEspace,
  nomFichierExport,
  resumeCompte,
  retenirRetour,
  texteResiliationEnregistree,
  urlPortail,
} from "@/lib/billing/espace";

const CLASSE_CHAMP =
  "w-full border border-faint bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";
const BOUTON_SECONDAIRE =
  "border border-ink px-5 py-3 text-[15px] text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-60 disabled:cursor-wait text-center";
// erreur : refus d'une action, sous l'état du compte. erreurMotDePasse et erreurConfirmation : refus de la résiliation
// ou de son annulation, dans le formulaire de confirmation (sous le champ), qui reste ouvert. info : message en tête de
// page ; infoResiliation : il remplace le bandeau de la résiliation programmée, qui dirait la même chose ;
// infoApresRelecture : il parle de l'état relu, et n'est affiché et lu qu'une fois le compte relu.
const ACTION_VIDE = { enCours: null, erreur: null, erreurMotDePasse: null, erreurConfirmation: null, info: null, infoResiliation: false, infoApresRelecture: false };
const ID_CHAMP_MDP = "champ-confirmation-mdp";

function Support() {
  return (
    <p className="text-muted text-[15px] leading-relaxed mt-12 pt-6 border-t border-border">
      {TEXTE_SUPPORT} <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>
      {" · "}
      <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>
    </p>
  );
}

// Mot de passe redemandé avant de résilier ou d'annuler une résiliation (demande 5). Le champ est vidé après chaque essai.
// erreur : mot de passe refusé, sous le champ. alerte : autre refus (429, 403…), sous le champ aussi : sur téléphone, un
// message en haut de page serait hors de l'écran. attenteJusqua : fin du délai d'un 429, bouton désactivé jusque-là,
// même si le formulaire a été fermé puis rouvert entre-temps. Les deux messages décrivent le champ, qui reprend le focus.
function ConfirmationParMotDePasse({ titre, explication, libelle, enCours, erreur, alerte, attenteJusqua, onConfirmer, onRenoncer, libelleRenoncer }) {
  const [motDePasse, setMotDePasse] = useState("");
  const [bloque, setBloque] = useState(() => (attenteJusqua ?? 0) > Date.now());
  const champ = useRef(null);
  useEffect(() => {
    champ.current?.focus();
  }, []);
  useEffect(() => {
    // Après un refus, le champ (désactivé pendant l'envoi) reprend le focus ; le message est juste dessous.
    if (!enCours && (erreur || alerte)) champ.current?.focus();
  }, [enCours, erreur, alerte]);
  useEffect(() => {
    const reste = (attenteJusqua ?? 0) - Date.now();
    setBloque(reste > 0);
    if (reste <= 0) return undefined;
    const minuteur = setTimeout(() => setBloque(false), reste);
    return () => clearTimeout(minuteur);
  }, [attenteJusqua]);
  // Formulaire rouvert pendant le délai d'un 429 : le refus d'avant n'est plus là, la raison du bouton désactivé l'est.
  const message = alerte ?? (bloque ? MESSAGE_TROP_D_ESSAIS : null);
  const decrit = [erreur && `${ID_CHAMP_MDP}-erreur`, message && `${ID_CHAMP_MDP}-alerte`].filter(Boolean).join(" ") || undefined;
  const envoyer = (e) => {
    e.preventDefault();
    if (enCours || bloque || !motDePasse) return;
    const valeur = motDePasse;
    setMotDePasse("");
    onConfirmer(valeur);
  };
  return (
    <form onSubmit={envoyer} noValidate className="mt-6 border border-border bg-white p-5 md:p-6">
      <h3 className="text-ink text-[20px] mb-3">{titre}</h3>
      <p className="text-muted text-[15px] leading-relaxed mb-5">{explication}</p>
      <label htmlFor={ID_CHAMP_MDP} className="block text-muted text-[14px] mb-2">Votre mot de passe</label>
      <input
        id={ID_CHAMP_MDP}
        ref={champ}
        name="password"
        type="password"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={enCours}
        aria-invalid={erreur ? "true" : undefined}
        aria-describedby={decrit}
        className={CLASSE_CHAMP}
      />
      {erreur && <p id={`${ID_CHAMP_MDP}-erreur`} role="alert" className="text-[#8a2424] text-[14px] mt-1.5">{erreur}</p>}
      {message && <Message id={`${ID_CHAMP_MDP}-alerte`} type="error" className="mt-4">{message}</Message>}
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button type="submit" disabled={enCours || bloque || !motDePasse} aria-busy={enCours} className="btn-primary text-center disabled:opacity-60 disabled:cursor-wait">
          {enCours ? "Envoi…" : libelle}
        </button>
        <button type="button" disabled={enCours} onClick={onRenoncer} className={BOUTON_SECONDAIRE}>{libelleRenoncer}</button>
      </div>
    </form>
  );
}

function ChoixRestaurant({ restaurants, onChoisir }) {
  return (
    <>
      <p className="text-muted text-lg leading-relaxed mb-6">Vous êtes titulaire de plusieurs établissements. Lequel voulez-vous gérer ?</p>
      <ul className="flex flex-col gap-3">
        {restaurants.map((r) => (
          <li key={r.restaurantId}>
            <button type="button" onClick={() => onChoisir(r.restaurantId)} className={`${BOUTON_SECONDAIRE} w-full sm:w-auto`}>{r.nom}</button>
          </li>
        ))}
      </ul>
    </>
  );
}

// Espace abonnement (session « site » de 2 h). Portée de la session minimale d'Apirest : état, portail Stripe, résiliation
// et son annulation, export complet, déconnexion. Le reste (comptes, formule, transfert, paiement) passe par le support.
//
// Chaque requête est liée à l'établissement et à la session qui l'ont lancée (contexte) : son résultat est ignoré si
// l'utilisateur a changé d'établissement ou s'est déconnecté entre-temps. Pendant une action, on ne peut ni changer
// d'établissement ni se déconnecter.
export default function MonAbonnement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(() => lireSessionEspace());
  // compte : celui de l'établissement etat.restaurantId seulement.
  const [etat, setEtat] = useState({ chargement: true, restaurantId: null, compte: null, erreur: null });
  const [relance, setRelance] = useState(0);
  const [confirmation, setConfirmation] = useState(null); // null, "resilier", "annuler"
  const [action, setAction] = useState(ACTION_VIDE);
  // Fin du délai demandé par un 429 sur la résiliation ou son annulation : hors d'ACTION_VIDE, pour survivre à la
  // fermeture et à la réouverture du formulaire. Effacée au changement d'établissement et au retour depuis Stripe.
  const [attenteJusqua, setAttenteJusqua] = useState(null);
  const [annonce, setAnnonce] = useState("");
  const titreRef = useRef(null);
  const contexteCourant = useRef(null);
  contexteCourant.current = session ? `${session.token}|${session.restaurantId ?? ""}` : null;

  const finDeSession = useCallback(
    (message) => {
      contexteCourant.current = null;
      effacerSessionEspace();
      navigate(CHEMINS_COMPTE.connexion, { replace: true, state: { message } });
    },
    [navigate],
  );

  const focusTitre = () => requestAnimationFrame(() => titreRef.current?.focus());

  useEffect(() => {
    document.title = "Mon abonnement · RestOclair";
    focusTitre();
  }, []);

  // Fin de la session à son échéance, même si la page reste ouverte sans rien faire.
  useEffect(() => {
    if (!session?.echeance) return undefined;
    const minuteur = setTimeout(() => finDeSession(TEXTE_SESSION_EXPIREE), Math.max(0, session.echeance - Date.now()));
    return () => clearTimeout(minuteur);
  }, [session?.echeance, finDeSession]);

  // Retour arrière depuis Stripe (page restaurée par le navigateur) : rien n'est plus « en cours », et on relit.
  useEffect(() => {
    const auRetour = (e) => {
      if (!e.persisted) return;
      setAction(ACTION_VIDE);
      setConfirmation(null);
      setAttenteJusqua(null);
      const relue = lireSessionEspace();
      if (!relue) finDeSession(TEXTE_SESSION_EXPIREE);
      else {
        setSession(relue);
        setRelance((n) => n + 1);
      }
    };
    window.addEventListener("pageshow", auRetour);
    return () => window.removeEventListener("pageshow", auRetour);
  }, [finDeSession]);

  const restaurant = session?.restaurants?.find((r) => r.restaurantId === session.restaurantId) ?? null;

  useEffect(() => {
    if (!session?.restaurantId) return undefined;
    let arrete = false;
    const restaurantId = session.restaurantId;
    setEtat((e) => (e.restaurantId === restaurantId ? { ...e, chargement: true, erreur: null } : { chargement: true, restaurantId, compte: null, erreur: null }));
    getCompteEspace(session.token, restaurantId)
      .then((compte) => {
        if (!arrete) setEtat({ chargement: false, restaurantId, compte, erreur: null });
      })
      .catch((erreur) => {
        if (arrete) return;
        if (estSessionFinie(erreur)) finDeSession(TEXTE_SESSION_EXPIREE);
        else setEtat({ chargement: false, restaurantId, compte: null, erreur: messageRefusEspace(erreur) });
      });
    return () => {
      arrete = true;
    };
  }, [session?.token, session?.restaurantId, relance, finDeSession]);

  const compteAffiche = session && etat.restaurantId === session.restaurantId ? etat.compte : null;
  const resume = compteAffiche ? resumeCompte(compteAffiche) : null;

  // Confirmation dont l'action n'est plus proposée (le compte relu montre la résiliation déjà programmée, ou déjà
  // annulée) : fermée, au lieu de rester ouverte sous un autre titre.
  const resilierPropose = Boolean(resume?.actions.resilier);
  const annulerPropose = Boolean(resume?.actions.annulerResiliation);
  const confirmationOuverte =
    (confirmation === "resilier" && resilierPropose) || (confirmation === "annuler" && annulerPropose) ? confirmation : null;
  useEffect(() => {
    if (confirmation && !confirmationOuverte) setConfirmation(null);
  }, [confirmation, confirmationOuverte]);

  // Message d'une issue « relire » (réponse perdue, 409) : il parle de l'état relu ; affiché et lu seulement une fois le
  // compte relu, jamais sur l'état d'avant. Pendant la relecture : TEXTE_MISE_A_JOUR_ETAT.
  const infoEnAttente = Boolean(action.info && action.infoApresRelecture && (etat.chargement || !compteAffiche));
  const infoRelue = Boolean(action.info && action.infoApresRelecture && !infoEnAttente);
  useEffect(() => {
    if (infoRelue) setAnnonce(action.info);
  }, [infoRelue, action.info]);

  if (!session) {
    retenirRetour(`${location.pathname}${location.search}`);
    return <Navigate to={CHEMINS_COMPTE.connexion} replace />;
  }

  const occupe = Boolean(action.enCours);

  const choisir = (restaurantId) => {
    if (occupe) return;
    const suivante = { ...session, restaurantId };
    ecrireSessionEspace(suivante);
    setSession(suivante);
    setEtat({ chargement: Boolean(restaurantId), restaurantId, compte: null, erreur: null });
    setConfirmation(null);
    setAction(ACTION_VIDE);
    setAttenteJusqua(null);
    setAnnonce("");
    focusTitre();
  };

  // Relit le compte, en chargement dès ce rendu-ci : rien ne s'affiche ni ne s'annonce comme relu avant la réponse.
  const relire = () => {
    setEtat((e) => ({ ...e, chargement: true, erreur: null }));
    setRelance((n) => n + 1);
  };

  const deconnecter = async () => {
    if (occupe) return;
    setAction({ ...ACTION_VIDE, enCours: "deconnexion" });
    const token = session.token;
    contexteCourant.current = null;
    await seDeconnecter(token).catch(() => {});
    finDeSession(TEXTE_DECONNECTE);
  };

  // Lance une action liée au contexte actuel ; le résultat n'est appliqué que si le contexte n'a pas changé.
  const lancer = async (nom, travail, reussite, refus) => {
    const contexte = contexteCourant.current;
    setAction({ ...ACTION_VIDE, enCours: nom });
    setAnnonce("");
    try {
      const resultat = await travail(session.token, session.restaurantId);
      if (contexteCourant.current !== contexte) return;
      reussite(resultat);
    } catch (erreur) {
      if (contexteCourant.current !== contexte) return;
      if (estSessionFinie(erreur)) {
        finDeSession(TEXTE_SESSION_EXPIREE);
        return;
      }
      if (refus?.(erreur)) return;
      setAction({ ...ACTION_VIDE, erreur: messageRefusEspace(erreur) });
    }
  };

  const portail = () =>
    lancer("portail", ouvrirPortail, (adresse) => {
      const url = urlPortail(adresse, BILLING_MOCK ? window.location.origin : null);
      if (!url) {
        setAction({ ...ACTION_VIDE, erreur: messageRefusEspace(null) });
        return;
      }
      window.location.assign(url);
    });

  // Après une réponse perdue ou un 409, le formulaire se ferme et le compte est relu : le message, en tête de page une
  // fois le compte relu, invite à vérifier l'état avant de recommencer (issueResiliation). Pendant la relecture, les
  // boutons de la résiliation sont désactivés.
  const confirmerResiliation = (motDePasse) => {
    const geste = confirmation;
    const annulation = geste === "annuler";
    // Date annoncée avant la confirmation : reprise si le serveur n'en rend pas (comme l'app).
    const effetAnnonce = resume?.resiliation.effetLe ?? null;
    const travail = annulation
      ? (token, restaurantId) => annulerResiliation(token, restaurantId, motDePasse)
      : (token, restaurantId) => resilier(token, restaurantId, motDePasse);
    lancer(
      geste,
      travail,
      (resultat) => {
        const effetLe = annulation ? null : (resultat?.effetLe ?? effetAnnonce);
        const info = annulation ? TEXTE_RESILIATION_ANNULEE : texteResiliationEnregistree(effetLe);
        // Le compte est mis à jour tout de suite (pas de bouton « Résilier » qui réapparaît), puis relu. Une résiliation
        // sans date lisible reste une résiliation programmée (resumeCompte).
        setEtat((e) =>
          e.compte ? { ...e, compte: { ...e.compte, resiliation: annulation ? null : { effetLe: effetLe ?? null } } } : e,
        );
        setAction({ ...ACTION_VIDE, info, infoResiliation: true });
        setAnnonce(info);
        setConfirmation(null);
        relire();
        focusTitre();
      },
      (erreur) => {
        const issue = issueResiliation(erreur);
        if (issue.type === "mot_de_passe") setAction({ ...ACTION_VIDE, erreurMotDePasse: issue.texte });
        else if (issue.type === "relire") {
          setConfirmation(null);
          setAction({ ...ACTION_VIDE, info: issue.texte, infoApresRelecture: true });
          setAnnonce(TEXTE_MISE_A_JOUR_ETAT);
          relire();
          focusTitre();
        } else {
          setAction({ ...ACTION_VIDE, erreurConfirmation: issue.texte });
          if (issue.attenteMs) setAttenteJusqua(Date.now() + issue.attenteMs);
        }
        return true;
      },
    );
  };

  const exporter = () => {
    const nom = nomFichierExport(restaurant?.nom);
    lancer("export", telechargerExport, (fichier) => {
      const adresse = URL.createObjectURL(fichier);
      const lien = document.createElement("a");
      lien.href = adresse;
      lien.download = nom;
      document.body.append(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(adresse), 60000);
      const info = `Le téléchargement de ${nom} a commencé.`;
      setAction({ ...ACTION_VIDE, info });
      setAnnonce(info);
    });
  };

  const renoncer = () => {
    setConfirmation(null);
    setAction(ACTION_VIDE);
    focusTitre();
  };

  // Le message de confirmation d'une résiliation remplace le bandeau qui dit la même chose.
  const bandeaux = resume ? resume.bandeaux.filter((b) => !(action.infoResiliation && b.cle === "resiliation")) : [];
  const maquettePortail = BILLING_MOCK && new URLSearchParams(location.search).get("maquette") === "portail";

  return (
    <section className="pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="max-w-[760px] mx-auto px-5 md:px-6">
        {/* Zone d'annonce permanente : les confirmations y sont lues par les lecteurs d'écran. */}
        <p className="sr-only" role="status" aria-live="polite">{annonce}</p>

        <div className="flex items-start justify-between gap-4 mb-5">
          <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] pt-1">Mon abonnement</p>
          <button type="button" onClick={deconnecter} disabled={occupe} className="link-underline text-[15px] disabled:opacity-60">
            {action.enCours === "deconnexion" ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>

        {!session.restaurantId ? (
          <>
            <h1 ref={titreRef} tabIndex={-1} className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)] focus:outline-none">Choisissez l’établissement.</h1>
            <ChoixRestaurant restaurants={session.restaurants ?? []} onChoisir={choisir} />
          </>
        ) : (
          <>
            <h1 ref={titreRef} tabIndex={-1} className="text-ink mb-2 text-[clamp(2rem,5vw,3rem)] focus:outline-none">{restaurant?.nom ?? "Votre établissement"}</h1>
            {(session.restaurants?.length ?? 0) > 1 && (
              <button type="button" disabled={occupe} className="link-underline text-[15px] mb-6 disabled:opacity-60" onClick={() => choisir(null)}>
                Changer d’établissement
              </button>
            )}

            {maquettePortail && <Message type="info" className="mt-4">Maquette : ici s’ouvrirait le portail Stripe (factures, moyen de paiement).</Message>}
            {/* Lu par la zone d'annonce ci-dessus : le bandeau visible n'est pas une seconde annonce. */}
            {action.info && !infoEnAttente && <Message type="info" role="note" className="mt-4">{action.info}</Message>}
            {infoEnAttente && etat.chargement && compteAffiche && <p className="text-muted text-[15px] mt-4">{TEXTE_MISE_A_JOUR_ETAT}</p>}

            {etat.chargement && !compteAffiche && <p className="text-muted text-lg mt-6">Chargement de votre abonnement…</p>}

            {etat.erreur && etat.restaurantId === session.restaurantId && (
              <>
                <Message type="error" className="mt-6">{etat.erreur}</Message>
                <button type="button" className="link-underline text-[15px] mt-4" onClick={() => setRelance((n) => n + 1)}>Réessayer</button>
              </>
            )}

            {resume && (
              <>
                {bandeaux.map((b) => (
                  <Message key={b.cle ?? b.texte} type={b.type} className="mt-6">{b.texte}</Message>
                ))}

                <dl className="mt-8 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 gap-y-3 text-[16px]">
                  {resume.lignes.map(([terme, valeur]) => (
                    <React.Fragment key={terme}>
                      <dt className="text-faint">{terme}</dt>
                      <dd className="text-ink min-w-0 [overflow-wrap:anywhere]">{valeur}</dd>
                    </React.Fragment>
                  ))}
                </dl>

                {action.erreur && <Message type="error" className="mt-8">{action.erreur}</Message>}

                <div className="mt-10 flex flex-col gap-8">
                  {resume.actions.souscrire && (
                    <div>
                      <h2 className="text-ink text-[22px] mb-2">Souscrire un abonnement</h2>
                      <p className="text-muted text-[15px] leading-relaxed">
                        {DEBUT_CONTACT_SOUSCRIRE}
                        <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>
                        {" ou "}
                        <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
                      </p>
                    </div>
                  )}

                  {resume.actions.portail && (
                    <div>
                      <h2 className="text-ink text-[22px] mb-2">Factures et moyen de paiement</h2>
                      <p className="text-muted text-[15px] leading-relaxed mb-4">
                        Vos factures, votre moyen de paiement et le règlement d’une facture en attente se gèrent sur le portail sécurisé de Stripe.
                      </p>
                      <button type="button" onClick={portail} disabled={occupe} aria-busy={action.enCours === "portail"} className="btn-primary text-center disabled:opacity-60 disabled:cursor-wait">
                        {action.enCours === "portail" ? "Ouverture…" : "Ouvrir le portail de paiement"}
                      </button>
                    </div>
                  )}

                  {resume.actions.contactFormule && (
                    <div>
                      <h2 className="text-ink text-[22px] mb-2">Formule et comptes</h2>
                      <p className="text-muted text-[15px] leading-relaxed">
                        {DEBUT_CONTACT_FORMULE}
                        <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>
                        {" ou "}
                        <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
                      </p>
                    </div>
                  )}

                  {resume.actions.export && (
                    <div>
                      <h2 className="text-ink text-[22px] mb-2">Export de vos données</h2>
                      <p className="text-muted text-[15px] leading-relaxed mb-4">
                        Téléchargez l’export complet des données de l’établissement (fichier ZIP).
                      </p>
                      <button type="button" onClick={exporter} disabled={occupe} aria-busy={action.enCours === "export"} className={BOUTON_SECONDAIRE}>
                        {action.enCours === "export" ? "Préparation de l’export…" : "Télécharger l’export (ZIP)"}
                      </button>
                    </div>
                  )}

                  {resume.actions.exportALaFin && (
                    <div>
                      <h2 className="text-ink text-[22px] mb-2">Export de vos données</h2>
                      <p className="text-muted text-[15px] leading-relaxed">{TEXTE_EXPORT_A_LA_FIN}</p>
                    </div>
                  )}

                  {(resume.actions.resilier || resume.actions.annulerResiliation) && (
                    <div>
                      <h2 className="text-ink text-[22px] mb-2">{resume.actions.annulerResiliation ? "Résiliation programmée" : "Résilier l’abonnement"}</h2>
                      {confirmationOuverte === null && (
                        <>
                          <p className="text-muted text-[15px] leading-relaxed mb-4">
                            {resume.actions.annulerResiliation
                              ? "Vous pouvez annuler la résiliation jusqu’à sa date d’effet : l’abonnement continue alors normalement."
                              : resume.resiliation.confirmation}
                          </p>
                          <button
                            type="button"
                            disabled={occupe || etat.chargement}
                            onClick={() => {
                              setAction(ACTION_VIDE);
                              setConfirmation(resume.actions.annulerResiliation ? "annuler" : "resilier");
                            }}
                            className={BOUTON_SECONDAIRE}
                          >
                            {resume.actions.annulerResiliation ? "Annuler la résiliation" : "Résilier l’abonnement"}
                          </button>
                        </>
                      )}
                      {confirmationOuverte === "resilier" && (
                        <ConfirmationParMotDePasse
                          titre="Confirmer la résiliation"
                          explication={`${resume.resiliation.confirmation} Pour confirmer, saisissez le mot de passe de votre compte.`}
                          libelle="Confirmer la résiliation"
                          libelleRenoncer={LIBELLE_GARDER_ABONNEMENT}
                          enCours={action.enCours === "resilier"}
                          erreur={action.erreurMotDePasse}
                          alerte={action.erreurConfirmation}
                          attenteJusqua={attenteJusqua}
                          onConfirmer={confirmerResiliation}
                          onRenoncer={renoncer}
                        />
                      )}
                      {confirmationOuverte === "annuler" && (
                        <ConfirmationParMotDePasse
                          titre="Annuler la résiliation"
                          explication="Pour confirmer, saisissez le mot de passe de votre compte. Votre abonnement continuera normalement."
                          libelle="Annuler la résiliation"
                          libelleRenoncer="Ne rien changer"
                          enCours={action.enCours === "annuler"}
                          erreur={action.erreurMotDePasse}
                          alerte={action.erreurConfirmation}
                          attenteJusqua={attenteJusqua}
                          onConfirmer={confirmerResiliation}
                          onRenoncer={renoncer}
                        />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <Support />
      </div>
    </section>
  );
}
