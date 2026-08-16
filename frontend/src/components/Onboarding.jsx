import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Activity, Droplet, Zap, CheckCircle2 } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Activity className="w-20 h-20 text-liv-500 mb-6" />,
      title: t('onboarding.step1_title'),
      desc: t('onboarding.step1_desc'),
    },
    {
      icon: <Droplet className="w-20 h-20 text-blue-500 mb-6" />,
      title: t('onboarding.step2_title'),
      desc: t('onboarding.step2_desc'),
    },
    {
      icon: <Zap className="w-20 h-20 text-amber-500 mb-6" />,
      title: t('onboarding.step3_title'),
      desc: t('onboarding.step3_desc'),
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('liv_onboarding_complete', 'true');
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-900 flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {steps[step].icon}
            <h2 className="text-2xl font-bold text-white mb-4 font-[Outfit]">
              {steps[step].title}
            </h2>
            <p className="text-gray-400 text-lg">
              {steps[step].desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pb-safe-offset-8 flex flex-col items-center">
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-liv-500' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 rounded-xl font-bold text-lg bg-liv-600 text-white shadow-lg shadow-liv-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {step === steps.length - 1 ? (
            <>
              {t('onboarding.getStarted')}
              <CheckCircle2 className="w-5 h-5" />
            </>
          ) : (
            t('onboarding.next')
          )}
        </button>
      </div>
    </div>
  );
}
