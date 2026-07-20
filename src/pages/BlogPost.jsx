import React from "react";
import SEO from "@/components/SEO";
import { getBlogPosts } from "@/api/airtableService";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryLabels = {
  reglementation: "Reglementation",
  bonnes_pratiques: "Bonnes Pratiques",
  actualites: "Actualites",
  conseils: "Conseils"
};

export default function BlogPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPost', slug],
    queryFn: async () => {
      const allPosts = await getBlogPosts();
      return allPosts.filter(p => p.slug === slug && p.published);
    },
    enabled: !!slug,
  });

  const post = posts[0];

  const { data: relatedPosts = [] } = useQuery({
    queryKey: ['relatedPosts', post?.category],
    queryFn: async () => {
      const allPosts = await getBlogPosts();
      return allPosts
        .filter(p => p.category === post.category && p.slug !== slug && p.published)
        .slice(0, 3);
    },
    enabled: !!post?.category,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-faint">Chargement...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-ink mb-4">Article non trouve</h2>
          <Link to={createPageUrl("Blog")} className="link-underline">
            ← Retour au blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt}
        keywords={post.tags?.join(", ")}
        ogImage={post.featured_image}
        canonicalUrl={`https://restoclair.fr/BlogPost?slug=${post.slug}`}
        pageType="article"
        articleData={{
          publishedDate: post.created_date,
          modifiedDate: post.updated_date || post.created_date,
          category: categoryLabels[post.category] || post.category,
          tags: post.tags
        }}
        breadcrumbs={[
          { name: "Accueil", url: "https://restoclair.fr/" },
          { name: "Blog", url: "https://restoclair.fr/Blog" },
          { name: post.title, url: `https://restoclair.fr/BlogPost?slug=${post.slug}` }
        ]}
      />

      <article>
        {/* Header */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-[720px] mx-auto px-6">
            <Link to={createPageUrl("Blog")} className="link-underline text-sm mb-8 inline-block">
              ← Retour au blog
            </Link>
            <div className="flex items-center gap-4 text-faint text-sm mb-6">
              <time>{format(new Date(post.created_date), "d MMMM yyyy", { locale: fr })}</time>
              <span>·</span>
              <span>{post.reading_time || 5} min de lecture</span>
              {post.category && (
                <>
                  <span>·</span>
                  <span>{categoryLabels[post.category]}</span>
                </>
              )}
            </div>
            <h1 className="text-ink mb-6">{post.title}</h1>
            {post.excerpt && (
              <p className="text-muted text-lg leading-relaxed">{post.excerpt}</p>
            )}
          </div>
        </section>

        {/* Featured image */}
        {post.featured_image && (
          <figure className="max-w-[900px] mx-auto px-6 mb-12">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full aspect-[16/9] object-cover"
            />
          </figure>
        )}

        <hr className="rule" />

        {/* Content */}
        <section className="py-12 md:py-16">
          <div className="max-w-[720px] mx-auto px-6">
            <div className="prose-editorial">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="text-faint text-sm border border-border px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <hr className="rule" />

        {/* Related posts */}
        {relatedPosts.filter(p => p.id !== post.id).length > 0 && (
          <section className="py-12 md:py-16">
            <div className="max-w-[720px] mx-auto px-6">
              <h2 className="text-ink mb-8">Articles lies</h2>
              <div className="divide-y divide-border">
                {relatedPosts.filter(p => p.id !== post.id).slice(0, 3).map((related) => (
                  <article key={related.id} className="py-6">
                    <Link to={createPageUrl(`BlogPost?slug=${related.slug}`)} className="block group">
                      <time className="text-faint text-sm">
                        {format(new Date(related.created_date), "d MMMM yyyy", { locale: fr })}
                      </time>
                      <h3 className="font-serif text-xl text-ink group-hover:text-bottle transition-colors mt-1">
                        {related.title}
                      </h3>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-bottle py-16">
          <div className="max-w-[720px] mx-auto px-6 text-center">
            <h2 className="text-bottle-text mb-4">Besoin d'un accompagnement ?</h2>
            <p className="text-bottle-muted text-lg mb-8">
              Premier echange gratuit. Je vous dis ce que je peux faire pour vous.
            </p>
            <Link to={createPageUrl("Contact")} className="inline-block bg-paper text-ink px-8 py-4 font-medium text-[15px] hover:bg-white transition-colors">
              Prendre contact
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
