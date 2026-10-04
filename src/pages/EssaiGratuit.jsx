import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { BUSINESS } from "@/lib/business-info";

// Page d'essai gratuit de l'application RestOclair.
// Formulaire : enregistrement Airtable (php-api/essai.php, table DemandesEssai) + notification email FormSubmit.

const API_URL = "https://restoclair.fr/php-api/essai.php";
const FORMSUBMIT_URL = "https://formsubmit.co/ajax/contact.restoclair@gmail.com";
const IMG = "/essai";

const EMPTY = { nom: "", prenom: "", entreprise: "", poste: "", telephone: "", email: "", consentement: false, _honey: "" };

const CLIENTS = [
  ["Spoon", "Golf du Touquet"],
  ["Boucherie Bourgeois", "Boulogne-sur-Mer"],
  ["Térèse", "Asnières"],
  ["Paris Plage", "Le Touquet"],
  ["Domino’s Pizza", "Carvin"],
];

const FONCTIONS = [
  {
    titre: "Températures, produits et traçabilité",
    texte: "Températures, produits, traçabilité et contrôles sont suivis au même endroit, sur le téléphone de l’équipe.",
  },
  {
    titre: "Nettoyage, tâches et actions correctives",
    texte: "Plans de nettoyage, tâches du jour et actions correctives : le travail de chacun est organisé et tracé.",
  },
  {
    titre: "Le dossier d’inspection",
    texte: "Vos suivis et votre dossier d’inspection sont rangés dans l’application, prêts le jour du contrôle.",
  },
];

const ETAPES = [
  ["Comprendre les écarts", "On fait le point sur les observations du rapport et sur les besoins de votre établissement."],
  ["Prioriser et réorganiser", "On définit les actions correctives, les procédures et les documents utiles, en commençant par l’urgent."],
  ["Garder le cap", "On met en place un suivi hygiène adapté à votre équipe et à vos contraintes."],
];

