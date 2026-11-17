// Script de Louis : empreinte du mot de passe de la vente sur invitation (saisies lues sur l'entrée standard ici).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifierMotDePasse } from "../src/lib/billing/motdepasse-vente.js";

const lancer = (entree, args = []) => spawnSync(process.execPath, ["scripts/empreinte-mot-de-passe-vente.mjs", ...args], { input: entree, encoding: "utf8" });

test("deux saisies identiques : une empreinte qui vérifie ce mot de passe, et le mot de passe n'apparaît nulle part", async () => {
  const r = lancer("trois mots de passe\ntrois mots de passe\n");
  assert.equal(r.status, 0, r.stderr);
  const ligne = r.stdout.trim();
  assert.match(ligne, /^VITE_VENTE_MOT_DE_PASSE=pbkdf2-sha256:600000:/);
  assert.equal(await verifierMotDePasse("trois mots de passe", ligne.split("=")[1]), true);
  assert.ok(!r.stdout.includes("trois mots") && !r.stderr.includes("trois mots"));
});

test("--fichier : l'empreinte est écrite (lisible par le seul utilisateur), rien d'autre", async () => {
  const dossier = mkdtempSync(path.join(tmpdir(), "empreinte-"));
  const fichier = path.join(dossier, "empreinte-vente.txt");
  const r = lancer("une autre phrase\nune autre phrase\n", ["--fichier", fichier]);
  assert.equal(r.status, 0, r.stderr);
  const contenu = readFileSync(fichier, "utf8");
  assert.match(contenu, /^VITE_VENTE_MOT_DE_PASSE=pbkdf2-sha256:600000:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+\n$/);
  assert.equal(statSync(fichier).mode & 0o777, 0o600);
  assert.ok(!r.stdout.includes("une autre phrase"));
});

test("l'empreinte écrite dans un .env est lue intacte par Vite (loadEnv) et vérifie le mot de passe", async () => {
  const { loadEnv } = await import("vite");
  const dossier = mkdtempSync(path.join(tmpdir(), "empreinte-env-"));
  const r = lancer("phrase pour vite\nphrase pour vite\n", ["--fichier", path.join(dossier, ".env.production.local")]);
  assert.equal(r.status, 0, r.stderr);
  const env = loadEnv("production", dossier, "VITE_");
  assert.equal(await verifierMotDePasse("phrase pour vite", env.VITE_VENTE_MOT_DE_PASSE), true);
});

test("--fichier vers un fichier existant : arrêt, le fichier n'est pas touché", () => {
  const dossier = mkdtempSync(path.join(tmpdir(), "empreinte-"));
  const fichier = path.join(dossier, ".env.production.local");
  writeFileSync(fichier, "VITE_API_URL=https://api.exemple.fr/v1\n");
  const r = lancer("une autre phrase\nune autre phrase\n", ["--fichier", fichier]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /existe déjà/);
  assert.equal(readFileSync(fichier, "utf8"), "VITE_API_URL=https://api.exemple.fr/v1\n");
});

test("saisies différentes, trop courte, ou absente : arrêt, rien d'écrit", () => {
  const dossier = mkdtempSync(path.join(tmpdir(), "empreinte-"));
  const fichier = path.join(dossier, "x.txt");
  for (const entree of ["trois mots de passe\ntrois mots de pas\n", "court\ncourt\n", ""]) {
    const r = lancer(entree, ["--fichier", fichier]);
    assert.equal(r.status, 1, JSON.stringify(entree));
    assert.match(r.stderr, /ARRET/);
    assert.equal(existsSync(fichier), false);
  }
});
