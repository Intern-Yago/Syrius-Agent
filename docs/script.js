// Inicialização das Animações GSAP e Interatividades
document.addEventListener("DOMContentLoaded", () => {
  // 1. Registro do ScrollTrigger
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Hero Animations
    const tl = gsap.timeline();
    tl.from(".hero-pill", { y: -20, opacity: 0, duration: 0.6, ease: "power3.out" })
      .from(".hero-title", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.3")
      .from(".hero-desc", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
      .from(".hero-cta-group", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
      .from(".hero-mockup-wrapper", { y: 60, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.3");

    // Pipeline Cards Stagger
    gsap.from(".pipeline-card", {
      scrollTrigger: {
        trigger: ".pipeline-grid",
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
    });

    // Bento Grid Animation
    gsap.from(".bento-card", {
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 80%",
      },
      y: 30,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: "power2.out",
    });
  }

  // 2. Sistema de Abas da Demonstração Real
  const tabBtns = document.querySelectorAll(".demo-tab-btn");
  const tabContents = document.querySelectorAll(".demo-tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });

  // 3. Carrossel de Slides Interativo
  const slidesData = [
    {
      num: "01/06",
      tag: "HOOK & IMPACTO",
      headline: "Imagens Docker gigantescas custam dinheiro real.",
      body: "Você sabia que um Dockerfile mal otimizado pode inflar imagens em até 1.4 GB e triplicar o tempo do seu deploy no CI/CD?",
    },
    {
      num: "02/06",
      tag: "O PROBLEMA",
      headline: "O erro do Node.js puro em containers de produção.",
      body: "Usar node:latest inclui compiladores, documentações e ferramentas desnecessárias que aumentam a superfície de ataque e o cold start.",
    },
    {
      num: "03/06",
      tag: "MULTI-STAGE BUILDS",
      headline: "Dividir para conquistar: Build vs Runtime.",
      body: "Compile seu TypeScript em um estágio intermediário com todas as devDependencies e copie apenas os artefatos finais para a imagem de execução.",
    },
    {
      num: "04/06",
      tag: "BASE SLIM & DISTROLESS",
      headline: "node:alpine ou Distroless para segurança máxima.",
      body: "Trocando a imagem base para node:20-alpine, o tamanho cai imediatamente de 1.1 GB para 160 MB sem quebrar nenhuma dependência.",
    },
    {
      num: "05/06",
      tag: "DOCKERIGNORE",
      headline: "Nunca envie o node_modules local no COPY . .",
      body: "Sempre adicione .git, .env, coverage e node_modules ao seu .dockerignore para garantir que o cache de camadas funcione perfeitamente.",
    },
    {
      num: "06/06",
      tag: "CHECKLIST & SALVAMENTO",
      headline: "De 1.2 GB para 85 MB: O resultado final.",
      body: "Economia de 90% em storage e deploy em segundos. Salve este carrossel para consultar na hora de otimizar o seu próximo serviço!",
    },
  ];

  let currentSlideIdx = 0;
  const slideNumEl = document.getElementById("slide-num");
  const slideTagEl = document.getElementById("slide-tag");
  const slideHeadlineEl = document.getElementById("slide-headline");
  const slideBodyEl = document.getElementById("slide-body");
  const prevBtn = document.getElementById("slide-prev");
  const nextBtn = document.getElementById("slide-next");

  function updateSlide(idx) {
    if (!slideHeadlineEl) return;
    const data = slidesData[idx];
    slideNumEl.textContent = data.num;
    slideTagEl.textContent = data.tag;
    slideHeadlineEl.textContent = data.headline;
    slideBodyEl.textContent = data.body;

    if (window.gsap) {
      gsap.fromTo(
        "#slide-card",
        { opacity: 0.5, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      currentSlideIdx = (currentSlideIdx - 1 + slidesData.length) % slidesData.length;
      updateSlide(currentSlideIdx);
    });

    nextBtn.addEventListener("click", () => {
      currentSlideIdx = (currentSlideIdx + 1) % slidesData.length;
      updateSlide(currentSlideIdx);
    });
  }

  // 4. Calculadora de Tempo Economizado
  const postsInput = document.getElementById("posts-per-week");
  const hoursSavedEl = document.getElementById("hours-saved");
  const costSavedEl = document.getElementById("cost-saved");

  function calculateROI() {
    if (!postsInput || !hoursSavedEl) return;
    const posts = parseInt(postsInput.value, 10) || 5;
    // Média de 2.5 horas por post (pesquisa, redação, design, agendamento)
    const hours = posts * 2.5;
    // Custo estimado de R$ 60/hora de profissional técnico
    const monthlyCost = hours * 4 * 60;

    hoursSavedEl.textContent = `${hours}h / semana`;
    if (costSavedEl) {
      costSavedEl.textContent = `R$ ${monthlyCost.toLocaleString("pt-BR")} / mês`;
    }
  }

  if (postsInput) {
    postsInput.addEventListener("input", calculateROI);
    calculateROI();
  }
});
