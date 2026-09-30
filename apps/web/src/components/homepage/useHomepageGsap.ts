import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from '@/hooks';

gsap.registerPlugin(ScrollTrigger);

export function useHomepageGsap(): void {
  const reduced = usePrefersReducedMotion();
  const triggeredCleanup = useRef<() => void | undefined>();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const ctx = gsap.context(() => {
      const hero = document.querySelector('#hero .hp-hero-content');
      if (hero && !reduced) {
        const headline = hero.querySelector('.hp-headline');
        const sub = hero.querySelector('.hp-sub');
        const ctas = hero.querySelectorAll('.hp-cta');
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
        tl.from(headline, { y: 22, opacity: 0, duration: 0.7 });
        tl.from(sub, { y: 14, opacity: 0, duration: 0.5 }, '-=0.45');
        tl.from(ctas, { y: 10, opacity: 0, stagger: 0.08, duration: 0.45 }, '-=0.25');
      }

      if (!reduced) {
        gsap.utils.toArray<HTMLElement>('#why .hp-feature-item').forEach((item, i) => {
          gsap.fromTo(
            item,
            { opacity: 0, x: -16 },
            {
              opacity: 1,
              x: 0,
              duration: 0.55,
              ease: 'power2.out',
              delay: i * 0.06,
              scrollTrigger: {
                trigger: item,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
              }
            }
          );
          const dataIdx = i;
          const orb = document.querySelector('#why .hp-orb-shell') as HTMLElement | null;
          if (orb) {
            ScrollTrigger.create({
              trigger: item,
              start: 'top 70%',
              end: 'bottom 40%',
              toggleClass: { targets: orb, className: `hp-orb-state-${dataIdx}` }
            });
          }
          const line = item.querySelector<SVGElement>('.hp-conn-line path');
          if (line) {
            gsap.fromTo(
              line,
              { strokeDashoffset: 9999 },
              {
                strokeDashoffset: 0,
                duration: 0.7,
                ease: 'power2.out',
                delay: i * 0.06,
                scrollTrigger: {
                  trigger: item,
                  start: 'top 80%',
                  toggleActions: 'play none none reverse'
                }
              }
            );
          }
        });
      }

      const ctaFinal = document.querySelector('#personal-tutor .hp-final-cta');
      if (ctaFinal && !reduced) {
        gsap.fromTo(
          ctaFinal,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: ctaFinal,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );
      }
    });

    triggeredCleanup.current = () => ctx.revert();

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [reduced]);
}
