import React from 'react';

const HomepageSceneLighting: React.FC = () => {
  return (
    <>
      <color attach="background" args={['#06050f']} />
      <fog attach="fog" args={['#06050f', 9, 30]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#8b6bff', '#34e0ff', 0.18]} />
      <directionalLight position={[4, 6, 5]} intensity={0.55} />
      <directionalLight position={[-5, 2, -3]} intensity={0.12} color="#8b6bff" />
    </>
  );
};

export default HomepageSceneLighting;
