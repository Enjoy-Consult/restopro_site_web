import { BUSINESS } from "@/lib/business-info";
import SEO from "@/components/SEO";

export default function PolitiqueConfidentialite() {
  return (
    <>
      <SEO
        title="Politique de confidentialite - RestOclair"
        description="Politique de confidentialite et de protection des donnees personnelles de RestOclair."
      />
      <div className="max-w-[800px] mx-auto px-6 py-16">
        <h1 className="text-ink font-serif text-3xl mb-8">Politique de confidentialite</h1>

        <div className="space-y-8 text-muted text-[15px] leading-relaxed">
          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Responsable du traitement</h2>
            <p>
              Le responsable du traitement des donnees est :<br />
              <strong>{BUSINESS.name}</strong><br />
              {BUSINESS.address.streetAddress}, {BUSINESS.address.postalCode} {BUSINESS.address.city}<br />
              Email : {BUSINESS.email}
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Donnees collectees</h2>
            <p>
              Dans le cadre de l'utilisation de ce site, nous pouvons etre amenes a collecter les
              donnees suivantes :
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nom et prenom</li>
              <li>Adresse email</li>
              <li>Numero de telephone</li>
              <li>Nom de l'etablissement</li>
              <li>Message libre (formulaire de contact)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Finalite du traitement</h2>
            <p>Les donnees collectees sont utilisees pour :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Repondre a vos demandes via le formulaire de contact</li>
              <li>Vous recontacter dans le cadre d'une relation commerciale</li>
              <li>Ameliorer le fonctionnement du site</li>
            </ul>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Duree de conservation</h2>
            <p>
              Les donnees sont conservees pour une duree de 3 ans a compter du dernier contact,
              conformement aux recommandations de la CNIL.
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Partage des donnees</h2>
            <p>
              Vos donnees ne sont ni vendues, ni cedees a des tiers. Elles peuvent etre transmises
              a nos sous-traitants techniques (hebergeur, service d'envoi d'emails) dans le strict cadre
              de leur mission.
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Vos droits</h2>
            <p>
              Conformement au Reglement General sur la Protection des Donnees (RGPD), vous disposez
              des droits suivants :
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Droit d'acces a vos donnees</li>
              <li>Droit de rectification</li>
              <li>Droit a l'effacement</li>
              <li>Droit a la limitation du traitement</li>
              <li>Droit a la portabilite</li>
              <li>Droit d'opposition</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous a l'adresse : {BUSINESS.email}
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Cookies</h2>
            <p>
              Ce site n'utilise pas de cookies publicitaires ni de traceurs tiers. Seuls des cookies
              techniques strictement necessaires au fonctionnement du site peuvent etre utilises.
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Reclamation</h2>
            <p>
              Si vous estimez que le traitement de vos donnees n'est pas conforme, vous pouvez
              adresser une reclamation a la CNIL : www.cnil.fr
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
