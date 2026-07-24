import { BUSINESS } from "@/lib/business-info";
import SEO from "@/components/SEO";

export default function MentionsLegales() {
  return (
    <>
      <SEO
        title="Mentions legales - RestOclair"
        description="Mentions legales du site RestOclair.fr"
      />
      <div className="max-w-[800px] mx-auto px-6 py-16">
        <h1 className="text-ink font-serif text-3xl mb-8">Mentions legales</h1>

        <div className="space-y-8 text-muted text-[15px] leading-relaxed">
          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Editeur du site</h2>
            <p>
              <strong>{BUSINESS.name}</strong><br />
              {BUSINESS.address.streetAddress}<br />
              {BUSINESS.address.postalCode} {BUSINESS.address.city}<br />
              Telephone : {BUSINESS.phone.display}<br />
              Email : {BUSINESS.email}
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Directeur de la publication</h2>
            <p>Le dirigeant de la societe {BUSINESS.name}.</p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Hebergement</h2>
            <p>
              Ce site est heberge par :<br />
              Netlify, Inc.<br />
              512 2nd Street, Suite 200<br />
              San Francisco, CA 94107, USA<br />
              Site web : www.netlify.com
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Propriete intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, images, logo, mise en page) est la propriete
              exclusive de {BUSINESS.name}, sauf mention contraire. Toute reproduction, meme partielle,
              est interdite sans autorisation prealable.
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Responsabilite</h2>
            <p>
              {BUSINESS.name} s'efforce d'assurer l'exactitude des informations presentees sur ce site.
              Toutefois, elle ne saurait etre tenue responsable des erreurs ou omissions, ni des resultats
              qui pourraient etre obtenus par l'usage de ces informations.
            </p>
          </section>

          <section>
            <h2 className="text-ink font-semibold text-lg mb-3">Litiges</h2>
            <p>
              Le present site est soumis au droit francais. En cas de litige, les tribunaux francais
              seront seuls competents.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
