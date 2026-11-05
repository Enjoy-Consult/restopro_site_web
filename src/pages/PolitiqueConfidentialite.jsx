import { useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  // Lien du bandeau de consentement (#cookies) : le navigateur ne peut pas défiler seul, la page s'affiche après le chargement.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

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
        <p className="text-muted text-sm mb-8">Dernière mise à jour : 29 septembre 2026</p>

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
            <p>Les informations que vous saisissez dans les formulaires de contact et d'essai gratuit :</p>
            <ul className={UL}>
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Nom de l'établissement</li>
              <li>Poste (demande d'essai)</li>
              <li>Message libre (demande de contact)</li>
            </ul>
            <p className="mt-3">
              Avec votre accord, Google Ads et Google Analytics collectent aussi des données de navigation (voir
              « Cookies et traceurs »).
            </p>

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
              <li>
                <strong>Notifications et e-mails</strong> : identifiant de notification de l'appareil,
                adresse email, et contenu de chaque alerte, rappel ou email envoyé (par exemple une
                température hors limites, une tâche à faire, un code de réinitialisation du mot de
                passe).
              </li>
            </ul>
            <p className="mt-3">
              <strong>Lecture des étiquettes</strong> : quand vous photographiez l'étiquette d'un
              produit, son texte et ses codes-barres (nom, lot, date limite, estampille sanitaire) sont
              lus sur votre appareil pour pré-remplir la fiche. Ni la photo ni le texte lu ne sont
              transmis pour cette lecture ; la photo n'est envoyée à nos serveurs que si vous la
              joignez à la fiche.
            </p>
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
              <li>
                <strong>Mesurer l'efficacité de nos annonces, montrer des publicités RestOclair sur d'autres
                sites et mesurer la fréquentation du site</strong> (Google Ads et Google Analytics, voir
                « Cookies et traceurs ») — consentement.
              </li>
            </ul>
            <p className="mt-3">
              En dehors de ces traceurs du site, aucune donnée n'est utilisée à des fins publicitaires. Aucun
              profilage ni décision automatisée produisant des effets juridiques n'est mis en œuvre.
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
                <strong>OVHcloud</strong> (France) — hébergement des serveurs, de la base de données
                et des médias. Les données enregistrées dans l'application — comptes, registres,
                photos — restent hébergées en France.
              </li>
              <li>
                <strong>Airtable</strong> (Formagrid Inc., États-Unis) — enregistrement des demandes de contact
                et d'essai du site.
              </li>
              <li>
                <strong>FormSubmit</strong> — envoi de la notification d'une demande d'essai à la messagerie de
                l'équipe.
              </li>
              <li>
                <strong>Google Cloud France</strong> (Google Workspace) — messagerie de l'équipe.
              </li>
              <li>
                <strong>Google Ireland Limited</strong> — Google Ads et Google Analytics, seulement avec votre
                accord (voir « Cookies et traceurs »).
              </li>
            </ul>

            <h3 className={H3}>Application RestoClair : prestataires techniques de l'application mobile</h3>
            <ul className={UL}>
              <li>
                <strong>Google (Firebase Cloud Messaging)</strong>, et <strong>Apple</strong> sur
                iPhone — acheminement des notifications. Ils reçoivent l'identifiant de notification
                de l'appareil et le contenu de chaque notification. Couper « Push » dans Mon Profil ›
                Notifications, ou se déconnecter de l'appareil, l'évite (désactiver les notifications
                dans les réglages du téléphone en masque l'affichage, pas l'envoi).
              </li>
              <li>
                <strong>Resend</strong> — envoi des emails : notifications, codes de réinitialisation
                du mot de passe, alertes de sécurité du compte. Resend reçoit l'adresse email et le
                contenu du message, et traite principalement aux États-Unis. Couper « Email » dans Mon
                Profil › Notifications arrête les emails de notification.
              </li>
              <li>
                <strong>Google (ML Kit)</strong>, sur Android — moteur de lecture des étiquettes,
                exécuté sur l'appareil. Google reçoit des informations techniques de fonctionnement :
                modèle et version du système de l'appareil, version de l'application, identifiants
                d'installation non liés à votre compte, durées de traitement, format d'image, codes
                d'erreur. Jamais la photo ni le texte lu. Sur iPhone, la lecture utilise Apple Vision
                et rien n'est transmis.
              </li>
              <li>
                <strong>Open Food Facts</strong> (association française) — base publique de produits
                alimentaires. Quand un code-barres de produit est lu, l'application l'interroge avec
                ce seul numéro pour retrouver le nom, la marque et les allergènes. Aucune donnée de
                compte n'est transmise ; comme pour toute connexion, l'adresse IP de l'appareil est
                visible de ce serveur.
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
              Pour le site vitrine, des données peuvent être traitées hors de l'Union européenne : par
              Airtable, aux États-Unis, sur la base des clauses contractuelles types de la Commission
              européenne ; par Google (Google Fonts, messagerie de l'équipe et, avec votre accord, Google Ads
              et Google Analytics), sur la base du cadre de protection des données UE–États-Unis
              (<em>Data Privacy Framework</em>), auquel Google LLC a adhéré ; par Unsplash, au Canada, pays
              qui bénéficie d'une décision d'adéquation de la Commission européenne ; par FormSubmit, dont le
              pays de traitement n'est pas établi. Pour l'application RestoClair, Google et Apple, pour les
              notifications et, sur Android, pour le moteur de lecture des étiquettes, et Resend, pour
              les emails, peuvent traiter les données décrites ci-dessus hors de l'Union européenne,
              notamment aux États-Unis : ces transferts reposent sur le cadre de protection des données
              UE–États-Unis (<em>Data Privacy Framework</em>), auquel Google LLC, Apple Inc. et Resend
              ont adhéré, et sur les clauses contractuelles types de la Commission européenne. Pour PMSOclair, les
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

          <section id="cookies" className="scroll-mt-24">
            <h2 className={H2}>Cookies et traceurs</h2>
            <p>
              Avec votre accord, et seulement après celui-ci, le site charge Google Tag Manager, qui active Google Ads
              et Google Analytics. Ces deux outils relèvent d'un seul choix dans le bandeau de consentement, décoché par
              défaut. Tant que vous n'avez pas accepté, aucune de leurs balises n'est chargée et aucun de leurs cookies
              n'est déposé.
            </p>
            <h3 className={H3}>Si vous acceptez</h3>
            <ul className={UL}>
              <li>
                Google Ads mesure l'efficacité de nos annonces (clic sur notre numéro de téléphone, envoi du formulaire
                de contact) et peut vous montrer ensuite des publicités RestOclair sur d'autres sites (remarketing). Il
                dépose sur restoclair.fr le cookie _gcl_au et, si vous venez d'une annonce, le cookie _gcl_aw, conservés
                90 jours, ainsi que ses propres cookies sur les domaines de Google. Votre navigateur peut figurer 180
                jours dans nos listes d'audience.
              </li>
              <li>
                Quand vous envoyez le formulaire de contact, la balise de Google Ads peut relever dans la page votre
                adresse e-mail, votre numéro de téléphone et votre adresse, et les transmettre à Google sous forme
                hachée, pour rattacher votre demande à une annonce (conversions améliorées).
              </li>
              <li>
                Google Analytics mesure la fréquentation du site : pages vues, défilement, clics vers d'autres sites,
                recherches, vidéos, téléchargements de fichiers et utilisation des formulaires. Il fonctionne sans ses
                cookies : le réglage analytics_storage reste refusé, et les cookies _ga et _ga_Z0ZKBK12KB ne sont ni
                déposés ni lus. Google Analytics reçoit le nom de l'événement, l'adresse et le titre de la page, sa
                provenance, la langue, la taille de l'écran, le navigateur, le système et un numéro aléatoire créé à
                chaque chargement de page. Sans ces cookies, votre navigateur n'est pas reconnu d'une visite à l'autre
                par Google Analytics. Google indique que l'adresse IP des visiteurs de l'Union européenne sert seulement
                à déduire une localisation approximative, puis est effacée, et conserve les données détaillées 14 mois au
                plus, selon le réglage du compte.
              </li>
            </ul>
            <p className="mt-3">
              Ces informations sont transmises à Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irlande)
              et peuvent être transférées aux États-Unis ; Google LLC adhère au cadre de protection des données
              UE–États-Unis (Data Privacy Framework). Ce traitement repose sur votre consentement. Votre choix est
              conservé 6 mois au plus. Vous pouvez le modifier à tout moment avec le lien « Gérer mes cookies », en bas de
              chaque page : si vous retirez votre accord, les cookies de Google Ads déposés sur restoclair.fr sont
              effacés et la page est rechargée sans Google Tag Manager.
            </p>
            <p className="mt-3">
              Quel que soit votre choix, les polices de caractères sont chargées depuis Google Fonts et certaines images
              depuis Unsplash : ces services reçoivent votre adresse IP dès l'affichage des pages concernées. Les autres
              cookies sont strictement nécessaires au fonctionnement des services : maintien de la session authentifiée
              et sécurisation des échanges. Ces cookies sont exemptés de consentement préalable au sens des
              recommandations de la CNIL.
            </p>
            <p className="mt-3">
              Les applications mobiles ne contiennent aucun kit de développement publicitaire ni
              outil d'analyse comportementale. Les seules données transmises à Google sont celles
              décrites plus haut : l'identifiant de notification de l'appareil et le contenu des
              notifications (Firebase Cloud Messaging, sur Android et sur iPhone) et, sur Android, les
              informations techniques de fonctionnement du moteur de lecture des étiquettes (Google
              ML Kit).
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
