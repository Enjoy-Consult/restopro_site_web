import React from "react";
import { Eye, EyeOff } from "lucide-react";

// Champs des pages de connexion de compte.restoclair.fr : hauts (52 px), bordure contrastée (3:1 sur blanc), anneau de
// focus net (3:1), rouge en erreur même au focus (le code y place le focus), contour masqué mais rendu en couleurs
// forcées (outline-hidden), message d'erreur relié au champ. Pendant un envoi, les champs passent en lecture seule plutôt
// qu'inactifs : le focus reste où il était. ChampSecret ajoute le bouton œil (44 × 44 px) à la place de la case
// « Afficher le mot de passe » : libellé constant et aria-pressed ; bouton natif d'Edge masqué (pas de double œil).
const CLASSE =
  "w-full h-[52px] bg-white px-4 text-ink text-[16px] border transition-[border-color,box-shadow] duration-150 focus:outline-hidden focus:ring-[3px] read-only:bg-[#f7f6f1] disabled:opacity-60";
const ETAT = (erreur) =>
  erreur ? "border-[#8a2424] focus:border-[#8a2424] focus:ring-[#8a2424]/40" : "border-[#8a8f86] focus:border-bottle focus:ring-bottle/60";

function Etiquette({ id, label, droite }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2">
      <label htmlFor={id} className="text-ink text-[14px] font-medium">{label}</label>
      {droite}
    </div>
  );
}

function Notes({ id, aide, erreur }) {
  return (
    <>
      {aide && <p id={`${id}-aide`} className="text-faint text-[13px] leading-snug mt-1.5 text-pretty">{aide}</p>}
      {erreur && <p id={`${id}-erreur`} role="alert" className="text-[#8a2424] text-[14px] mt-1.5">{erreur}</p>}
    </>
  );
}

const decrit = (id, aide, erreur) => [aide && `${id}-aide`, erreur && `${id}-erreur`].filter(Boolean).join(" ") || undefined;

export function Champ({ id, label, droite = null, aide = null, erreur = null, ...props }) {
  return (
    <div>
      <Etiquette id={id} label={label} droite={droite} />
      <input
        id={id}
        aria-invalid={erreur ? "true" : undefined}
        aria-describedby={decrit(id, aide, erreur)}
        className={`${CLASSE} ${ETAT(erreur)}`}
        {...props}
      />
      <Notes id={id} aide={aide} erreur={erreur} />
    </div>
  );
}

// Jamais de majuscule ni de correction automatiques, même affiché en clair : le mot de passe enregistré est celui tapé.
//   bascule : avec le bouton œil (faux pour un second champ que le premier commande) ; controle : ids des champs commandés ;
//   libelleBascule : « Afficher les mots de passe » quand un seul bouton en commande deux.
export function ChampSecret({
  id,
  label,
  visible,
  onBasculer,
  bascule = true,
  controle = id,
  libelleBascule = "Afficher le mot de passe",
  droite = null,
  aide = null,
  erreur = null,
  ...props
}) {
  return (
    <div>
      <Etiquette id={id} label={label} droite={droite} />
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={erreur ? "true" : undefined}
          aria-describedby={decrit(id, aide, erreur)}
          className={`${CLASSE} ${bascule ? "pr-14" : ""} [&::-ms-reveal]:hidden ${ETAT(erreur)}`}
          {...props}
        />
        {bascule && (
          <button
            type="button"
            onClick={onBasculer}
            aria-pressed={visible}
            aria-controls={controle}
            aria-label={libelleBascule}
            className="absolute right-1 top-1 grid place-items-center w-11 h-11 text-faint hover:text-ink transition-colors duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-bottle"
          >
            {visible ? <EyeOff aria-hidden="true" size={20} strokeWidth={1.75} /> : <Eye aria-hidden="true" size={20} strokeWidth={1.75} />}
          </button>
        )}
      </div>
      <Notes id={id} aide={aide} erreur={erreur} />
    </div>
  );
}

// Bouton principal des cartes : pleine largeur, marges réduites (une ligne même à 320 px), léger enfoncement au clic
// (propriété scale de Tailwind 4, coupé si l'on réduit les animations). Pendant un envoi : aria-disabled, pas disabled,
// pour garder le focus (le gestionnaire ignore déjà un second envoi).
export const CLASSE_BOUTON =
  "btn-primary w-full px-4 text-center transition-[background-color,scale] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-60 disabled:cursor-wait aria-disabled:opacity-60 aria-disabled:cursor-wait";

// Liens et boutons secondaires sous un formulaire : zone de 40 px de haut au moins.
export const CLASSE_LIEN_SECONDAIRE = "inline-flex items-center gap-1.5 min-h-[40px] text-[14px]";
