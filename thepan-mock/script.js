'use strict';

document.documentElement.classList.add('js');

document.querySelectorAll('[data-year]').forEach(node => {
  node.textContent = new Date().getFullYear();
});

const heroSky = document.querySelector('[data-hero-stars]');

if (heroSky) {
  let seed = 73856093;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  const colors = ['#f5f0dc', '#f08bd1', '#8756df', '#29bfb5', '#edfa43'];
  const visitors = new Set([13, 41, 67]);

  for (let index = 0; index < 76; index += 1) {
    const star = document.createElement('i');
    const wanderer = index % 9 === 2 || index % 13 === 5;
    const visitor = visitors.has(index);
    const size = visitor ? 2.4 + random() * 1.3 : 1.2 + random() * 3.7;

    star.className = [
      'sky-star',
      index % 8 === 0 ? 'sky-star--cross' : '',
      wanderer ? 'sky-star--wanderer' : '',
      visitor ? 'sky-star--visitor' : ''
    ].filter(Boolean).join(' ');

    star.style.setProperty('--star-x', `${2 + random() * 96}%`);
    star.style.setProperty('--star-y', `${2 + random() * 94}%`);
    star.style.setProperty('--star-size', `${size.toFixed(2)}px`);
    star.style.setProperty('--star-color', colors[Math.floor(random() * colors.length)]);
    star.style.setProperty('--star-glow', `${3 + random() * 8}px`);
    star.style.setProperty('--star-delay', `${-(random() * 18).toFixed(2)}s`);
    star.style.setProperty('--star-speed', `${(visitor ? 17 + random() * 12 : wanderer ? 12 + random() * 10 : 4.5 + random() * 8).toFixed(2)}s`);
    star.style.setProperty('--tail-angle', `${-28 + random() * 56}deg`);
    star.style.setProperty('--x1', `${-35 + random() * 70}px`);
    star.style.setProperty('--y1', `${-15 + random() * 30}px`);
    star.style.setProperty('--x2', `${-70 + random() * 140}px`);
    star.style.setProperty('--y2', `${-28 + random() * 56}px`);
    star.style.setProperty('--x3', `${-105 + random() * 210}px`);
    star.style.setProperty('--y3', `${-38 + random() * 76}px`);
    star.style.setProperty('--x4', `${-80 + random() * 160}px`);
    star.style.setProperty('--y4', `${-42 + random() * 84}px`);
    star.style.setProperty('--x5', `${-52 + random() * 104}px`);
    star.style.setProperty('--y5', `${-24 + random() * 48}px`);
    heroSky.append(star);
  }
}

document.querySelectorAll('[data-embed-group]').forEach(group => {
  const frame = group.querySelector('[data-player-frame]');
  const externalLink = group.querySelector('[data-player-external-link]');
  const buttons = [...group.querySelectorAll('[data-player-src]')];

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const source = button.dataset.playerSrc;
      if (!frame || !source) return;

      const isYouTube = source.includes('youtube-nocookie.com');
      frame.src = isYouTube ? `${source}&autoplay=1` : source;
      frame.title = button.dataset.playerTitle || 'THE PAN media player';

      if (externalLink && button.dataset.playerExternal) {
        externalLink.href = button.dataset.playerExternal;
      }

      buttons.forEach(choice => {
        const active = choice === button;
        choice.classList.toggle('is-active', active);
        choice.setAttribute('aria-pressed', String(active));
      });
    });
  });
});

const reveals = [...document.querySelectorAll('.reveal')];

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  reveals.forEach(section => observer.observe(section));
} else {
  reveals.forEach(section => section.classList.add('is-visible'));
}
