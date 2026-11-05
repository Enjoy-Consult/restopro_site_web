import About from './pages/About';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Services from './pages/Services';
import Sitemap from './pages/Sitemap';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "Blog": Blog,
    "BlogPost": BlogPost,
    "Contact": Contact,
    "Home": Home,
    "Services": Services,
    "Sitemap": Sitemap,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};