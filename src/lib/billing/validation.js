// Contrôles du formulaire d'inscription (côté navigateur).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Bornes de POST /api/billing/inscription, en caractères. Le SIRET et le code postal ont leur propre format.
export const BORNES = {
  prenom: 50,
  nom: 50,
  email: 100,
  nomCommercial: 100,
  raisonSociale: 255,
  ligne1: 255,
  ligne2: 255,
  ville: 100,
};

export function nettoyerSiret(valeur) {
  return String(valeur ?? "").replace(/[\s.]/g, "");
}

export function estEmailValide(valeur) {
  return EMAIL.test(String(valeur ?? "").trim());
}

// Clé de Luhn sur une suite de chiffres.
export function luhnValide(chiffres) {
  let somme = 0;
  let doubler = false;
  for (let i = chiffres.length - 1; i >= 0; i--) {
    let n = chiffres.charCodeAt(i) - 48;
    if (doubler) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
    doubler = !doubler;
  }
  return somme % 10 === 0;
}

// Les établissements de La Poste (SIREN 356000000) ne suivent pas la clé de Luhn : la somme de leurs
// 14 chiffres doit être un multiple de 5. Exception : le siège (35600000000048) suit la clé de Luhn.
// Même règle que python-stdnum (stdnum/fr/siret.py).
const SIREN_LA_POSTE = "356000000";
const SIRET_SIEGE_LA_POSTE = "35600000000048";

export function cleSiretValide(siret) {
  if (siret.startsWith(SIREN_LA_POSTE) && siret !== SIRET_SIEGE_LA_POSTE) {
    return [...siret].reduce((somme, c) => somme + (c.charCodeAt(0) - 48), 0) % 5 === 0;
  }
  return luhnValide(siret);
}

export function estSiretValide(valeur) {
  const siret = nettoyerSiret(valeur);
  return /^\d{14}$/.test(siret) && cleSiretValide(siret);
}

export function estCodePostalValide(valeur) {
  return /^\d{5}$/.test(String(valeur ?? "").trim());
}

// Deux saisies de la même adresse : les espaces autour et la casse ne comptent pas.
export function memesEmails(a, b) {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

const REQUIS = {
  prenom: "Indiquez votre prénom.",
  nom: "Indiquez votre nom.",
  nomCommercial: "Indiquez le nom commercial de l’établissement.",
  raisonSociale: "Indiquez la raison sociale.",
  ligne1: "Indiquez l’adresse de l’établissement.",
  ville: "Indiquez la ville.",
};

const NOMS = {
  prenom: "Le prénom",
  nom: "Le nom",
  email: "L’adresse e-mail",
  nomCommercial: "Le nom commercial",
  raisonSociale: "La raison sociale",
  ligne1: "L’adresse",
  ligne2: "Le complément d’adresse",
  ville: "La ville",
};

// Renvoie { champ: message } ; objet vide si tout est valide.
// Pas de mot de passe : le titulaire reçoit par e-mail un lien pour le choisir après le paiement (CGV 1.0, article 4.7),
// d'où la seconde saisie de l'adresse, qui évite de les envoyer à une adresse mal tapée.
export function validerInscription(v) {
  const erreurs = {};

  for (const [champ, message] of Object.entries(REQUIS)) {
    if (!String(v[champ] ?? "").trim()) erreurs[champ] = message;
  }

  if (!String(v.email ?? "").trim()) erreurs.email = "Indiquez votre adresse e-mail.";
  else if (!estEmailValide(v.email)) erreurs.email = "Cette adresse e-mail n’est pas valide.";

  if (!String(v.confirmationEmail ?? "").trim()) erreurs.confirmationEmail = "Saisissez de nouveau votre adresse e-mail.";
  else if (!erreurs.email && !memesEmails(v.email, v.confirmationEmail))
    erreurs.confirmationEmail = "Les deux adresses e-mail ne sont pas identiques.";

  const siret = nettoyerSiret(v.siret);
  if (!siret) erreurs.siret = "Indiquez le numéro SIRET.";
  else if (!/^\d{14}$/.test(siret)) erreurs.siret = "Le SIRET comporte 14 chiffres.";
  else if (!cleSiretValide(siret)) erreurs.siret = "Ce numéro SIRET n’est pas valide. Vérifiez-le.";

  if (!String(v.codePostal ?? "").trim()) erreurs.codePostal = "Indiquez le code postal.";
  else if (!estCodePostalValide(v.codePostal)) erreurs.codePostal = "Le code postal comporte 5 chiffres.";

  // On mesure ce qui sera envoyé : le texte sans les espaces autour.
  for (const [champ, nom] of Object.entries(NOMS)) {
    if (!erreurs[champ] && String(v[champ] ?? "").trim().length > BORNES[champ])
      erreurs[champ] = `${nom} ne doit pas dépasser ${BORNES[champ]} caractères.`;
  }

  if (!v.cgv) erreurs.cgv = "Vous devez accepter les conditions pour continuer.";

  return erreurs;
}
