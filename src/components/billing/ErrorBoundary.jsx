import React from "react";
import Message from "@/components/billing/Message";
import { BUSINESS } from "@/lib/business-info";

// Filet des pages d'abonnement : une erreur de rendu laisse en place l'en-tête et le pied de page.
export default class ErrorBoundary extends React.Component {
  state = { enErreur: false };

  static getDerivedStateFromError() {
    return { enErreur: true };
  }

  render() {
    if (!this.state.enErreur) return this.props.children;
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24">
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
