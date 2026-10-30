// Contrôles du formulaire d'inscription (côté navigateur).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export function estSiretValide(valeur) {
  const siret = nettoyerSiret(valeur);
  return /^\d{14}$/.test(siret) && luhnValide(siret);
}

export function estCodePostalValide(valeur) {
  return /^\d{5}$/.test(String(valeur ?? "").trim());
}

export function estMotDePasseValide(valeur) {
  const mdp = String(valeur ?? "");
  return mdp.length >= 8 && /\p{L}/u.test(mdp) && /\d/.test(mdp);
}

const REQUIS = {
  prenom: "Indiquez votre prénom.",
  nom: "Indiquez votre nom.",
  nomCommercial: "Indiquez le nom commercial de l’établissement.",
  raisonSociale: "Indiquez la raison sociale.",
  ligne1: "Indiquez l’adresse de l’établissement.",
  ville: "Indiquez la ville.",
};

// Renvoie { champ: message } ; objet vide si tout est valide.
export function validerInscription(v) {
  const erreurs = {};

  for (const [champ, message] of Object.entries(REQUIS)) {
    if (!String(v[champ] ?? "").trim()) erreurs[champ] = message;
  }

  if (!String(v.email ?? "").trim()) erreurs.email = "Indiquez votre adresse e-mail.";
  else if (!estEmailValide(v.email)) erreurs.email = "Cette adresse e-mail n’est pas valide.";

  if (!v.motDePasse) erreurs.motDePasse = "Choisissez un mot de passe.";
  else if (!estMotDePasseValide(v.motDePasse))
    erreurs.motDePasse = "Le mot de passe doit faire au moins 8 caractères, dont une lettre et un chiffre.";

  if (!v.confirmation) erreurs.confirmation = "Confirmez votre mot de passe.";
  else if (v.confirmation !== v.motDePasse) erreurs.confirmation = "Les deux mots de passe ne sont pas identiques.";

  const siret = nettoyerSiret(v.siret);
  if (!siret) erreurs.siret = "Indiquez le numéro SIRET.";
  else if (!/^\d{14}$/.test(siret)) erreurs.siret = "Le SIRET comporte 14 chiffres.";
  else if (!luhnValide(siret)) erreurs.siret = "Ce numéro SIRET n’est pas valide. Vérifiez-le.";

  if (!String(v.codePostal ?? "").trim()) erreurs.codePostal = "Indiquez le code postal.";
  else if (!estCodePostalValide(v.codePostal)) erreurs.codePostal = "Le code postal comporte 5 chiffres.";

  if (!v.cgv) erreurs.cgv = "Vous devez accepter les conditions pour continuer.";

  return erreurs;
}
