import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Landing from '@/components/Landing';

type LandingPhase =
  | 'init'
  | 'text_particles'
  | 'text_break'
  | 'particles_to_logo'
  | 'logo_done'
  | 'qanta_in'
  | 'tagline'
  | 'interaction';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<LandingPhase>('init');

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setPhase('text_particles'), 100));
    timers.push(setTimeout(() => setPhase('text_break'), 2600));
    timers.push(setTimeout(() => setPhase('particles_to_logo'), 3700));
    timers.push(setTimeout(() => setPhase('logo_done'), 5600));
    timers.push(setTimeout(() => setPhase('qanta_in'), 5900));
    timers.push(setTimeout(() => setPhase('tagline'), 7100));
    timers.push(setTimeout(() => setPhase('interaction'), 8200));

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleStart = () => {
    navigate('/home');
  };

  return <Landing phase={phase} onStart={handleStart} />;
};

export default LandingPage;
