import SEO from "@/components/SEO";
import { BUSINESS } from "@/lib/business-info";

// Page provisoire : le texte des conditions générales d’utilisation reste à fournir.
export default function Cgu() {
  return (
    <>
      <SEO
        title="Conditions générales d’utilisation"
        description="Conditions générales d’utilisation de l’application RestOclair."
        canonicalUrl="https://restoclair.fr/cgu"
        noindex
      />
      <div className="max-w-[800px] mx-auto px-6 py-16">
        <h1 className="text-ink font-serif text-3xl mb-8">Conditions générales d’utilisation</h1>
        <p className="text-muted text-[15px] leading-relaxed">
          Les conditions générales d’utilisation de l’application sont en cours de rédaction. Pour toute question, écrivez-nous à{" "}
          <a href={`mailto:${BUSINESS.email}`} className="link-underline">{BUSINESS.email}</a>.
        </p>
      </div>
    </>
  );
}
