import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { submitContactForm } from "@/api/airtableService";
import { TEXTE_ENVOI_COUPE, ecrituresProductionPermises } from "@/lib/environnement";

// Valeurs acceptées par php-api/contact.php (RAISONS) : ne pas en ajouter sans mettre à jour le PHP et Airtable.
const SUJETS = [
  ["urgence", "Aide face à la DDPP (rapport, mise en demeure)"],
  ["audit", "Audit hygiène"],
  ["dossiers", "PMS ou ouverture d’un établissement"],
  ["autre", "L’application, un abonnement, un réseau ou autre question"],
];

export default function Contact() {
  // /Contact?sujet=dossiers (page « Ouvrir un restaurant »), ?sujet=autre (page « Réseaux ») : sujet prérempli.
  const [params] = useSearchParams();
  const sujetInitial = SUJETS.some(([v]) => v === params.get("sujet")) ? params.get("sujet") : "";
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    restaurant: "",
    subject: sujetInitial,
    message: "",
    _honey: ""
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData._honey) return;
    // Hors du site de production, rien ne part vers le PHP de production (environnement.js).
    if (!ecrituresProductionPermises()) {
      setStatus("coupe");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await submitContactForm(formData);
      setStatus("success");
      setFormData({ name: "", email: "", phone: "", restaurant: "", subject: "", message: "", _honey: "" });
    } catch (err) {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Contact"
        description="Contactez l’équipe RestOclair : l’application, un abonnement, une ouverture, un audit ou une aide face à la DDPP."
        keywords="contact RestOclair, hygiène alimentaire, application HACCP, DDPP, plan de maîtrise sanitaire"
        canonicalUrl={`${window.location.origin}/Contact`}
      />
      <div>
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-0">
              {/* Left column */}
              <div className="md:col-span-5 md:pr-16">
                <h1 className="text-ink mb-4">Parlons de votre établissement.</h1>
                <p className="text-muted text-lg leading-relaxed mb-10">
                  L’équipe RestOclair vous répond en semaine. Pour votre abonnement (factures, comptes, résiliation),
                  passez par votre espace abonnement.
                </p>

                <div className="mb-10">
                  <p className="text-faint text-sm mb-2">Téléphone</p>
                  <a href="tel:0777752605" className="font-serif text-3xl md:text-4xl text-ink block mb-1">
                    07 77 75 26 05
                  </a>
                  <p className="text-faint text-sm">Du lundi au vendredi</p>
                </div>

                <div className="mb-10">
                  <p className="text-faint text-sm mb-2">Email</p>
                  <a href="mailto:contact@restoclair.fr" className="link-underline text-lg">
                    contact@restoclair.fr
                  </a>
                </div>

                <div className="mb-10">
                  <p className="text-faint text-sm mb-2">Où nous trouver</p>
                  <p className="text-ink text-lg">Roye, Hauts-de-France</p>
                  <p className="text-muted text-[15px] mt-1">Application et aide à distance partout en France. Déplacements sur devis.</p>
                </div>

                <div>
                  <p className="text-faint text-sm mb-2">Après un contrôle</p>
                  <p className="text-muted text-[15px]">Indiquez dans votre message la date du rapport et le délai fixé par la DDPP : nous traitons ces demandes en priorité.</p>
                </div>
              </div>

              {/* Vertical rule */}
              <div className="hidden md:block md:col-span-1 relative">
                <div className="absolute inset-0 flex justify-center">
                  <div className="w-px bg-border" />
                </div>
              </div>
              <hr className="rule md:hidden" />

              {/* Right column - Form */}
              <div className="md:col-span-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <InputField
                      label="Nom"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                    <InputField
                      label="Établissement"
                      name="restaurant"
                      value={formData.restaurant}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <InputField
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                    <InputField
                      label="Téléphone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-faint text-sm mb-2">Sujet</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full border border-border bg-paper px-4 py-3 text-ink text-[15px] focus:outline-none focus:border-bottle"
                    >
                      <option value="">Choisir un sujet</option>
                      {SUJETS.map(([valeur, libelle]) => (
                        <option key={valeur} value={valeur}>{libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-faint text-sm mb-2">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className="w-full border border-border bg-paper px-4 py-3 text-ink text-[15px] leading-relaxed resize-y focus:outline-none focus:border-bottle"
                      placeholder="Décrivez brièvement votre situation..."
                    />
                  </div>

                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label>Ne pas remplir<input name="_honey" value={formData._honey} onChange={handleChange} tabIndex={-1} autoComplete="off" /></label>
                  </div>

                  {status === "success" && (
                    <p className="text-bottle font-medium text-[15px]">
                      Message envoyé. Nous vous recontactons dès que possible, en semaine.
                    </p>
                  )}
                  {status === "coupe" && (
                    <p className="text-red-700 text-[15px]">{TEXTE_ENVOI_COUPE}</p>
                  )}
                  {status === "error" && (
                    <p className="text-red-700 text-[15px]">
                      Erreur lors de l'envoi. Appelez-nous directement au 07 77 75 26 05.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary disabled:opacity-50"
                  >
                    {submitting ? "Envoi..." : "Envoyer"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function InputField({ label, name, type = "text", value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-faint text-sm mb-2">
        {label}{required && <span className="text-bottle ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border border-border bg-paper px-4 py-3 text-ink text-[15px] focus:outline-none focus:border-bottle"
      />
    </div>
  );
}
