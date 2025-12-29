import Home from './pages/Home';
import Services from './pages/Services';
import Contact from './pages/Contact';
import About from './pages/About';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Services": Services,
    "Contact": Contact,
    "About": About,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};