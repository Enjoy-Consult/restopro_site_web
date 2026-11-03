import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import ConsentementCookies from '@/components/ConsentementCookies'
import { ouvrirGestionCookies } from '@/lib/consentement'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import EssaiGratuit from './pages/EssaiGratuit';
import Tarifs from './pages/Tarifs';
import Inscription from './pages/Inscription';
import AbonnementRetour from './pages/AbonnementRetour';
import Cgv from './pages/Cgv';
import DocumentLegal from './pages/DocumentLegal';
import { BILLING_ACTIF } from '@/lib/billing/config';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-paper">
        <div className="w-6 h-6 border-2 border-border border-t-ink animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/essai-gratuit" element={<LayoutWrapper currentPageName="essai-gratuit"><EssaiGratuit /></LayoutWrapper>} />
      {/* Documents légaux : toujours en ligne (le pied de page ne lie CGV, CGU et DPA que si la vente est active) */}
      <Route path="/cgv" element={<LayoutWrapper currentPageName="cgv"><Cgv /></LayoutWrapper>} />
      <Route path="/confidentialite" element={<LayoutWrapper currentPageName="confidentialite"><DocumentLegal cle="confidentialite-site" /></LayoutWrapper>} />
      <Route path="/cookies" element={<LayoutWrapper currentPageName="cookies"><DocumentLegal cle="cookies" apres={<button type="button" onClick={ouvrirGestionCookies} className="btn-primary mt-8">Gérer mes cookies</button>} /></LayoutWrapper>} />
      <Route path="/application/cgu" element={<LayoutWrapper currentPageName="application-cgu"><DocumentLegal cle="cgu-application" /></LayoutWrapper>} />
      <Route path="/application/confidentialite" element={<LayoutWrapper currentPageName="application-confidentialite"><DocumentLegal cle="confidentialite-application" /></LayoutWrapper>} />
      <Route path="/accord-sous-traitance" element={<LayoutWrapper currentPageName="accord-sous-traitance"><DocumentLegal cle="accord-sous-traitance" /></LayoutWrapper>} />
      <Route path="/cgu" element={<Navigate to="/application/cgu" replace />} />
      {/* Vente d'abonnements : routes enregistrées seulement si BILLING_ACTIF */}
      {BILLING_ACTIF && (
        <>
          <Route path="/tarifs" element={<LayoutWrapper currentPageName="tarifs"><Tarifs /></LayoutWrapper>} />
          <Route path="/inscription" element={<LayoutWrapper currentPageName="inscription"><Inscription /></LayoutWrapper>} />
          <Route path="/abonnement/retour" element={<LayoutWrapper currentPageName="abonnement-retour"><AbonnementRetour /></LayoutWrapper>} />
        </>
      )}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <ConsentementCookies />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
