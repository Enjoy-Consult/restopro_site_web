import React from "react";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { getBlogPosts } from "@/api/airtableService";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReactMarkdown from "react-markdown";
import { 
  Calendar, Clock, ArrowLeft, Share2, Tag,
  Facebook, Twitter, Linkedin
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryColors = {
  reglementation: "bg-red-100 text-red-700",
  bonnes_pratiques: "bg-blue-100 text-blue-700",
  actualites: "bg-purple-100 text-purple-700",
  conseils: "bg-emerald-100 text-emerald-700"
};

const categoryLabels = {
  reglementation: "Réglementation",
  bonnes_pratiques: "Bonnes Pratiques",
  actualites: "Actualités",
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

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = post?.title;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };
    
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Article non trouvé</h2>
          <Link to={createPageUrl("Blog")}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Retour au blog
            </Button>
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
        canonicalUrl={`${window.location.origin}${window.location.pathname}?slug=${post.slug}`}
      />
      
      <article className="min-h-screen bg-slate-50">
        {/* Hero */}
        <section className="relative h-[60vh] min-h-[500px] overflow-hidden">
          <img 
            src={post.featured_image || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1920&h=1080&fit=crop"}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
          
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto px-6 lg:px-12 pb-16">
              <Link to={createPageUrl("Blog")}>
                <Button variant="ghost" className="text-white hover:bg-white/10 mb-6">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Retour au blog
                </Button>
              </Link>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-4xl"
              >
                <Badge className={`${categoryColors[post.category]} border-0 mb-4`}>
                  {categoryLabels[post.category]}
                </Badge>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                  {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-6 text-white/90">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {format(new Date(post.created_date), "d MMMM yyyy", { locale: fr })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {post.reading_time || 5} min de lecture
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-6 lg:px-12 py-16">
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-8"
            >
              <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
                {post.excerpt && (
                  <p className="text-xl text-slate-600 leading-relaxed mb-8 pb-8 border-b border-slate-200">
                    {post.excerpt}
                  </p>
                )}
                
                <div className="prose prose-lg prose-slate max-w-none 
                  prose-headings:font-bold prose-headings:text-slate-900
                  prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                  prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-6
                  prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-slate-900 prose-strong:font-semibold
                  prose-ul:my-6 prose-li:my-2
                  prose-img:rounded-xl prose-img:shadow-md"
                >
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-slate-200">
                    <div className="flex flex-wrap items-center gap-3">
                      <Tag className="w-5 h-5 text-slate-400" />
                      {post.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-4 space-y-8"
            >
              {/* Share */}
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-600" />
                  Partager l'article
                </h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleShare('facebook')}
                  >
                    <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                    Partager sur Facebook
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleShare('twitter')}
                  >
                    <Twitter className="w-4 h-4 mr-2 text-sky-500" />
                    Partager sur Twitter
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleShare('linkedin')}
                  >
                    <Linkedin className="w-4 h-4 mr-2 text-blue-700" />
                    Partager sur LinkedIn
                  </Button>
                </div>
              </div>

              {/* Related Posts */}
              {relatedPosts.filter(p => p.id !== post.id).slice(0, 2).length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6">Articles similaires</h3>
                  <div className="space-y-6">
                    {relatedPosts.filter(p => p.id !== post.id).slice(0, 2).map((relatedPost) => (
                      <Link 
                        key={relatedPost.id} 
                        to={createPageUrl(`BlogPost?slug=${relatedPost.slug}`)}
                        className="block group"
                      >
                        <div className="relative h-32 rounded-lg overflow-hidden mb-3">
                          <img 
                            src={relatedPost.featured_image || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"}
                            alt={relatedPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <h4 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2">
                          {relatedPost.title}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {format(new Date(relatedPost.created_date), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.aside>
          </div>
        </div>

        {/* CTA Section */}
        <section className="bg-emerald-600 py-16">
          <div className="container mx-auto px-6 lg:px-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Besoin d'un accompagnement ?
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
              Nos experts sont à votre disposition pour vous conseiller et vous accompagner.
            </p>
            <Link to={createPageUrl("Contact")}>
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
                Nous contacter
              </Button>
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}