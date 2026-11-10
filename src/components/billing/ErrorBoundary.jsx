import React from "react";
import Message from "@/components/billing/Message";
import { BUSINESS } from "@/lib/business-info";

// Filet des pages d'abonnement : une erreur de rendu laisse en place l'en-tête et le pied de page. L'écran de repli a
// son propre titre (h1) : la page qu'il remplace n'en affiche plus. Il reçoit le focus quand il apparaît, pour qu'un
// lecteur d'écran l'annonce (l'élément qui avait le focus a disparu avec la page).
// resetKey (facultatif) : quand il change, l'écran d'erreur laisse la place à la page (navigation vers la même adresse,
// par exemple le logo depuis Mon abonnement) ; une page saine n'est jamais remontée. titre (facultatif) : titre de
// l'onglet pendant l'écran d'erreur ; chaque page remet le sien à son montage. La vitrine ne passe ni l'un ni l'autre.
export default class ErrorBoundary extends React.Component {
  state = { enErreur: false };

  titreRef = React.createRef();

  static getDerivedStateFromError() {
    return { enErreur: true };
  }

  componentDidMount() {
    if (this.state.enErreur) this.annoncer();
  }

  componentDidUpdate(prevProps, prevState) {
    // Déjà en erreur avant ce rendu, et nouvelle navigation : on réessaie la page. Une erreur levée par ce rendu même
    // (prevState.enErreur faux) garde l'écran d'erreur : pas de boucle.
    if (this.state.enErreur && prevState.enErreur && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ enErreur: false });
      return;
    }
    if (this.state.enErreur && !prevState.enErreur) this.annoncer();
  }

  annoncer() {
    if (this.props.titre) document.title = this.props.titre;
    this.titreRef.current?.focus();
  }

  render() {
    if (!this.state.enErreur) return this.props.children;
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24">
        <h1 ref={this.titreRef} tabIndex={-1} className="text-ink mb-5 text-[clamp(2rem,5vw,3rem)] focus:outline-none">
          Page indisponible.
        </h1>
        <Message type="error">
          <p>
            Cette page ne peut pas s’afficher pour le moment. Rechargez-la, ou appelez-nous au{" "}
            <a href={BUSINESS.phone.href} className="link-underline">{BUSINESS.phone.display}</a>.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="link-underline mt-2">
            Recharger la page
          </button>
        </Message>
      </div>
    );
  }
}
