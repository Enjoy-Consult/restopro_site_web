// Une seule adresse, celle de l'inscription, pour la connexion, la facturation et les e-mails (règle retenue après la
// démonstration du 19/11, coordination du 20/11) : rappelée sous les champs, après une demande de lien et au retour du
// paiement.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AIDE_ADRESSE_INSCRIPTION, TEXTE_RIEN_RECU_ADRESSE, texteLienEnvoye } from "./motdepasse.js";
import { texteDemandeEnvoyee } from "./reprise.js";

const lire = (f) => readFileSync(f, "utf8");

test("textes de la coordination, mot pour mot", () => {
  assert.equal(AIDE_ADRESSE_INSCRIPTION, "L’adresse e-mail donnée lors de votre inscription.");
  const phrase = (t) => `${t.avant}${t.email}${t.apres}`;
  const attendu = "Si l’adresse marie@exemple.fr correspond à un compte, vous recevrez un e-mail dans quelques minutes. Pensez à vérifier vos courriers indésirables.";
  assert.equal(phrase(texteLienEnvoye("marie@exemple.fr")), attendu);
  assert.equal(phrase(texteDemandeEnvoyee("marie@exemple.fr")), attendu);
  assert.equal(`${TEXTE_RIEN_RECU_ADRESSE}contact@restoclair.fr.`, "Rien reçu ? Vérifiez que c’est bien l’adresse de votre inscription, ou écrivez-nous à contact@restoclair.fr.");
});

test("pages : aide sous le champ e-mail, « Rien reçu ? » après la demande, adresse de connexion au retour du paiement", () => {
  for (const f of ["src/compte/pages/Connexion.jsx", "src/compte/pages/MotDePasseOublie.jsx", "src/pages/AbonnementReprendre.jsx"]) {
    const s = lire(f);
    assert.ok(/AIDE_ADRESSE_INSCRIPTION|L’adresse e-mail donnée lors de votre inscription\./.test(s), f);
  }
  for (const f of ["src/compte/pages/MotDePasseOublie.jsx", "src/pages/AbonnementReprendre.jsx"]) assert.match(lire(f), /\{TEXTE_RIEN_RECU_ADRESSE\}/, f);
  const retour = lire("src/pages/AbonnementRetour.jsx");
  assert.match(retour, /Votre adresse de connexion : <strong[^>]*>\{email\}<\/strong>/);
  assert.match(retour, /Utilisez-la pour vous connecter à votre espace et à l’application\./);
  assert.equal(retour.match(/<AdresseConnexion email=/g).length, 3, "actif, provisoire et en place");
  assert.match(lire("src/pages/Inscription.jsx"), /aide="Ce sera votre adresse de connexion, à votre espace et à l’application\./);
});
