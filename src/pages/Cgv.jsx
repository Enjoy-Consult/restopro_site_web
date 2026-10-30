import SEO from "@/components/SEO";
import { BUSINESS } from "@/lib/business-info";

// Page provisoire : le texte des conditions générales de vente reste à fournir.
export default function Cgv() {
  return (
    <>
      <SEO
        title="Conditions générales de vente"
        description="Conditions générales de vente des abonnements RestOclair."
        canonicalUrl="https://restoclair.fr/cgv"
        noindex
      />
      <div className="max-w-[800px] mx-auto px-6 py-16">
        <h1 className="text-ink font-serif text-3xl mb-8">Conditions générales de vente</h1>
        <p className="text-muted text-[15px] leading-relaxed">
          Les conditions générales de vente des abonnements sont en cours de rédaction. Pour toute question, écrivez-nous à{" "}
          <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>.
        </p>
      </div>
    </>
  );
}
