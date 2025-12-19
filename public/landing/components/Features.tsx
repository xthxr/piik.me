"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Palette,
  Link,
  Activity,
  Shield,
  Globe,
  QrCode,
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Analytics",
    description: "Watch clicks happen live with WebSocket-powered updates. Track device types, browsers, referrers, and geographic data with interactive 3D globe visualization.",
    gradient: "from-brand-purple/20 to-transparent",
    span: "md:col-span-2",
  },
  {
    icon: Users,
    title: "Personalized Bio Pages",
    description: "Create stunning bio pages at piik.me/username with drag-and-drop link ordering, animated backgrounds, and verified badges for early adopters.",
    gradient: "from-brand-blue/20 to-transparent",
    span: "md:col-span-1",
  },
  {
    icon: Link,
    title: "Custom Short Codes",
    description: "Choose your own vanity URLs with real-time availability checking. Generate memorable, brandable short links.",
    gradient: "from-brand-purple/20 to-transparent",
    span: "md:col-span-1",
  },
  {
    icon: QrCode,
    title: "Instant QR Codes",
    description: "One-click QR code generation with customizable downloads. Perfect for print materials, events, and offline marketing campaigns.",
    gradient: "from-brand-blue/20 to-transparent",
    span: "md:col-span-2",
  },
];

const additionalFeatures = [
  { icon: Globe, label: "3D Globe Tracking" },
  { icon: Activity, label: "UTM Parameters" },
  { icon: Shield, label: "Google OAuth" },
  { icon: Palette, label: "Glassmorphism UI" },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            Everything you need,
            <br />
            <span className="text-brand-purple">nothing you don&apos;t</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Powerful features designed for modern teams. Simple enough for individuals.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className={`${feature.span} glass rounded-3xl p-8 group hover:border-white/20 transition-all duration-300 relative overflow-hidden`}
            >
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="text-brand-purple" size={24} />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Mock Chart for Analytics Card */}
                {index === 0 && (
                  <div className="mt-6 h-32 flex items-end gap-2">
                    {[40, 60, 45, 80, 55, 90, 70, 85].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                        className="flex-1 bg-gradient-to-t from-brand-purple/50 to-brand-purple/20 rounded-t"
                      />
                    ))}
                  </div>
                )}

                {/* QR Code preview for QR Codes card */}
                {index === 3 && (
                  <div className="mt-6 flex justify-center">
                    <div className="glass rounded-lg p-4 w-24 h-24 flex items-center justify-center">
                      <div className="grid grid-cols-4 gap-1">
                        {[...Array(16)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 bg-white/80 rounded-sm"
                            style={{
                              opacity: Math.random() > 0.3 ? 1 : 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {additionalFeatures.map((item, index) => (
            <div
              key={index}
              className="glass rounded-2xl p-6 text-center hover:border-white/20 transition-all duration-300"
            >
              <item.icon className="mx-auto mb-3 text-brand-blue" size={24} />
              <div className="text-sm font-medium text-gray-300">{item.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
