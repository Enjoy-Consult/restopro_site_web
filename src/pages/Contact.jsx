import React, { useState } from "react";
import SEO from "@/components/SEO";
import { submitContactForm } from "@/api/airtableService";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    restaurant: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await submitContactForm(formData);
      setStatus("success");
      setFormData({ name: "", email: "", phone: "", restaurant: "", subject: "", message: "" });
    } catch (err) {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Contact — RestOclair | 06 80 95 25 89"
        description="Contactez Thierry Bailleul pour une intervention urgence DDPP, un audit hygiène ou une question réglementaire. Réponse sous 2 h en semaine."
        keywords="contact RestOclair, consultant hygiène alimentaire, rendez-vous DDPP"
        canonicalUrl={`${window.location.origin}/Contact`}
      />
      <div>
        <section className="pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid md:grid-cols-12 gap-12 md:gap-0">
              {/* Left column */}
              <div className="md:col-span-5 md:pr-16">
                <h1 className="text-ink mb-8">Parlons de votre situation.</h1>

                <div className="mb-10">
                  <p className="text-faint text-sm mb-2">Téléphone</p>
                  <a href="tel:0680952589" className="font-serif text-3xl md:text-4xl text-ink block mb-1">
                    06 80 95 25 89
                  </a>
                  <p className="text-faint text-sm">Réponse sous 2 h en semaine</p>
                </div>

                <div className="mb-10">
                  <p className="text-faint text-sm mb-2">Email</p>
                  <a href="mailto:contact@restoclair.fr" className="link-underline text-lg">
                    contact@restoclair.fr
                  </a>
                </div>

                <div className="mb-10">
                  <p className="text-faint text-sm mb-2">Zone d'intervention</p>
                  <p className="text-ink text-lg">France entière</p>
                  <p className="text-muted text-[15px] mt-1">Intervention sur tout le territoire</p>
                </div>

                <div>
                  <p className="text-faint text-sm mb-2">Délais</p>
                  <p className="text-muted text-[15px]">Urgence DDPP : intervention sous 24 h</p>
                  <p className="text-muted text-[15px]">Audit préventif : rendez-vous sous 5 jours</p>
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
                      label="Restaurant"
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
                      <option value="urgence">Urgence après contrôle DDPP</option>
                      <option value="audit">Audit hygiène préventif</option>
                      <option value="dossiers">Dossiers obligatoires (PMS, EGAlim)</option>
                      <option value="autre">Autre question</option>
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

                  {status === "success" && (
                    <p className="text-bottle font-medium text-[15px]">
                      Message envoyé. Je vous recontacte sous 2 h en semaine.
                    </p>
                  )}
                  {status === "error" && (
                    <p className="text-red-700 text-[15px]">
                      Erreur lors de l'envoi. Appelez-moi directement au 06 80 95 25 89.
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
