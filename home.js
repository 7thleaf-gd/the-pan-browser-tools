(() => {
  const root = document.documentElement;
  const body = document.body;
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const progress = document.querySelector('.progress span');
  const heroLines = [...document.querySelectorAll('.hero-line')];
  const orbs = [...document.querySelectorAll('[data-float]')];
  const manifesto = document.querySelector('.manifesto');
  const manifestoWord = document.querySelector('.manifesto-word');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
  let ringX = mouseX, ringY = mouseY;

  window.addEventListener('pointermove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px,${mouseY}px)`;
  }, {passive:true});

  function cursorLoop(){
    ringX += (mouseX-ringX)*.14;
    ringY += (mouseY-ringY)*.14;
    ring.style.transform = `translate(${ringX}px,${ringY}px)`;
    requestAnimationFrame(cursorLoop);
  }
  cursorLoop();

  document.querySelectorAll('[data-cursor]').forEach(el => {
    el.addEventListener('mouseenter', () => { ring.classList.add('active'); ring.dataset.label = el.dataset.cursor; });
    el.addEventListener('mouseleave', () => { ring.classList.remove('active'); ring.dataset.label = ''; });
  });

  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('pointermove', e => {
      if(reduceMotion) return;
      const r=el.getBoundingClientRect();
      const x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
      el.style.transform=`translate(${x*.16}px,${y*.16}px)`;
    });
    el.addEventListener('pointerleave',()=> el.style.transform='');
  });

  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      if(reduceMotion || innerWidth < 900) return;
      const r=card.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(1200px) rotateX(${py*-4}deg) rotateY(${px*5}deg)`;
    });
    card.addEventListener('pointerleave',()=> card.style.transform='');
  });

  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
  }), {threshold:.12});
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  function onScroll(){
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${max ? scrollY/max*100 : 0}%`;
    if(!reduceMotion){
      heroLines.forEach((line,i) => {
        const depth = Number(line.dataset.depth || 1);
        line.style.transform = `translate3d(${(mouseX-innerWidth/2)*.006*depth}px,${scrollY*.04*(i+1)*depth}px,0)`;
      });
      if(manifesto){
        const r = manifesto.getBoundingClientRect();
        const total = manifesto.offsetHeight-innerHeight;
        const p = Math.min(1,Math.max(0,-r.top/total));
        root.style.setProperty('--shift', `${-8+p*16}deg`);
        root.style.setProperty('--scale', `${.65+p*.62}`);
        manifestoWord.style.filter=`blur(${Math.abs(.5-p)*2}px)`;
      }
    }
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  addEventListener('pointermove', () => {
    if(reduceMotion) return;
    orbs.forEach((o,i) => {
      const n=Number(o.dataset.float||1);
      o.style.transform=`translate(${(mouseX-innerWidth/2)*.008*n}px,${(mouseY-innerHeight/2)*.006*n}px) rotate(${(i-1)*7}deg)`;
    });
  }, {passive:true});

  // Ambient signal field canvas
  const canvas = document.getElementById('signal-field');
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(2, devicePixelRatio || 1), particles=[];
  function resize(){
    canvas.width=innerWidth*dpr; canvas.height=innerHeight*dpr; canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    particles=Array.from({length:Math.min(90,Math.floor(innerWidth/14))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.1+.3}));
  }
  resize(); addEventListener('resize',resize);
  function draw(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    ctx.fillStyle='rgba(255,255,255,.7)';
    for(const p of particles){
      const dx=mouseX-p.x,dy=mouseY-p.y,dist=Math.hypot(dx,dy)||1;
      if(dist<130){p.vx-=dx/dist*.004;p.vy-=dy/dist*.004}
      p.x+=p.vx;p.y+=p.vy;p.vx*=.995;p.vy*=.995;
      if(p.x<0)p.x=innerWidth;if(p.x>innerWidth)p.x=0;if(p.y<0)p.y=innerHeight;if(p.y>innerHeight)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  if(!reduceMotion) draw();

  const randomize=document.getElementById('randomize');
  randomize.addEventListener('click',()=>{
    const acids=['#d7ff28','#ff4f2e','#74f0ff','#f0a3ff','#fff35c'];
    root.style.setProperty('--acid', acids[Math.floor(Math.random()*acids.length)]);
    body.animate([{transform:'translateX(0)'},{transform:'translateX(-8px)'},{transform:'translateX(9px)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:260});
  });

  let typed='';
  addEventListener('keydown',e=>{
    typed=(typed+e.key.toUpperCase()).slice(-3);
    if(typed==='PAN'){
      body.classList.toggle('secret-mode');
      typed='';
      document.querySelector('.hero-note').textContent = body.classList.contains('secret-mode') ? 'SIGNAL FOUND. DO NOT LOOK DIRECTLY AT IT.' : 'NOT AN APP STORE. MORE LIKE A DRAWER FULL OF STRANGE MACHINES.';
    }
  });
})();