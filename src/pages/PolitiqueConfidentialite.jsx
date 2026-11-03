import { Link } from "react-router-dom";
import DocumentLegal from "@/pages/DocumentLegal";

// URL déclarée aux magasins d'applications : elle affiche la politique de l'application.
// Les fiches passeront à /application/confidentialite à la prochaine version des apps.
export default function PolitiqueConfidentialite() {
  return (
    <DocumentLegal
      cle="confidentialite-application"
      avant={
        <p className="text-muted text-[14px] mb-6">
          Vous cherchez la politique du site restoclair.fr ?{" "}
          <Link to="/confidentialite" className="link-underline">Politique de confidentialité du site</Link>
        </p>
      }
    />
  );
}
