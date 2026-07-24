import React, { useState } from "react";
import SEO from "@/components/SEO";
import { getBlogPosts } from "@/api/airtableService";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categories = [
  { value: "all", label: "Tous" },
  { value: "reglementation", label: "Réglementation" },
  { value: "bonnes_pratiques", label: "Bonnes pratiques" },
  { value: "actualites", label: "Actualités" },
  { value: "conseils", label: "Conseils" }
];

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: async () => {
      const allPosts = await getBlogPosts();
      return allPosts.filter(post => post.published);
    },
  });

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <SEO
        title="Blog — RestOclair | Hygiène alimentaire et réglementation"
        description="Articles sur la réglementation sanitaire, les bonnes pratiques HACCP et l'actualité DDPP pour les professionnels."
        keywords="blog hygiène alimentaire, actualités DDPP, réglementation établissement, conseils HACCP"
        canonicalUrl={`${window.location.origin}/Blog`}
      />
      <div>
        {/* Header */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-[600px]">
              <h1 className="text-ink mb-6">Articles.</h1>
              <p className="text-muted text-lg leading-relaxed">
                Réglementation, retours d'expérience, conseils pratiques —
                ce que nous constatons sur le terrain et ce que ça implique pour vous.
              </p>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Filters */}
        <section className="py-8">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-border bg-paper px-4 py-2.5 text-ink text-[15px] w-full sm:w-64 focus:outline-none focus:border-bottle"
              />
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`text-sm px-3 py-1.5 transition-colors ${
                      activeCategory === cat.value
                        ? "bg-bottle text-bottle-text"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* Posts list */}
        <section className="py-12">
          <div className="max-w-[1200px] mx-auto px-6">
            {isLoading ? (
              <p className="text-faint py-12">Chargement...</p>
            ) : filteredPosts.length === 0 ? (
              <p className="text-muted py-12">
                {searchTerm ? "Aucun article ne correspond à votre recherche." : "Les articles arrivent bientôt."}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {filteredPosts.map((post) => (
                  <article key={post.id} className="py-8">
                    <Link to={createPageUrl(`BlogPost?slug=${post.slug}`)} className="block group">
                      <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8">
                        <time className="text-faint text-sm shrink-0 md:w-32">
                          {format(new Date(post.created_date), "d MMMM yyyy", { locale: fr })}
                        </time>
                        <div className="flex-1">
                          <h2 className="font-serif text-[28px] font-medium text-ink group-hover:text-bottle transition-colors leading-tight mb-2">
                            {post.title}
                          </h2>
                          {post.excerpt && (
                            <p className="text-muted line-clamp-2 leading-relaxed">{post.excerpt}</p>
                          )}
                        </div>
                        <span className="text-faint text-sm shrink-0 hidden md:block">
                          {post.reading_time || 5} min
                        </span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
