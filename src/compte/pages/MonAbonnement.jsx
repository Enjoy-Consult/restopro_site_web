import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Message from "@/components/billing/Message";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { annulerResiliation, getCompteEspace, ouvrirPortail, resilier, seDeconnecter, telechargerExport } from "@/lib/billing/api";
import { BILLING_MOCK } from "@/lib/billing/config";
import {
  TEXTE_DECONNECTE,
  TEXTE_SESSION_EXPIREE,
  TEXTE_SUPPORT,
  ecrireSessionEspace,
  effacerSessionEspace,
  estMotDePasseRefuse,
  estSessionFinie,
  lireSessionEspace,
  messageRefusEspace,
  nomFichierExport,
  resumeCompte,
  retenirRetour,
  texteResiliationEnregistree,
  urlPortail,
} from "@/lib/billing/espace";

const CLASSE_CHAMP =
  "w-full border border-border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";
const BOUTON_SECONDAIRE =
  "border border-ink px-5 py-3 text-[15px] text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-60 disabled:cursor-wait text-center";
const ACTION_VIDE = { enCours: null, erreur: null, erreurMotDePasse: null, info: null };

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
function ConfirmationParMotDePasse({ titre, explication, libelle, enCours, erreur, onConfirmer, onRenoncer, libelleRenoncer }) {
  const [motDePasse, setMotDePasse] = useState("");
  const champ = useRef(null);
  useEffect(() => {
    champ.current?.focus();
  }, []);
  useEffect(() => {
    // Après un refus, le champ (désactivé pendant l'envoi) reprend le focus.
    if (!enCours && erreur) champ.current?.focus();
  }, [enCours, erreur]);
  const envoyer = (e) => {
    e.preventDefault();
    if (enCours || !motDePasse) return;
    const valeur = motDePasse;
    setMotDePasse("");
    onConfirmer(valeur);
  };
  return (
    <form onSubmit={envoyer} noValidate className="mt-6 border border-border bg-white p-5 md:p-6">
      <h3 className="text-ink text-[20px] mb-3">{titre}</h3>
      <p className="text-muted text-[15px] leading-relaxed mb-5">{explication}</p>
      <label htmlFor="champ-confirmation-mdp" className="block text-muted text-[14px] mb-2">Votre mot de passe</label>
      <input
        id="champ-confirmation-mdp"
        ref={champ}
        type="password"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        autoComplete="current-password"
        disabled={enCours}
        aria-invalid={erreur ? "true" : undefined}
        aria-describedby={erreur ? "champ-confirmation-mdp-erreur" : undefined}
        className={CLASSE_CHAMP}
      />
      {erreur && <p id="champ-confirmation-mdp-erreur" role="alert" className="text-[#8a2424] text-[14px] mt-1.5">{erreur}</p>}
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button type="submit" disabled={enCours || !motDePasse} aria-busy={enCours} className="btn-primary text-center disabled:opacity-60 disabled:cursor-wait">
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
    setAnnonce("");
    focusTitre();
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

  const confirmerResiliation = (motDePasse) => {
    const annulation = confirmation === "annuler";
    const travail = annulation
      ? (token, restaurantId) => annulerResiliation(token, restaurantId, motDePasse)
      : (token, restaurantId) => resilier(token, restaurantId, motDePasse);
    lancer(
      confirmation,
      travail,
      (resultat) => {
        const info = annulation
          ? "La résiliation est annulée : votre abonnement continue."
          : texteResiliationEnregistree(resultat?.effetLe);
        // Le compte est mis à jour tout de suite (pas de bouton « Résilier » qui réapparaît), puis relu.
        setEtat((e) =>
          e.compte
            ? { ...e, compte: { ...e.compte, resiliation: annulation ? null : resultat?.effetLe ? { effetLe: resultat.effetLe } : e.compte.resiliation } }
            : e,
        );
        setAction({ ...ACTION_VIDE, info });
        setAnnonce(info);
        setConfirmation(null);
        setRelance((n) => n + 1);
        focusTitre();
      },
      (erreur) => {
        if (!estMotDePasseRefuse(erreur)) return false;
        setAction({ ...ACTION_VIDE, erreurMotDePasse: "Mot de passe incorrect." });
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

  const compteAffiche = etat.restaurantId === session.restaurantId ? etat.compte : null;
  const resume = compteAffiche ? resumeCompte(compteAffiche) : null;
  // Le message de confirmation d'une résiliation remplace le bandeau qui dit la même chose.
  const bandeaux = resume ? resume.bandeaux.filter((b) => !(action.info && b.cle === "resiliation")) : [];
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
            {action.info && <Message type="info" role="note" className="mt-4">{action.info}</Message>}

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
                      <dd className="text-ink">{valeur}</dd>
                    </React.Fragment>
                  ))}
                </dl>

                {action.erreur && <Message type="error" className="mt-8">{action.erreur}</Message>}

                <div className="mt-10 flex flex-col gap-8">
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

                  {(resume.actions.resilier || resume.actions.annulerResiliation) && (
                    <div>
                      <h2 className="text-ink text-[22px] mb-2">{resume.actions.annulerResiliation ? "Résiliation programmée" : "Résilier l’abonnement"}</h2>
                      {confirmation === null && (
                        <>
                          <p className="text-muted text-[15px] leading-relaxed mb-4">
                            {resume.actions.annulerResiliation
                              ? "Vous pouvez annuler la résiliation jusqu’à sa date d’effet : l’abonnement continue alors normalement."
                              : "La résiliation prend effet à la fin de la période en cours, ou à la fin de l’engagement. D’ici là, l’accès reste complet."}
                          </p>
                          <button
                            type="button"
                            disabled={occupe}
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
                      {confirmation === "resilier" && (
                        <ConfirmationParMotDePasse
                          titre="Confirmer la résiliation"
                          explication="Pour confirmer, saisissez le mot de passe de votre compte. La résiliation prendra effet à la fin de la période en cours, ou à la fin de l’engagement ; vous pourrez l’annuler d’ici là."
                          libelle="Confirmer la résiliation"
                          libelleRenoncer="Garder mon abonnement"
                          enCours={action.enCours === "resilier"}
                          erreur={action.erreurMotDePasse}
                          onConfirmer={confirmerResiliation}
                          onRenoncer={renoncer}
                        />
                      )}
                      {confirmation === "annuler" && (
                        <ConfirmationParMotDePasse
                          titre="Annuler la résiliation"
                          explication="Pour confirmer, saisissez le mot de passe de votre compte. Votre abonnement continuera normalement."
                          libelle="Annuler la résiliation"
                          libelleRenoncer="Ne rien changer"
                          enCours={action.enCours === "annuler"}
                          erreur={action.erreurMotDePasse}
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
