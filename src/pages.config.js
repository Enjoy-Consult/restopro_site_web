import Accompagnement from './pages/Accompagnement';
import Application from './pages/Application';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Contact from './pages/Contact';
import Entreprise from './pages/Entreprise';
import Home from './pages/Home';
import OuvrirRestaurant from './pages/OuvrirRestaurant';
import Reseaux from './pages/Reseaux';
import Sitemap from './pages/Sitemap';
import __Layout from './Layout.jsx';


// La clé est le chemin de la page (/entreprise, /accompagnement…). Les anciennes adresses /About et /Services
// redirigent vers les nouvelles (App.jsx).
export const PAGES = {
    "accompagnement": Accompagnement,
    "application": Application,
    "Blog": Blog,
    "BlogPost": BlogPost,
    "Contact": Contact,
    "entreprise": Entreprise,
    "Home": Home,
    "ouvrir-un-restaurant": OuvrirRestaurant,
    "reseaux": Reseaux,
    "Sitemap": Sitemap,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
