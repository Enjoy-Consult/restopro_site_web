import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function TestimonialsSection() {
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAirtableTestimonials');
      return response.data.filter(t => t.is_featured).slice(0, 6);
    },
    initialData: [],
  });

  if (isLoading) {
    return (
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center">
            <p className="text-slate-500">Chargement des témoignages...</p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Témoignages</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-4 mb-6 leading-tight">
            Ils nous font confiance
          </h2>
          <p className="text-xl md:text-lg text-slate-600 leading-relaxed">
            Découvrez ce que nos clients restaurateurs disent de notre accompagnement.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-shadow ${
                index === 0 ? 'lg:col-span-2' : ''
              }`}
            >
              {/* Quote Icon */}
              <Quote className="w-10 h-10 text-emerald-100 mb-4" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-slate-700 leading-relaxed mb-6 text-lg md:text-base">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 md:w-12 md:h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg md:text-lg">
                    {testimonial.author_name[0]}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-lg md:text-base">{testimonial.author_name}</p>
                  <p className="text-base md:text-sm text-slate-500">
                    {testimonial.restaurant_name} • {testimonial.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}