import React from 'react';
import HomepageHeader from '@/components/homepage/HomepageHeader';
import HeroScreen from '@/components/homepage/screens/HeroScreen';
import QuantumSphereScreen from '@/components/homepage/screens/QuantumSphereScreen';
import WhyQvantaScreen from '@/components/homepage/screens/WhyQvantaScreen';
import CircuitBlochScreen from '@/components/homepage/screens/CircuitBlochScreen';
import TutorEditorScreen from '@/components/homepage/screens/TutorEditorScreen';
import PersonalTutorScreen from '@/components/homepage/screens/PersonalTutorScreen';
import { useHomepageGsap } from '@/components/homepage/useHomepageGsap';

const Homepage: React.FC = () => {
  useHomepageGsap();

  return (
    <div className="relative min-h-screen w-full bg-bg-1 text-ink font-body selection:bg-violet/40">
      
      <HomepageHeader />
      <main className="flex flex-col">
        
        <HeroScreen />
        <QuantumSphereScreen />
        <WhyQvantaScreen />
        <CircuitBlochScreen />
        <TutorEditorScreen />
        <PersonalTutorScreen />
      </main>
    </div>
  );
};

export default Homepage;
