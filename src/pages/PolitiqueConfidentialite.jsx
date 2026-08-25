import { BUSINESS } from "@/lib/business-info";
import SEO from "@/components/SEO";

/**
 * Politique de confidentialité unique couvrant les trois services édités par
 * RESTOCLAIR SAS : le site vitrine restoclair.fr, l'application RestoClair
 * (iOS / Android) et l'application PMSOclair.
 *
 * Cette page est l'URL de politique de confidentialité déclarée aux magasins
 * d'applications (Google Play, App Store). Son contenu doit rester cohérent
 * avec le formulaire « Sécurité des données » du Play Console et avec la page
 * légale interne de l'application (src/pages/LegalPage.tsx). Toute modification
 * des données collectées ou des durées de conservation doit être répercutée
 * aux trois endroits.
 */
export default function PolitiqueConfidentialite() {
  const H2 = "text-ink font-semibold text-lg mb-3";
  const H3 = "text-ink font-medium text-[15px] mt-4 mb-2";
  const UL = "list-disc pl-5 mt-2 space-y-1";

  return (
    <>
      <SEO
        title="Politique de confidentialité - RestOclair"
        description="Politique de confidentialité et de protection des données personnelles du site RestOclair et des applications RestoClair et PMSOclair."
      />
      <div className="max-w-[800px] mx-auto px-6 py-16">
        <h1 className="text-ink font-serif text-3xl mb-2">Politique de confidentialité</h1>
        <p className="text-muted text-sm mb-8">Dernière mise à jour : 25 août 2026</p>

        <div className="space-y-8 text-muted text-[15px] leading-relaxed">
          <section>
            <h2 className={H2}>Périmètre</h2>
            <p>
              La présente politique s'applique à l'ensemble des services édités par RESTOCLAIR SAS :
            </p>
            <ul className={UL}>
              <li>
                <strong>Le site {BUSINESS.url.replace("https://", "")}</strong> — site de présentation
                et formulaire de contact.
              </li>
              <li>
                <strong>L'application RestoClair</strong> — application mobile et web de gestion du
                plan de maîtrise sanitaire, distribuée sur Google Play et sur l'App Store.
              </li>
              <li>
                <strong>L'application PMSOclair</strong> — outil de rédaction et de suivi du plan de
                maîtrise sanitaire.
              </li>
            </ul>
            <p className="mt-3">
              Les traitements diffèrent d'un service à l'autre. Chaque section précise le service
              concerné lorsque la distinction est utile.
            </p>
          </section>

          <section>
            <h2 className={H2}>Responsable du traitement</h2>
            <p>
              <strong>RESTOCLAIR SAS</strong>
              <br />
              SIREN 104 612 437
              <br />
              {BUSINESS.address.streetAddress}, {BUSINESS.address.postalCode}{" "}
              {BUSINESS.address.city}, France
              <br />
              Email : {BUSINESS.email}
            </p>
            <p className="mt-3">
              RESTOCLAIR SAS n'a pas désigné de délégué à la protection des données. Les demandes
              relatives aux données personnelles sont traitées à l'adresse ci-dessus.
            </p>
          </section>

          <section>
            <h2 className={H2}>Données collectées</h2>

            <h3 className={H3}>Site vitrine</h3>
            <p>Uniquement les informations que vous saisissez dans le formulaire de contact :</p>
            <ul className={UL}>
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Nom de l'établissement</li>
              <li>Message libre</li>
            </ul>

            <h3 className={H3}>Application RestoClair</h3>
            <p>Données de compte, saisies par vous ou par l'administrateur de votre établissement :</p>
            <ul className={UL}>
              <li>Nom, prénom et adresse email de l'utilisateur</li>
              <li>Rôle au sein de l'établissement et identifiant de connexion</li>
              <li>Nom, adresse et coordonnées de l'établissement</li>
            </ul>
            <p className="mt-3">Données métier, produites par l'usage de l'application :</p>
            <ul className={UL}>
              <li>Relevés de températures, équipements et enregistrements de suivi</li>
              <li>Réceptions de marchandises, produits et fournisseurs</li>
              <li>Tâches d'hygiène, plans de nettoyage et traçabilité associée</li>
              <li>Photographies prises volontairement depuis l'application à des fins de traçabilité</li>
            </ul>
            <p className="mt-3">
              Données techniques, collectées automatiquement à chaque connexion :
            </p>
            <ul className={UL}>
              <li>
                <strong>Journal de connexion</strong> : date et heure, adresse IP, type d'appareil et
                identifiant technique de session.
              </li>
            </ul>
            <p className="mt-3">
              L'application demande l'accès au <strong>réseau local et au Bluetooth</strong>
              {" "}uniquement pour détecter les imprimantes d'étiquettes présentes à proximité et leur
              envoyer des travaux d'impression. Aucune donnée de localisation n'est collectée,
              conservée ni transmise : la permission de localisation exigée par Android pour la
              recherche Bluetooth est déclarée avec l'attribut{" "}
              <code className="text-[13px]">neverForLocation</code>, qui interdit techniquement d'en
              déduire votre position.
            </p>

            <h3 className={H3}>Application PMSOclair</h3>
            <ul className={UL}>
              <li>Identifiants de compte : nom, prénom, adresse email</li>
              <li>Informations relatives à l'établissement et à son activité</li>
              <li>Contenu du plan de maîtrise sanitaire rédigé par l'utilisateur</li>
              <li>Données de facturation, si vous souscrivez un abonnement payant</li>
            </ul>
          </section>

          <section>
            <h2 className={H2}>Finalités et bases légales</h2>
            <ul className={UL}>
              <li>
                <strong>Répondre à vos demandes</strong> (formulaire de contact) — intérêt légitime,
                puis consentement pour toute relance commerciale.
              </li>
              <li>
                <strong>Fournir le service souscrit</strong> : création de compte, accès aux
                fonctionnalités, sauvegarde de vos enregistrements — exécution du contrat.
              </li>
              <li>
                <strong>Assurer la traçabilité sanitaire</strong> exigée par la réglementation
                applicable aux établissements alimentaires — obligation légale pesant sur
                l'établissement utilisateur.
              </li>
              <li>
                <strong>Sécuriser le service</strong> : journal de connexion, détection des accès
                anormaux, limitation des tentatives de connexion — intérêt légitime.
              </li>
              <li>
                <strong>Gérer la facturation</strong> et satisfaire aux obligations comptables —
                obligation légale.
              </li>
            </ul>
            <p className="mt-3">
              Aucune donnée n'est utilisée à des fins publicitaires. Aucun profilage ni décision
              automatisée produisant des effets juridiques n'est mis en œuvre.
            </p>
          </section>

          <section>
            <h2 className={H2}>Durées de conservation</h2>
            <ul className={UL}>
              <li>
                <strong>Formulaire de contact</strong> : 3 ans à compter du dernier contact,
                conformément aux recommandations de la CNIL.
              </li>
              <li>
                <strong>Compte utilisateur et données métier</strong> : pendant toute la durée de
                l'abonnement, puis 12 mois après la résiliation, délai au terme duquel les données
                sont supprimées.
              </li>
              <li>
                <strong>Enregistrements de traçabilité sanitaire</strong> : conservés selon la durée
                définie par l'établissement au titre de ses propres obligations réglementaires, et au
                minimum le temps de l'abonnement.
              </li>
              <li>
                <strong>Journal de connexion</strong> : 12 mois.
              </li>
              <li>
                <strong>Pièces comptables et factures</strong> : 10 ans, durée légale.
              </li>
            </ul>
          </section>

          <section>
            <h2 className={H2}>Hébergement et sous-traitants</h2>
            <p>
              Les données ne sont ni vendues, ni louées, ni cédées à des tiers à des fins
              commerciales. Elles ne sont transmises qu'aux prestataires techniques strictement
              nécessaires au fonctionnement de chaque service.
            </p>

            <h3 className={H3}>Site vitrine et application RestoClair</h3>
            <ul className={UL}>
              <li>
                <strong>OVHcloud</strong> (France) — hébergement des serveurs et de la base de
                données. Unique sous-traitant. Aucune donnée ne quitte le territoire français.
              </li>
            </ul>

            <h3 className={H3}>Application PMSOclair</h3>
            <ul className={UL}>
              <li>
                <strong>Supabase</strong> — base de données et authentification, hébergées sur
                Amazon Web Services, région <em>eu-west-1</em> (Irlande, Union européenne).
              </li>
              <li>
                <strong>OVHcloud</strong> (Gravelines, France) — hébergement applicatif.
              </li>
              <li>
                <strong>Stripe</strong> — traitement des paiements. RESTOCLAIR SAS n'a jamais accès
                au numéro de votre carte bancaire, qui est transmis directement à Stripe.
              </li>
              <li>
                <strong>StackBlitz</strong> — environnement de développement et de prévisualisation.
              </li>
            </ul>

            <h3 className={H3}>Transferts hors Union européenne</h3>
            <p>
              Aucun transfert de données personnelles n'est effectué en dehors de l'Union européenne
              dans le cadre du site vitrine et de l'application RestoClair. Pour PMSOclair, les
              prestataires susceptibles de traiter des données depuis un pays tiers le font sur la
              base des clauses contractuelles types de la Commission européenne.
            </p>
          </section>

          <section>
            <h2 className={H2}>Sécurité</h2>
            <ul className={UL}>
              <li>Chiffrement de bout en bout des échanges entre l'application et nos serveurs (HTTPS/TLS).</li>
              <li>Mots de passe stockés sous forme de condensats non réversibles, jamais en clair.</li>
              <li>Jetons de session à durée limitée, renouvelés par rotation avec détection de réutilisation.</li>
              <li>Limitation du nombre de tentatives de connexion par adresse IP.</li>
              <li>Cloisonnement des données par établissement : un utilisateur n'accède qu'aux données du sien.</li>
            </ul>
          </section>

          <section>
            <h2 className={H2}>Vos droits</h2>
            <p>
              Conformément au Règlement général sur la protection des données (RGPD) et à la loi
              Informatique et Libertés, vous disposez des droits suivants :
            </p>
            <ul className={UL}>
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité</li>
              <li>Droit d'opposition</li>
              <li>Droit de définir des directives relatives au sort de vos données après votre décès</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, écrivez à <strong>{BUSINESS.email}</strong>. Une réponse vous
              est apportée dans un délai d'un mois. Une preuve d'identité peut être demandée en cas
              de doute raisonnable sur l'identité du demandeur.
            </p>
          </section>

          <section>
            <h2 className={H2}>Suppression de votre compte et de vos données</h2>
            <p>
              Vous pouvez demander à tout moment la suppression de votre compte et des données
              associées en écrivant à <strong>{BUSINESS.email}</strong> depuis l'adresse email
              rattachée au compte, ou par l'intermédiaire de l'administrateur de votre établissement.
            </p>
            <p className="mt-3">
              La suppression est effectuée sous 30 jours. Elle porte sur le compte, les données
              d'identification et les données métier associées. Seules sont conservées au-delà les
              données que la loi nous impose de garder, en particulier les pièces comptables pendant
              10 ans, ainsi que les enregistrements de traçabilité sanitaire que votre établissement
              serait tenu de conserver au titre de ses propres obligations.
            </p>
          </section>

          <section>
            <h2 className={H2}>Cookies et traceurs</h2>
            <p>
              Aucun cookie publicitaire, aucun traceur tiers, aucun outil de mesure d'audience
              externe n'est utilisé. Seuls sont déposés les cookies strictement nécessaires au
              fonctionnement des services : maintien de la session authentifiée et sécurisation des
              échanges. Ces cookies sont exemptés de consentement préalable au sens des
              recommandations de la CNIL.
            </p>
            <p className="mt-3">
              Les applications mobiles ne contiennent aucun kit de développement publicitaire ni
              outil d'analyse comportementale.
            </p>
          </section>

          <section>
            <h2 className={H2}>Mineurs</h2>
            <p>
              Les services s'adressent exclusivement à des professionnels de la restauration et des
              métiers de bouche. Ils ne sont pas destinés aux mineurs et aucune donnée n'est
              sciemment collectée auprès d'une personne de moins de 16 ans.
            </p>
          </section>

          <section>
            <h2 className={H2}>Modifications</h2>
            <p>
              La présente politique peut être mise à jour pour tenir compte d'évolutions légales ou
              fonctionnelles. La date de dernière mise à jour figure en tête de page. En cas de
              modification substantielle des traitements, les utilisateurs sont informés par email
              ou lors de leur connexion suivante.
            </p>
          </section>

          <section>
            <h2 className={H2}>Réclamation</h2>
            <p>
              Si vous estimez, après nous avoir contactés, que le traitement de vos données n'est pas
              conforme, vous pouvez adresser une réclamation à la Commission nationale de
              l'informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris
              Cedex 07 — <span className="whitespace-nowrap">www.cnil.fr</span>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
