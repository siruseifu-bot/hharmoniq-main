import { motion } from 'framer-motion';
import { Music, Star, Headphones, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import harmoniqLogo from '@/assets/logo.png';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden" dir="rtl">
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <motion.img
              src={harmoniqLogo}
              alt="Harmoniq"
              className="w-10 h-10"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="font-display text-2xl font-bold text-gradient-pink">Harmoniq</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/explore')} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              اكتشف الفنانين
            </button>
            <Button onClick={() => navigate('/auth')} className="bg-gradient-pink text-primary-foreground hover:opacity-90 font-semibold">
              ابدأ الآن
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(345,100%,59%,0.08)_0%,_transparent_70%)]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">المنصة الأولى لتوزيع الموسيقى العربية</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-foreground">أطلق موسيقاك</span>
              <br />
              <span className="text-gradient-pink">للعالم بأكمله</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10">
              نوزّع موسيقاك على جميع المنصات العالمية ونساعدك في تطوير مسيرتك الفنية
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-gradient-pink text-primary-foreground hover:opacity-90 text-lg px-8 py-6 font-semibold glow-pink"
              >
                انضم كفنان <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 text-gradient-pink">خدماتنا</h2>
            <p className="text-muted-foreground text-lg">كل ما تحتاجه لإطلاق مسيرتك الموسيقية</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:glow-pink transition-all">
                <Music className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">توزيع الموسيقى</h3>
              <p className="text-muted-foreground leading-relaxed">
                نوصل موسيقاك لأكبر المنصات مثل Spotify, Apple Music, Anghami وغيرها. رفع سهل وسريع مع متابعة حالة كل إصدار.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:glow-pink transition-all">
                <Headphones className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">تطوير الفنانين</h3>
              <p className="text-muted-foreground leading-relaxed">
                نقدم الدعم الكامل للفنانين من إنتاج وتوزيع وتسويق. نساعدك تبني جمهورك وتوصل لمستوى جديد.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={harmoniqLogo} alt="Harmoniq" className="w-8 h-8" />
            <span className="font-display text-xl font-bold text-gradient-pink">Harmoniq</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 Harmoniq. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;