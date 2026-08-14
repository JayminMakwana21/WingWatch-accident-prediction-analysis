import { motion } from 'framer-motion';
import { BarChart3, Brain, Zap, Database, MapPin, TrendingUp, Shield, Activity } from 'lucide-react';

const features = [
  { icon: BarChart3, title: 'Dashboard Analytics', desc: 'Interactive visualizations including severity distribution, weather impact, vehicle analysis, and time-of-day patterns with real-time data updates.', color: 'text-chart-blue' },
  { icon: Brain, title: 'ML Severity Prediction', desc: 'Machine learning model predicts accident severity (Minor, Serious, Fatal) based on scenario inputs with confidence scoring.', color: 'text-chart-purple' },
  { icon: Zap, title: 'Physics Risk Engine', desc: 'Physics-based risk calculation using kinetic energy, reaction time, road friction, visibility, and crash force formulas.', color: 'text-chart-orange' },
  { icon: Database, title: 'Dataset Analysis', desc: 'Upload custom CSV datasets with drag-and-drop. Automatic parsing, validation, column statistics, and paginated preview.', color: 'text-chart-cyan' },
  { icon: MapPin, title: 'Hotspot Detection', desc: 'Cluster accident locations to identify high-risk zones. Visualized as scatter plots with red (high), yellow (medium), green (safe) zones.', color: 'text-chart-red' },
  { icon: TrendingUp, title: 'Trend Forecasting', desc: 'Analyze historical accident trends and generate future predictions using time-series analysis with monthly aggregation.', color: 'text-chart-green' },
  { icon: Shield, title: 'Safety Recommendations', desc: 'AI-powered safety suggestions generated from scenario analysis — covering speed, equipment, weather, and behavioral factors.', color: 'text-chart-yellow' },
  { icon: Activity, title: 'Risk Intelligence', desc: 'Detailed physics-based explanation of risk factors including formulas, real-time values, and scientific reasoning.', color: 'text-primary' },
];

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl gradient-blue flex items-center justify-center text-2xl font-bold mx-auto mb-4 text-background glow-blue">
          CL
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">CrashLens AI</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          A professional AI-powered accident analysis platform combining machine learning prediction,
          physics-based risk modeling, and advanced data analytics for comprehensive road safety insights.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {features.map((feat, i) => (
          <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={cardVariant}
            className="glass-card p-5 hover:scale-[1.02] transition-transform group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-accent transition-colors">
                <feat.icon className={`h-4.5 w-4.5 ${feat.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="glass-card p-6 text-center">
        <h2 className="text-sm font-semibold text-foreground mb-2">Tech Stack</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {['React', 'TypeScript', 'Recharts', 'Tailwind CSS', 'Framer Motion', 'Physics Engine', 'ML Prediction'].map(t => (
            <span key={t} className="px-3 py-1 rounded-full text-[11px] bg-secondary text-muted-foreground border border-border/50">{t}</span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Built with ❤️ for road safety analytics</p>
      </motion.div>
    </div>
  );
}
