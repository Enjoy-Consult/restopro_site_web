import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Message from "@/components/billing/Message";
import { CHEMINS_COMPTE } from "@/compte/chemins";
import { BUSINESS } from "@/lib/business-info";
import { annulerResiliation, getCompteEspace, ouvrirPortail, resilier, seDeconnecter, telechargerExport } from "@/lib/billing/api";
import { BILLING_MOCK } from "@/lib/billing/config";
import {
  NOM_FICHIER_EXPORT,
  TEXTE_DECONNECTE,
  TEXTE_SESSION_EXPIREE,
  TEXTE_SUPPORT,
  ecrireSessionEspace,
  effacerSessionEspace,
  estMotDePasseRefuse,
  estSessionFinie,
  lireSessionEspace,
  messageRefusEspace,
  resumeCompte,
  retenirRetour,
  texteResiliationEnregistree,
  urlPortail,
} from "@/lib/billing/espace";

const CLASSE_CHAMP =
  "w-full border border-border bg-white px-4 py-3.5 text-ink text-[16px] transition-shadow focus:outline-none focus:border-bottle focus:ring-4 focus:ring-bottle/10 disabled:opacity-60";
const BOUTON_SECONDAIRE =
  "border border-ink px-5 py-3 text-[15px] text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-60 disabled:cursor-wait text-center";

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
      {erreur && <p id="champ-confirmation-mdp-erreur" className="text-[#8a2424] text-[14px] mt-1.5">{erreur}</p>}
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
// et son annulation, export complet, déconnexion. Le reste (comptes, formule, transfert, paiement) se fait ailleurs ou
// arrive plus tard : une ligne renvoie vers le support.
export default function MonAbonnement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(() => lireSessionEspace());
  const [etat, setEtat] = useState({ chargement: true, compte: null, erreur: null });
  const [relance, setRelance] = useState(0);
  const [confirmation, setConfirmation] = useState(null); // null, "resilier", "annuler"
  const [action, setAction] = useState({ enCours: null, erreur: null, erreurMotDePasse: null, info: null });
  const titreRef = useRef(null);

  const finDeSession = useCallback(
    (message) => {
      effacerSessionEspace();
      navigate(CHEMINS_COMPTE.connexion, { replace: true, state: { message } });
    },
    [navigate],
  );

  useEffect(() => {
    document.title = "Mon abonnement · RestOclair";
  }, []);

  const restaurant = session?.restaurants?.find((r) => r.restaurantId === session.restaurantId) ?? null;

  useEffect(() => {
    if (!session?.restaurantId) return undefined;
    let arrete = false;
    setEtat((e) => ({ ...e, chargement: true, erreur: null }));
    getCompteEspace(session.token, session.restaurantId)
      .then((compte) => {
        if (!arrete) setEtat({ chargement: false, compte, erreur: null });
      })
      .catch((erreur) => {
        if (arrete) return;
        if (estSessionFinie(erreur)) finDeSession(TEXTE_SESSION_EXPIREE);
        else setEtat({ chargement: false, compte: null, erreur: messageRefusEspace(erreur) });
      });
    return () => {
      arrete = true;
    };
  }, [session?.token, session?.restaurantId, relance, finDeSession]);

  if (!session) {
    retenirRetour(`${location.pathname}${location.search}`);
    return <Navigate to={CHEMINS_COMPTE.connexion} replace />;
  }

  const choisir = (restaurantId) => {
    const suivante = { ...session, restaurantId };
    ecrireSessionEspace(suivante);
    setSession(suivante);
    setConfirmation(null);
    setAction({ enCours: null, erreur: null, erreurMotDePasse: null, info: null });
  };

  const deconnecter = async () => {
    setAction((a) => ({ ...a, enCours: "deconnexion" }));
    await seDeconnecter(session.token).catch(() => {});
    finDeSession(TEXTE_DECONNECTE);
  };

  // Erreur commune des actions : session finie, ou message affiché sous l'action.
  const echec = (erreur, extra = {}) => {
    if (estSessionFinie(erreur)) {
      finDeSession(TEXTE_SESSION_EXPIREE);
      return;
    }
    setAction({ enCours: null, erreur: messageRefusEspace(erreur), erreurMotDePasse: null, info: null, ...extra });
  };

  const portail = async () => {
    setAction({ enCours: "portail", erreur: null, erreurMotDePasse: null, info: null });
    try {
      const url = urlPortail(await ouvrirPortail(session.token, session.restaurantId), BILLING_MOCK ? window.location.origin : null);
      if (!url) throw new Error("adresse du portail illisible");
      window.location.assign(url);
    } catch (erreur) {
      echec(erreur);
    }
  };

  const confirmerResiliation = async (motDePasse) => {
    const annulation = confirmation === "annuler";
    setAction({ enCours: confirmation, erreur: null, erreurMotDePasse: null, info: null });
    try {
      if (annulation) {
        await annulerResiliation(session.token, session.restaurantId, motDePasse);
        setAction({ enCours: null, erreur: null, erreurMotDePasse: null, info: "La résiliation est annulée : votre abonnement continue." });
      } else {
        // Le bandeau de la résiliation programmée le dit déjà quand le compte la renvoie ; sinon, ce message.
        const { effetLe } = await resilier(session.token, session.restaurantId, motDePasse);
        setAction({ enCours: null, erreur: null, erreurMotDePasse: null, info: effetLe ? null : texteResiliationEnregistree(effetLe) });
      }
      setConfirmation(null);
      setRelance((n) => n + 1);
      requestAnimationFrame(() => titreRef.current?.focus());
    } catch (erreur) {
      if (estMotDePasseRefuse(erreur)) {
        setAction({ enCours: null, erreur: null, erreurMotDePasse: "Mot de passe incorrect.", info: null });
        requestAnimationFrame(() => document.getElementById("champ-confirmation-mdp")?.focus());
      } else echec(erreur);
    }
  };

  const exporter = async () => {
    setAction({ enCours: "export", erreur: null, erreurMotDePasse: null, info: null });
    try {
      const fichier = await telechargerExport(session.token, session.restaurantId);
      const adresse = URL.createObjectURL(fichier);
      const lien = document.createElement("a");
      lien.href = adresse;
      lien.download = NOM_FICHIER_EXPORT;
      document.body.append(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(adresse), 60000);
      setAction({ enCours: null, erreur: null, erreurMotDePasse: null, info: `Le téléchargement de ${NOM_FICHIER_EXPORT} a commencé.` });
    } catch (erreur) {
      echec(erreur);
    }
  };

  const resume = etat.compte ? resumeCompte(etat.compte) : null;
  const maquettePortail = BILLING_MOCK && new URLSearchParams(location.search).get("maquette") === "portail";
  const occupe = Boolean(action.enCours);

  return (
    <section className="pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="max-w-[760px] mx-auto px-5 md:px-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <p className="text-bottle text-[12px] font-medium uppercase tracking-[0.14em] pt-1">Mon abonnement</p>
          <button type="button" onClick={deconnecter} disabled={action.enCours === "deconnexion"} className="link-underline text-[15px]">
            {action.enCours === "deconnexion" ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>

        {!session.restaurantId ? (
          <>
            <h1 className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)]">Choisissez l’établissement.</h1>
            <ChoixRestaurant restaurants={session.restaurants ?? []} onChoisir={choisir} />
          </>
        ) : (
          <>
            <h1 ref={titreRef} tabIndex={-1} className="text-ink mb-2 text-[clamp(2rem,5vw,3rem)] focus:outline-none">{restaurant?.nom ?? "Votre établissement"}</h1>
            {(session.restaurants?.length ?? 0) > 1 && (
              <button type="button" className="link-underline text-[15px] mb-6" onClick={() => choisir(null)}>Changer d’établissement</button>
            )}

            {maquettePortail && <Message type="info" className="mt-4">Maquette : ici s’ouvrirait le portail Stripe (factures, moyen de paiement).</Message>}
            {action.info && <Message type="info" className="mt-4">{action.info}</Message>}

            {etat.chargement && !etat.compte && <p className="text-muted text-lg mt-6" role="status">Chargement de votre abonnement…</p>}

            {etat.erreur && (
              <>
                <Message type="error" className="mt-6">{etat.erreur}</Message>
                <button type="button" className="link-underline text-[15px] mt-4" onClick={() => setRelance((n) => n + 1)}>Réessayer</button>
              </>
            )}

            {resume && (
              <>
                {resume.bandeaux.map((b) => (
                  <Message key={b.texte} type={b.type} className="mt-6">{b.texte}</Message>
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
                              setAction({ enCours: null, erreur: null, erreurMotDePasse: null, info: null });
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
                          onRenoncer={() => setConfirmation(null)}
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
                          onRenoncer={() => setConfirmation(null)}
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
