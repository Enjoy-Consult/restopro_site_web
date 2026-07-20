import { useLocation } from 'react-router-dom';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-paper">
            <div className="max-w-md w-full text-center">
                <h1 className="font-serif text-7xl text-border mb-4">404</h1>
                <hr className="rule w-16 mx-auto mb-6" />
                <h2 className="font-serif text-2xl text-ink mb-3">Page introuvable</h2>
                <p className="text-muted mb-8">
                    La page <span className="font-medium text-ink">"{pageName}"</span> n'existe pas.
                </p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="btn-primary"
                >
                    Retour à l'accueil
                </button>
            </div>
        </div>
    );
}
