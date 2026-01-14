import React, { useState } from "react";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Calendar, Clock, ArrowRight, Search, BookOpen,
  Tag, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categories = [
  { value: "all", label: "Tous", labelFull: "Tous les articles" },
  { value: "reglementation", label: "Réglem.", labelFull: "Réglementation" },
  { value: "bonnes_pratiques", label: "Pratiques", labelFull: "Bonnes Pratiques" },
  { value: "actualites", label: "Actus", labelFull: "Actualités" },
  { value: "conseils", label: "Conseils", labelFull: "Conseils" }
];

const categoryColors = {
  reglementation: "bg-red-100 text-red-700",
  bonnes_pratiques: "bg-blue-100 text-blue-700",
  actualites: "bg-purple-100 text-purple-700",
  conseils: "bg-emerald-100 text-emerald-700"
};

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => base44.entities.BlogPost.filter({ published: true }, '-created_date'),
    initialData: [],
  });

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = filteredPosts[0];
  const regularPosts = filteredPosts.slice(1);

  return (
    <>
      <SEO 
        title="Blog - Conseils Hygiène & Actualités Restauration"
        description="Retrouvez nos articles sur la réglementation sanitaire, les bonnes pratiques HACCP, l'actualité DDPP et nos conseils d'expert pour gérer l'hygiène de votre restaurant."
        keywords="blog hygiène alimentaire, actualités DDPP, réglementation restaurant, conseils HACCP, bonnes pratiques cuisine, sécurité alimentaire, normes sanitaires"
        canonicalUrl={`${window.location.origin}${window.location.pathname}`}
      />
      
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <section className="bg-white border-b border-slate-200 py-16">
          <div className="container mx-auto px-6 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Blog</span>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6 leading-tight">
                Conseils & Actualités
              </h1>
              <p className="text-xl md:text-lg text-slate-600 leading-relaxed">
                Restez informé des dernières évolutions réglementaires et découvrez 
                nos conseils d'expert pour gérer l'hygiène de votre restaurant.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-6 lg:px-12 py-12">
          {/* Search & Filters */}
          <div className="mb-12 space-y-6">
            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-6 text-base"
              />
            </div>

            {/* Category Filters */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <TabsList className="w-full max-w-3xl mx-auto flex flex-wrap justify-center gap-2 h-auto bg-white border border-slate-200 rounded-xl p-2">
                {categories.map((category) => (
                  <TabsTrigger 
                    key={category.value} 
                    value={category.value}
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white py-2 px-3 rounded-lg text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span className="sm:hidden">{category.label}</span>
                    <span className="hidden sm:inline">{category.labelFull}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun article trouvé</h3>
              <p className="text-slate-600">
                {searchTerm ? "Essayez avec d'autres mots-clés" : "Les articles arrivent bientôt !"}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Featured Post */}
              {featuredPost && (
                <motion.article
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="relative h-80 md:h-full">
                      <img 
                        src={featuredPost.featured_image || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop"}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-6 left-6">
                        <Badge className={`${categoryColors[featuredPost.category]} border-0 text-sm px-4 py-1.5`}>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Article à la une
                        </Badge>
                      </div>
                    </div>
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <Badge className={`${categoryColors[featuredPost.category]} border-0 w-fit mb-4`}>
                        {categories.find(c => c.value === featuredPost.category)?.labelFull}
                      </Badge>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-tight">
                        {featuredPost.title}
                      </h2>
                      <p className="text-slate-600 text-xl md:text-lg mb-6 line-clamp-3 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-slate-500 mb-6">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(featuredPost.created_date), "d MMMM yyyy", { locale: fr })}
                        </span>
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {featuredPost.reading_time || 5} min
                        </span>
                      </div>
                      <Link to={createPageUrl(`BlogPost?slug=${featuredPost.slug}`)}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-fit py-6 text-lg md:text-base">
                          Lire l'article
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* Regular Posts Grid */}
              {regularPosts.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {regularPosts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group"
                    >
                      <div className="relative h-56 overflow-hidden">
                        <img 
                          src={post.featured_image || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop"}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge className={`${categoryColors[post.category]} border-0 absolute top-4 left-4`}>
                          {categories.find(c => c.value === post.category)?.labelFull}
                        </Badge>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl md:text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-tight">
                          {post.title}
                        </h3>
                        <p className="text-slate-600 mb-4 line-clamp-3 text-lg md:text-base leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(post.created_date), "d MMM yyyy", { locale: fr })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {post.reading_time || 5} min
                          </span>
                        </div>
                        <Link to={createPageUrl(`BlogPost?slug=${post.slug}`)}>
                          <Button variant="ghost" className="p-0 h-auto text-emerald-600 hover:text-emerald-700 hover:bg-transparent font-semibold">
                            Lire la suite
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}