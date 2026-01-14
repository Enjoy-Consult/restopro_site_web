import React, { useState } from "react";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { 
  Phone, Mail, MapPin, Clock, Send, CheckCircle, 
  AlertTriangle, ClipboardCheck, FileText, Loader2, XCircle
} from "lucide-react";

const serviceTypes = [
  { value: "urgence_ddpp", label: "Urgence DDPP", icon: AlertTriangle, desc: "Contrôle sanitaire / mise en demeure" },
  { value: "audit_hygiene", label: "Audit Hygiène", icon: ClipboardCheck, desc: "Inspection préventive" },
  { value: "accompagnement_administratif", label: "Accompagnement Administratif", icon: FileText, desc: "PMS, CERFA, EGAlim" },
  { value: "autre", label: "Autre demande", icon: Mail, desc: "Question ou renseignement" }
];

export default function Contact() {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceParam = urlParams.get("service");

  const getInitialService = () => {
    if (serviceParam === "urgence") return "urgence_ddpp";
    if (serviceParam === "audit") return "audit_hygiene";
    if (serviceParam === "administratif") return "accompagnement_administratif";
    return "";
  };

  const [formData, setFormData] = useState({
    restaurant_name: "",
    contact_name: "",
    email: "",
    phone: "",
    service_type: getInitialService(),
    urgency: "normal",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const createContactMutation = useMutation({
    mutationFn: async (data) => {
      setErrorMessage("");
      const response = await base44.functions.invoke('submitContactForm', data);
      return response.data;
    },
    onSuccess: () => {
      setSubmitted(true);
      setErrorMessage("");
    },
    onError: (error) => {
      console.error("[Contact Form] Erreur:", error);
      setErrorMessage("Erreur lors de l'envoi du formulaire. Veuillez réessayer ou nous contacter par téléphone au 06 80 95 25 89.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createContactMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <>
        <SEO 
          title="Demande Envoyée - Merci de votre confiance"
          description="Votre demande a été envoyée avec succès. Notre équipe vous recontactera dans les plus brefs délais."
          keywords="contact enjoy consult, demande intervention, devis hygiène restaurant"
        />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-lg"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Demande envoyée !</h2>
          <p className="text-slate-600 mb-8">
            Merci pour votre confiance. Nous vous recontacterons dans les plus brefs délais
            {formData.urgency === "urgent" && " (sous 2h pour les urgences)"}.
          </p>
          <Button 
            onClick={() => {
              setSubmitted(false);
              setFormData({
                restaurant_name: "",
                contact_name: "",
                email: "",
                phone: "",
                service_type: "",
                urgency: "normal",
                message: ""
              });
            }}
            variant="outline"
          >
            Nouvelle demande
          </Button>
        </motion.div>
      </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Contact - Demande d'Intervention ou Devis Gratuit"
        description="Contactez RestOclair pour une urgence DDPP, un audit hygiène ou un accompagnement administratif. Réponse sous 2h, intervention sous 24h en cas d'urgence. Tél: 06 80 95 25 89"
        keywords="contact consultant hygiène, demande intervention DDPP, devis audit restaurant, urgence sanitaire, RDV consultant alimentaire, Île-de-France"
        canonicalUrl={`${window.location.origin}${window.location.pathname}`}
      />
      <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="bg-white border-b border-slate-200 py-16">
        <div className="container mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Contact</span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6 leading-tight">
              Parlons de votre projet
            </h1>
            <p className="text-xl md:text-lg text-slate-600 leading-relaxed">
              Remplissez le formulaire ci-dessous ou contactez-nous directement. 
              Nous vous répondons sous 2h en cas d'urgence.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-6 lg:px-12 py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Coordonnées</h3>
              
              <div className="space-y-6">
                <a href="tel:0680952589" className="flex items-start gap-4 group">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors text-lg md:text-base">Téléphone</p>
                    <p className="text-slate-600 text-lg md:text-base">06 80 95 25 89</p>
                  </div>
                </a>

                <a href="mailto:contact@restoclair.fr" className="flex items-start gap-4 group">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-lg md:text-base">Email</p>
                    <p className="text-slate-600 text-base md:text-base break-all">contact@restoclair.fr</p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-lg md:text-base">Zone d'intervention</p>
                    <p className="text-slate-600 text-lg md:text-base">Île-de-France</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-lg md:text-base">Disponibilité</p>
                    <p className="text-slate-600 text-lg md:text-base">Lun-Sam : 8h-20h</p>
                    <p className="text-base md:text-sm text-emerald-600 font-medium">Urgence 7j/7</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact */}
            <div className="bg-emerald-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl md:text-xl font-bold mb-4">Urgence DDPP ?</h3>
              <p className="text-emerald-100 mb-6 text-lg md:text-base leading-relaxed">
                En cas de contrôle sanitaire ou de mise en demeure, appelez-nous immédiatement.
              </p>
              <a href="tel:0680952589">
                <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 py-6 text-lg md:text-base">
                  <Phone className="mr-2 w-5 h-5" />
                  Appeler maintenant
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-slate-100">
              <h3 className="text-2xl md:text-xl font-bold text-slate-900 mb-8">Formulaire de contact</h3>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Service Type */}
                <div className="space-y-4">
                  <Label className="text-xl md:text-base font-semibold">Type de demande *</Label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {serviceTypes.map((service) => {
                      const Icon = service.icon;
                      const isSelected = formData.service_type === service.value;
                      return (
                        <div
                        key={service.value}
                        onClick={() => handleChange("service_type", service.value)}
                        className={`p-5 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? "border-emerald-500 bg-emerald-50" 
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-6 h-6 md:w-5 md:h-5 mt-0.5 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                          <div>
                            <p className={`font-semibold text-lg md:text-base ${isSelected ? "text-emerald-700" : "text-slate-700"}`}>
                              {service.label}
                            </p>
                            <p className="text-base md:text-sm text-slate-500">{service.desc}</p>
                          </div>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Urgency */}
                <div className="space-y-4">
                  <Label className="text-xl md:text-base font-semibold">Niveau d'urgence</Label>
                  <RadioGroup 
                    value={formData.urgency} 
                    onValueChange={(value) => handleChange("urgency", value)}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="urgent" id="urgent" className="w-5 h-5" />
                      <Label htmlFor="urgent" className="text-red-600 font-medium cursor-pointer text-lg md:text-base">Urgent (contrôle en cours)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="normal" id="normal" className="w-5 h-5" />
                      <Label htmlFor="normal" className="cursor-pointer text-lg md:text-base">Normal</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="information" id="information" className="w-5 h-5" />
                      <Label htmlFor="information" className="cursor-pointer text-lg md:text-base">Simple renseignement</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Contact Info */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant_name" className="text-lg md:text-base">Nom du restaurant *</Label>
                    <Input
                      id="restaurant_name"
                      placeholder="Ex: La Belle Assiette"
                      value={formData.restaurant_name}
                      onChange={(e) => handleChange("restaurant_name", e.target.value)}
                      required
                      className="py-7 md:py-6 text-lg md:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name" className="text-lg md:text-base">Votre nom *</Label>
                    <Input
                      id="contact_name"
                      placeholder="Prénom Nom"
                      value={formData.contact_name}
                      onChange={(e) => handleChange("contact_name", e.target.value)}
                      required
                      className="py-7 md:py-6 text-lg md:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-lg md:text-base">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@restaurant.fr"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                      className="py-7 md:py-6 text-lg md:text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-lg md:text-base">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="06 XX XX XX XX"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                      className="py-7 md:py-6 text-lg md:text-base"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-lg md:text-base">Décrivez votre situation</Label>
                  <Textarea
                    id="message"
                    placeholder="Décrivez brièvement votre besoin ou la situation actuelle de votre établissement..."
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    rows={5}
                    className="text-lg md:text-base"
                  />
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-800 ml-2">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit */}
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-7 md:py-6 text-xl md:text-lg"
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-6 h-6 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 w-6 h-6" />
                      Envoyer ma demande
                    </>
                  )}
                </Button>

                <p className="text-base md:text-sm text-slate-500 text-center leading-relaxed">
                  En soumettant ce formulaire, vous acceptez d'être recontacté par nos équipes.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
}