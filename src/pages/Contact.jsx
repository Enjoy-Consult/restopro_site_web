import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { 
  Phone, Mail, MapPin, Clock, Send, CheckCircle, 
  AlertTriangle, ClipboardCheck, FileText, Loader2
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

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.ContactRequest.create(data),
    onSuccess: () => {
      setSubmitted(true);
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
    );
  }

  return (
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
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">
              Parlons de votre projet
            </h1>
            <p className="text-lg text-slate-600">
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
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Coordonnées</h3>
              
              <div className="space-y-6">
                <a href="tel:0680952589" className="flex items-start gap-4 group">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">Téléphone</p>
                    <p className="text-slate-600">06 80 95 25 89</p>
                  </div>
                </a>

                <a href="mailto:contact@enjoyconsult.fr" className="flex items-start gap-4 group">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Email</p>
                    <p className="text-slate-600">contact@enjoyconsult.fr</p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Zone d'intervention</p>
                    <p className="text-slate-600">Île-de-France</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Disponibilité</p>
                    <p className="text-slate-600">Lun-Sam : 8h-20h</p>
                    <p className="text-sm text-emerald-600 font-medium">Urgence 7j/7</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact */}
            <div className="bg-emerald-600 rounded-2xl p-8 text-white">
              <h3 className="text-xl font-bold mb-4">Urgence DDPP ?</h3>
              <p className="text-emerald-100 mb-6">
                En cas de contrôle sanitaire ou de mise en demeure, appelez-nous immédiatement.
              </p>
              <a href="tel:0680952589">
                <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50">
                  <Phone className="mr-2 w-4 h-4" />
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
              <h3 className="text-xl font-bold text-slate-900 mb-8">Formulaire de contact</h3>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Service Type */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Type de demande *</Label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {serviceTypes.map((service) => {
                      const Icon = service.icon;
                      const isSelected = formData.service_type === service.value;
                      return (
                        <div
                          key={service.value}
                          onClick={() => handleChange("service_type", service.value)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? "border-emerald-500 bg-emerald-50" 
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                            <div>
                              <p className={`font-semibold ${isSelected ? "text-emerald-700" : "text-slate-700"}`}>
                                {service.label}
                              </p>
                              <p className="text-sm text-slate-500">{service.desc}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Urgency */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Niveau d'urgence</Label>
                  <RadioGroup 
                    value={formData.urgency} 
                    onValueChange={(value) => handleChange("urgency", value)}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="urgent" id="urgent" />
                      <Label htmlFor="urgent" className="text-red-600 font-medium cursor-pointer">Urgent (contrôle en cours)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normal" id="normal" />
                      <Label htmlFor="normal" className="cursor-pointer">Normal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="information" id="information" />
                      <Label htmlFor="information" className="cursor-pointer">Simple renseignement</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Contact Info */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="restaurant_name">Nom du restaurant *</Label>
                    <Input
                      id="restaurant_name"
                      placeholder="Ex: La Belle Assiette"
                      value={formData.restaurant_name}
                      onChange={(e) => handleChange("restaurant_name", e.target.value)}
                      required
                      className="py-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Votre nom *</Label>
                    <Input
                      id="contact_name"
                      placeholder="Prénom Nom"
                      value={formData.contact_name}
                      onChange={(e) => handleChange("contact_name", e.target.value)}
                      required
                      className="py-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@restaurant.fr"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                      className="py-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="06 XX XX XX XX"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                      className="py-6"
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Décrivez votre situation</Label>
                  <Textarea
                    id="message"
                    placeholder="Décrivez brièvement votre besoin ou la situation actuelle de votre établissement..."
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    rows={5}
                  />
                </div>

                {/* Submit */}
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg"
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 w-5 h-5" />
                      Envoyer ma demande
                    </>
                  )}
                </Button>

                <p className="text-sm text-slate-500 text-center">
                  En soumettant ce formulaire, vous acceptez d'être recontacté par nos équipes.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}