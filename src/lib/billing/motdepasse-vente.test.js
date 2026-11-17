// Mot de passe de la vente sur invitation : empreinte PBKDF2 et vérification (motdepasse-vente.js).
import test from "node:test";
import assert from "node:assert/strict";
import { ITERATIONS, LONGUEUR_MIN, calculerEmpreinte, lireEmpreinte, verifierMotDePasse } from "./motdepasse-vente.js";

const SEL = new Uint8Array(16).fill(7);

test("empreinte : format pbkdf2-sha256$itérations$sel$empreinte, relue à l'identique", async () => {
  const e = await calculerEmpreinte("une phrase de passe", { iterations: 1000, sel: SEL });
  assert.match(e, /^pbkdf2-sha256:1000:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{43}$/);
  const lue = lireEmpreinte(e);
  assert.equal(lue.iterations, 1000);
  assert.deepEqual([...lue.sel], [...SEL]);
  assert.equal(lue.empreinte.length, 32);
  // Même mot de passe, même sel : même empreinte ; sel aléatoire par défaut : empreintes différentes.
  assert.equal(await calculerEmpreinte("une phrase de passe", { iterations: 1000, sel: SEL }), e);
  assert.notEqual(await calculerEmpreinte("x".repeat(12), { iterations: 1000 }), await calculerEmpreinte("x".repeat(12), { iterations: 1000 }));
});

test("vérification : le bon mot de passe passe, tout autre non", async () => {
  const e = await calculerEmpreinte("Cuisine Propre 2026", { iterations: 1000, sel: SEL });
  assert.equal(await verifierMotDePasse("Cuisine Propre 2026", e), true);
  for (const faux of ["cuisine propre 2026", "Cuisine Propre 2026 ", "Cuisine Propre", "", " "]) {
    assert.equal(await verifierMotDePasse(faux, e), false, JSON.stringify(faux));
  }
  assert.equal(await verifierMotDePasse(undefined, e), false);
});

test("vérification : accents composés ou décomposés reconnus de même (NFC)", async () => {
  const e = await calculerEmpreinte("Sécurité alimentaire", { iterations: 1000, sel: SEL });
  assert.equal(await verifierMotDePasse("Se\u0301curite\u0301 alimentaire", e), true);
});

test("empreinte illisible ou crypto absente : refus, jamais d'exception", async () => {
  const bonne = await calculerEmpreinte("une phrase de passe", { iterations: 1000, sel: SEL });
  for (const texte of ["", "abc", "pbkdf2-sha256:1000:sel", "md5:1000:AAAAAAAAAAAAAAAAAAAAAA:" + "B".repeat(43), "pbkdf2-sha256:10:AAAAAAAAAAAAAAAAAAAAAA:" + "B".repeat(43),
    "pbkdf2-sha256$1000$AAAAAAAAAAAAAAAAAAAAAA$" + "B".repeat(43),
    "pbkdf2-sha256:1000:AAAA:" + "B".repeat(43), "pbkdf2-sha256:1000:AAAAAAAAAAAAAAAAAAAAAA:" + "B".repeat(20), "pbkdf2-sha256:1000:AAAAAAAAAAAAAAAAAAAAAA:" + "B".repeat(42) + "!", null, undefined]) {
    assert.equal(lireEmpreinte(texte), null, String(texte));
    assert.equal(await verifierMotDePasse("une phrase de passe", texte), false, String(texte));
  }
  assert.equal(await verifierMotDePasse("une phrase de passe", bonne, null), false);
});

test("réglages : 600 000 itérations par défaut, 10 caractères au moins pour le script", async () => {
  assert.equal(ITERATIONS, 600000);
  assert.equal(LONGUEUR_MIN, 10);
  const e = await calculerEmpreinte("une phrase de passe assez longue");
  assert.match(e, /^pbkdf2-sha256:600000:/);
  assert.equal(await verifierMotDePasse("une phrase de passe assez longue", e), true);
});
