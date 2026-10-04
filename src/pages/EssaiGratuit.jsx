import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import "./EssaiGratuit.css";

// Page d'essai gratuit — intégrée depuis la landing page créée sur restoclair.wassilah-imlak.chatgpt.site
// Formulaire : enregistrement Airtable (php-api/essai.php, table DemandesEssai) + notification email FormSubmit.

const API_URL = "https://restoclair.fr/php-api/essai.php";
const FORMSUBMIT_URL = "https://formsubmit.co/ajax/contact.restoclair@gmail.com";
const IMG = "/essai";

const EMPTY = { nom: "", prenom: "", entreprise: "", poste: "", telephone: "", email: "", consentement: false, _honey: "" };

export default function EssaiGratuit() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok' | 'error', text }
  const statusRef = useRef(null);
  const privacyRef = useRef(null);

  useEffect(() => {
    if (status && statusRef.current) statusRef.current.focus();
  }, [status]);

  const update = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const openPrivacy = () => {
    if (privacyRef.current) privacyRef.current.open = true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const formEl = e.currentTarget;
    const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
    setForm(data);
    if (!formEl.reportValidity()) return;
    if (data._honey) return;

    setSending(true);
    setStatus(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error("Envoi non confirmé");

      // Notification email (non bloquante : la demande est déjà enregistrée dans Airtable)
      fetch(FORMSUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "RestOclair — Nouvelle demande d’essai gratuit",
          _template: "table",
          _captcha: "false",
          Nom: data.nom,
          Prénom: data.prenom,
          Entreprise: data.entreprise,
          "Poste occupé": data.poste,
          Téléphone: data.telephone,
          email: data.email,
          _url: window.location.origin + "/essai-gratuit",
        }),
      }).catch(() => {});

      setStatus({ type: "ok", text: "Merci ! Votre demande a bien été envoyée. Notre équipe vous recontactera sous 24 à 48 h." });
      setForm(EMPTY);
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error.name === "AbortError"
            ? "L’envoi n’a pas pu être confirmé. Réessayez dans quelques instants ou contactez contact.restoclair@gmail.com."
            : "Votre demande n’a pas pu être envoyée. Vos informations sont conservées dans le formulaire. Réessayez ou contactez contact.restoclair@gmail.com.",
      });
    } finally {
      clearTimeout(timer);
      setSending(false);
    }
  };

  return (
    <div className="lp-essai">
      <SEO
        title="Testez l’application RestOclair gratuitement"
        description="Réorganisez votre établissement après un contrôle DDPP et simplifiez votre suivi hygiène avec RestOclair. Demandez votre essai gratuit."
        canonicalUrl="https://restoclair.fr/essai-gratuit"
      />
      <a className="skip" href="#main">Aller au contenu</a>

      <header>
        <div className="container nav">
          <Link className="brand" to="/" aria-label="RestOclair, accueil du site">
            <img src={`${IMG}/logo.jpg`} alt="RestOclair" />
          </Link>
          <nav aria-label="Navigation principale">
            <a href="#application">L’application</a>
            <a href="#accompagnement">L’accompagnement</a>
          </nav>
          <a className="button small" href="#essai">TESTER NOTRE APP</a>
        </div>
      </header>

      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <span className="eyebrow">L’HYGIÈNE, EN TOUTE CLARTÉ</span>
            <h1>Moins de complexité.<br />Plus de <span>sérénité.</span></h1>
            <p>Du contrôle DDPP au suivi quotidien, RestOclair vous aide à reprendre la main sur l’hygiène de votre établissement.</p>
            <a className="button" href="#essai">TESTER NOTRE APP</a>
            <div className="hero-note"><span className="check">✓</span> Essai gratuit · Une équipe à vos côtés</div>
          </div>
          <div className="hero-visual">
            <div className="visual-caption">
              <span className="mini-mark">✓</span>
              <span>Votre établissement.<br /><strong>Une vue d’ensemble claire.</strong></span>
            </div>
            <div className="screen">
              <img src={`${IMG}/dashboard.jpg`} alt="Capture réelle du tableau de bord RestOclair : score hygiène, températures, tâches et alertes." fetchpriority="high" />
            </div>
            <div className="visual-label">L’application RestOclair <span>Au plus près du terrain</span></div>
          </div>
        </section>

        <section className="trust">
          <div className="container">
            <p className="eyebrow">DES ÉTABLISSEMENTS DÉJÀ ACCOMPAGNÉS</p>
            <div className="partners">
              <div><strong>Spoon</strong><span>Restaurant du Golf du Touquet</span></div>
              <div><strong>Boucherie Bourgeois</strong><span>Boulogne-sur-Mer</span></div>
              <div><strong>Térèse</strong><span>Asnières</span></div>
              <div><strong>Paris Plage</strong><span>Le Touquet</span></div>
              <div><strong>Domino’s Pizza</strong><span>Carvin</span></div>
            </div>
          </div>
        </section>

        <section id="application" className="container section">
          <div className="section-heading">
            <span className="eyebrow">SIMPLE AU QUOTIDIEN</span>
            <h2>Votre suivi hygiène.<br />Enfin au même endroit.</h2>
            <p>Une application claire, adaptée à votre organisation et ajustable aux défis de votre établissement.</p>
          </div>
          <div className="features">
            <article><span className="icon turquoise">°C</span><h3>Suivre l’essentiel</h3><p>Températures, produits, traçabilité et contrôles : gardez une vue claire sur votre activité.</p></article>
            <article><span className="icon violet">✓</span><h3>Organiser les actions</h3><p>Plans de nettoyage, tâches et actions correctives : structurez le travail au quotidien.</p></article>
            <article><span className="icon green">≡</span><h3>Centraliser vos documents</h3><p>Retrouvez vos suivis et votre dossier d’inspection dans un même espace.</p></article>
          </div>
          <div className="app-gallery">
            <figure className="phone-picture">
              <img src={`${IMG}/telephone.jpg`} alt="L’icône RestOclair sur l’écran d’un téléphone." loading="lazy" />
              <figcaption>RestOclair, à portée de main.</figcaption>
            </figure>
            <figure className="modules-picture">
              <div className="module-crop">
                <img src={`${IMG}/modules.jpg`} alt="Menu de l’application RestOclair : produits, réceptions, températures, contrôles et dossier d’inspection." loading="lazy" />
              </div>
              <figcaption>Des outils adaptés à votre terrain.</figcaption>
            </figure>
          </div>
        </section>

        <section id="accompagnement" className="support">
          <div className="container support-grid">
            <div>
              <span className="eyebrow">UNE ÉQUIPE À VOS CÔTÉS</span>
              <h2>Un contrôle DDPP ?<br />Avancez avec un plan clair.</h2>
              <p>Après un contrôle, nous vous aidons à réorganiser rapidement et efficacement votre établissement. Puis l’application prend le relais pour simplifier le suivi.</p>
              <a className="text-link" href="#essai">Parlons de votre établissement</a>
            </div>
            <ol>
              <li><span>01</span><div><h3>Comprendre les écarts</h3><p>Faire le point sur les observations et les besoins de votre établissement.</p></div></li>
              <li><span>02</span><div><h3>Prioriser et réorganiser</h3><p>Définir les actions correctives, les procédures et les documents utiles.</p></div></li>
              <li><span>03</span><div><h3>Garder le cap</h3><p>Mettre en place un suivi hygiène adapté à votre équipe et à vos contraintes.</p></div></li>
            </ol>
          </div>
        </section>

        <section id="essai" className="container section trial">
          <div className="trial-copy">
            <span className="eyebrow">À VOUS DE TESTER</span>
            <h2>Faites place<br />à un suivi<br /><span>plus clair.</span></h2>
            <p>Demandez votre essai gratuit de l’application. Nous vous recontactons sous <strong>24 à 48 h</strong> pour échanger sur vos besoins et vous accompagner dans la prise en main.</p>
            <div className="trial-note"><span className="check">✓</span> Une configuration adaptée à votre établissement</div>
            <a className="contact" href="mailto:contact.restoclair@gmail.com">contact.restoclair@gmail.com</a>
          </div>

          <div className="form-card">
            <h3>Tester gratuitement</h3>
            <p>Parlez-nous un peu de vous.</p>
            <form id="trial-form" onSubmit={onSubmit} noValidate={false}>
              <div className="form-grid">
                <label>Nom <span>*</span><input name="nom" value={form.nom} onChange={update} autoComplete="family-name" maxLength={100} required /></label>
                <label>Prénom <span>*</span><input name="prenom" value={form.prenom} onChange={update} autoComplete="given-name" maxLength={100} required /></label>
                <label>Entreprise <span>*</span><input name="entreprise" value={form.entreprise} onChange={update} autoComplete="organization" maxLength={150} required /></label>
                <label>Poste occupé <span>*</span><input name="poste" value={form.poste} onChange={update} autoComplete="organization-title" maxLength={150} required /></label>
                <label>Numéro de téléphone <span>*</span><input name="telephone" type="tel" value={form.telephone} onChange={update} autoComplete="tel" minLength={6} maxLength={30} required /></label>
                <label>Adresse e-mail <span>*</span><input name="email" type="email" value={form.email} onChange={update} autoComplete="email" maxLength={254} required /></label>
              </div>
              <div className="honey" aria-hidden="true">
                <label>Ne pas remplir<input name="_honey" value={form._honey} onChange={update} tabIndex={-1} autoComplete="off" /></label>
              </div>
              <label className="consent">
                <input type="checkbox" name="consentement" checked={form.consentement} onChange={update} required />
                <span>J’accepte que RestOclair utilise mes coordonnées pour me recontacter au sujet de mon essai gratuit. <a href="#confidentialite" onClick={openPrivacy}>En savoir plus sur mes données</a>.</span>
              </label>
              <button className="button submit" type="submit" disabled={sending}>{sending ? "Envoi en cours…" : "Tester gratuitement"}</button>
              <p className="required-note">* Tous les champs sont obligatoires.</p>
              {status && (
                <p id="form-status" ref={statusRef} role="status" tabIndex={-1} className={status.type === "error" ? "error" : ""}>{status.text}</p>
              )}
            </form>
          </div>
        </section>

        <section id="confidentialite" className="container privacy">
          <details ref={privacyRef}>
            <summary>Confidentialité et données personnelles</summary>
            <div>
              <p>RestOclair utilise les informations du formulaire uniquement pour traiter votre demande d’essai et vous recontacter, sur la base de votre consentement. Les champs sont obligatoires pour traiter cette demande.</p>
              <p>Les données sont enregistrées dans l’espace de gestion sécurisé de RestOclair (Airtable). Une notification est également transmise à l’équipe RestOclair par FormSubmit, prestataire d’envoi, puis reçue dans sa messagerie Gmail. Consultez la <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">politique de confidentialité de FormSubmit</a>. Les données sont conservées le temps de traiter votre demande ; si un accompagnement débute, les conditions de conservation vous seront précisées à cette occasion.</p>
              <p>Vous pouvez retirer votre consentement et demander l’accès, la rectification, l’effacement ou la limitation du traitement de vos données, ainsi que leur portabilité lorsque ce droit s’applique, en écrivant à <a href="mailto:contact.restoclair@gmail.com">contact.restoclair@gmail.com</a>. Vous pouvez aussi adresser une réclamation à la <a href="https://www.cnil.fr/fr/adresser-une-plainte" target="_blank" rel="noopener noreferrer">CNIL</a>.</p>
              <p>Pour en savoir plus, consultez notre <Link to="/PolitiqueConfidentialite">politique de confidentialité</Link>.</p>
            </div>
          </details>
        </section>
      </main>

      <footer>
        <div className="container">
          <Link className="brand" to="/" aria-label="RestOclair, accueil du site">
            <img src={`${IMG}/logo.jpg`} alt="RestOclair" loading="lazy" />
          </Link>
          <span>L’hygiène, en toute clarté.</span>
          <a href="#confidentialite" onClick={openPrivacy}>Confidentialité</a>
        </div>
      </footer>
    </div>
  );
}