export default function EssaiGratuit() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
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

      // Notification email, non bloquante : la demande est déjà enregistrée dans Airtable
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

      setStatus({ type: "ok", text: "C’est noté. Nous vous rappelons sous 24 à 48 h pour préparer votre essai." });
      setForm(EMPTY);
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error.name === "AbortError"
            ? `L’envoi n’a pas abouti. Réessayez dans un instant, ou appelez-nous au ${BUSINESS.phone.display}.`
            : `Votre demande n’est pas partie. Vos informations sont toujours dans le formulaire : réessayez, ou appelez-nous au ${BUSINESS.phone.display}.`,
      });
    } finally {
      clearTimeout(timer);
      setSending(false);
    }
  };

  return (
    <>
      <SEO
        title="Essai gratuit de l’application RestOclair"
        description="Températures, traçabilité, plans de nettoyage et dossier d’inspection dans une seule application. Demandez votre essai gratuit, nous vous rappelons sous 24 à 48 h."
        canonicalUrl="https://restoclair.fr/essai-gratuit"
      />

      {/* Ouverture */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
            <div className="md:col-span-6">
              <h1 className="text-ink mb-6">Le suivi hygiène de votre cuisine, dans votre poche.</h1>
              <p className="text-muted text-lg leading-relaxed mb-8 max-w-[500px]">
                Relevés de températures, traçabilité, nettoyage, dossier d’inspection : l’application RestOclair
                rassemble votre suivi hygiène au même endroit, et s’adapte à l’organisation de votre établissement.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <a href="#essai" className="btn-primary">Demander un essai gratuit</a>
                <a href={BUSINESS.phone.href} className="link-underline text-[15px] py-3">{BUSINESS.phone.display}</a>
              </div>
            </div>
            <div className="md:col-span-6">
              <figure>
                <div className="border border-border bg-white p-2">
                  <div className="h-[300px] md:h-[360px] overflow-hidden">
                    <img
                      src={`${IMG}/dashboard.jpg`}
                      alt="Capture réelle du tableau de bord RestOclair : score hygiène, températures, tâches et alertes."
                      className="w-full h-auto -mt-[30px]"
                      style={{ filter: "none" }}
                      fetchpriority="high"
                    />
                  </div>
                </div>
                <figcaption className="text-faint text-sm mt-3">
                  Le tableau de bord d’un établissement : score hygiène, températures, tâches du jour.
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* Ils l'utilisent */}
      <hr className="rule" />
      <section className="py-8">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-[15px] leading-relaxed">
            <span className="text-faint">Déjà en place chez </span>
            {CLIENTS.map(([nom, lieu], i) => (
              <span key={nom}>
                <strong className="text-ink font-medium">{nom}</strong>
                <span className="text-muted"> ({lieu})</span>
                {i < CLIENTS.length - 2 ? <span className="text-muted">, </span> : i === CLIENTS.length - 2 ? <span className="text-muted"> et </span> : <span className="text-muted">.</span>}
              </span>
            ))}
          </p>
        </div>
      </section>
      <hr className="rule" />

      {/* L'application */}
      <section id="application" className="py-20 md:py-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 md:gap-16">
            <div className="md:col-span-4">
              <h2 className="text-ink">Ce que l’application fait pour vous au quotidien.</h2>
            </div>
            <div className="md:col-span-8">
              <div className="divide-y divide-border border-t border-border">
                {FONCTIONS.map((f) => (
                  <div key={f.titre} className="py-8">
                    <h3 className="text-ink font-sans font-semibold text-[22px] mb-3">{f.titre}</h3>
                    <p className="text-muted leading-relaxed">{f.texte}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-16">
            <figure>
              <img
                src={`${IMG}/telephone.jpg`}
                alt="L’icône RestOclair sur l’écran d’un téléphone."
                className="w-full h-[280px] md:h-[320px] object-cover"
                style={{ filter: "none" }}
                loading="lazy"
              />
              <figcaption className="text-faint text-sm mt-3">Installée sur le téléphone de l’équipe.</figcaption>
            </figure>
            <figure>
              <div className="h-[280px] md:h-[320px] overflow-hidden bg-white border border-border">
                <img
                  src={`${IMG}/modules.jpg`}
                  alt="Menu de l’application RestOclair : produits, réceptions, températures, contrôles et dossier d’inspection."
                  className="w-full -translate-y-[25px]"
                  style={{ filter: "none" }}
                  loading="lazy"
                />
              </div>
              <figcaption className="text-faint text-sm mt-3">Produits, réceptions, températures, contrôles, dossier d’inspection.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Après un contrôle */}
      <section id="accompagnement" className="bg-bottle py-20 md:py-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 md:gap-16">
            <div className="md:col-span-5">
              <h2 className="text-bottle-text mb-6">Vous sortez d’un contrôle DDPP difficile ?</h2>
              <p className="text-bottle-muted text-lg leading-relaxed">
                L’application seule ne suffit pas toujours. Après un contrôle, nous vous aidons d’abord à
                réorganiser l’établissement. Ensuite, l’application prend le relais pour simplifier le suivi.
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="divide-y divide-[#2f6650] border-t border-[#2f6650]">
                {ETAPES.map(([titre, texte], i) => (
                  <div key={titre} className="py-7 flex items-start gap-6">
                    <span className="font-serif text-bottle-muted text-2xl leading-none mt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="text-bottle-text font-sans font-semibold text-[20px] mb-2">{titre}</h3>
                      <p className="text-bottle-muted leading-relaxed">{texte}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Formulaire */}
      <section id="essai" className="py-20 md:py-28 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
            <div className="md:col-span-5">
              <h2 className="text-ink mb-6">Essayez-la dans votre établissement.</h2>
              <p className="text-muted text-lg leading-relaxed mb-4">
                L’essai est gratuit. Laissez vos coordonnées : nous vous rappelons sous 24 à 48 h pour parler
                de votre cuisine et configurer l’application avec vous.
              </p>
              <p className="text-muted leading-relaxed">
                Vous préférez appeler ?{" "}
                <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>
                <br />
                Par email :{" "}
                <a href="mailto:contact.restoclair@gmail.com" className="link-underline">contact.restoclair@gmail.com</a>
              </p>
            </div>

            <div className="md:col-span-7">
              <form onSubmit={onSubmit} className="border-t border-border pt-8">
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                  <Champ label="Nom" name="nom" value={form.nom} onChange={update} autoComplete="family-name" maxLength={100} />
                  <Champ label="Prénom" name="prenom" value={form.prenom} onChange={update} autoComplete="given-name" maxLength={100} />
                  <Champ label="Établissement" name="entreprise" value={form.entreprise} onChange={update} autoComplete="organization" maxLength={150} />
                  <Champ label="Votre poste" name="poste" value={form.poste} onChange={update} autoComplete="organization-title" maxLength={150} />
                  <Champ label="Téléphone" name="telephone" type="tel" value={form.telephone} onChange={update} autoComplete="tel" minLength={6} maxLength={30} />
                  <Champ label="Email" name="email" type="email" value={form.email} onChange={update} autoComplete="email" maxLength={254} />
                </div>

                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label>Ne pas remplir<input name="_honey" value={form._honey} onChange={update} tabIndex={-1} autoComplete="off" /></label>
                </div>

                <label className="flex items-start gap-3 mt-6 text-sm text-muted leading-relaxed">
                  <input
                    type="checkbox"
                    name="consentement"
                    checked={form.consentement}
                    onChange={update}
                    required
                    className="mt-1 w-4 h-4 shrink-0 accent-[#1c4b38]"
                  />
                  <span>
                    J’accepte que RestOclair utilise ces coordonnées pour me recontacter au sujet de l’essai.{" "}
                    <a href="#confidentialite" onClick={openPrivacy} className="link-underline">Ce que vous faites de mes données</a>
                  </span>
                </label>

                <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                  <button type="submit" className="btn-primary disabled:opacity-60 disabled:cursor-wait" disabled={sending}>
                    {sending ? "Envoi…" : "Demander mon essai"}
                  </button>
                  <span className="text-faint text-sm">Tous les champs sont nécessaires pour vous rappeler.</span>
                </div>

                {status && (
                  <p
                    ref={statusRef}
                    role="status"
                    tabIndex={-1}
                    className={`mt-6 px-4 py-3 text-[15px] border-l-2 ${status.type === "error" ? "border-[#8a2424] text-[#8a2424] bg-[#fbefed]" : "border-bottle text-bottle bg-[#eaf0ea]"}`}
                  >
                    {status.text}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Confidentialité */}
      <section id="confidentialite" className="pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <details ref={privacyRef} className="border-t border-border pt-6 text-sm text-faint">
            <summary className="cursor-pointer text-muted">Vos données personnelles</summary>
            <div className="max-w-[820px] pt-4 space-y-3 leading-relaxed">
              <p>Les informations du formulaire servent uniquement à traiter votre demande d’essai et à vous recontacter, sur la base de votre consentement.</p>
              <p>Elles sont enregistrées dans l’outil de gestion de RestOclair (Airtable). Une notification est aussi envoyée à l’équipe par FormSubmit, puis reçue dans sa messagerie Gmail (<a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer" className="underline">politique de confidentialité de FormSubmit</a>). Elles sont conservées le temps de traiter votre demande ; si un accompagnement commence, les conditions de conservation vous seront précisées.</p>
              <p>Vous pouvez retirer votre consentement et demander l’accès, la rectification, l’effacement ou la limitation de vos données, ainsi que leur portabilité, en écrivant à <a href="mailto:contact.restoclair@gmail.com" className="underline">contact.restoclair@gmail.com</a>. Vous pouvez aussi saisir la <a href="https://www.cnil.fr/fr/adresser-une-plainte" target="_blank" rel="noopener noreferrer" className="underline">CNIL</a>.</p>
              <p>Voir aussi notre <Link to="/PolitiqueConfidentialite" className="underline">politique de confidentialité</Link>.</p>
            </div>
          </details>
        </div>
      </section>
    </>
  );
}

function Champ({ label, name, type = "text", value, onChange, ...rest }) {
  return (
    <div>
      <label htmlFor={`essai-${name}`} className="block text-faint text-sm mb-2">
        {label}<span className="text-bottle ml-0.5">*</span>
      </label>
      <input
        id={`essai-${name}`}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        className="w-full border border-border bg-paper px-4 py-3 text-ink text-[15px] focus:outline-none focus:border-bottle"
        {...rest}
      />
    </div>
  );
}
