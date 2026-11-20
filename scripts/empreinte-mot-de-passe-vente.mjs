// Empreinte du mot de passe de la vente sur invitation (VITE_VENTE_MOT_DE_PASSE, src/lib/billing/motdepasse-vente.js).
// Louis le lance lui-même : le mot de passe est saisi sans s'afficher, deux fois, et n'est écrit nulle part. Seule
// l'empreinte (PBKDF2, publique par nature : elle part dans le site) est affichée et, avec --fichier, écrite dans un fichier.
//   node scripts/empreinte-mot-de-passe-vente.mjs [--fichier <chemin>]
// Sans terminal (tests), les deux saisies sont lues sur l'entrée standard, une par ligne.
import { existsSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { calculerEmpreinte, LONGUEUR_MIN } from "../src/lib/billing/motdepasse-vente.js";

function arret(message) {
  console.error(`ARRET : ${message}`);
  process.exit(1);
}

// Saisie masquée dans un terminal ; lignes de l'entrée standard sinon.
function lecteur() {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    const lignes = [];
    const attentes = [];
    const rl = createInterface({ input: stdin });
    rl.on("line", (l) => (attentes.length ? attentes.shift()(l) : lignes.push(l)));
    rl.on("close", () => attentes.splice(0).forEach((r) => r(null)));
    return (question) => {
      process.stderr.write(question + "\n");
      return lignes.length ? Promise.resolve(lignes.shift()) : new Promise((r) => attentes.push(r));
    };
  }
  return (question) =>
    new Promise((resoudre) => {
      process.stderr.write(question);
      let saisie = "";
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      const fin = (valeur) => {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", surDonnee);
        process.stderr.write("\n");
        resoudre(valeur);
      };
      const surDonnee = (morceau) => {
        for (const c of morceau) {
          if (c === "\r" || c === "\n") return fin(saisie);
          if (c === "\u0003") return fin(null);
          if (c === "\u007f" || c === "\b") saisie = saisie.slice(0, -1);
          else if (c >= " ") saisie += c;
        }
      };
      stdin.on("data", surDonnee);
    });
}

const args = process.argv.slice(2);
const iFichier = args.indexOf("--fichier");
const fichier = iFichier >= 0 ? args[iFichier + 1] : null;
if (iFichier >= 0 && !fichier) arret("--fichier demande un chemin");
if (fichier && existsSync(fichier)) arret(`${fichier} existe déjà : choisir un nouveau fichier (rien n'est écrasé)`);

const demander = lecteur();
const premier = await demander("Mot de passe de la page Tarifs (rien ne s'affiche) : ");
if (premier === null) arret("saisie annulée");
if ([...premier].length < LONGUEUR_MIN) arret(`au moins ${LONGUEUR_MIN} caractères (une phrase de 3 ou 4 mots est l'idéal)`);
const second = await demander("Encore une fois : ");
if (second !== premier) arret("les deux saisies diffèrent : rien n'a été écrit");

const empreinte = await calculerEmpreinte(premier);
const ligne = `VITE_VENTE_MOT_DE_PASSE=${empreinte}`;
if (fichier) {
  writeFileSync(fichier, `${ligne}\n`, { mode: 0o600, flag: "wx" });
  console.log(`Empreinte écrite dans ${fichier}. Le mot de passe n'a été écrit nulle part.`);
} else {
  console.log(ligne);
}
