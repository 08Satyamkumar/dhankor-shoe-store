
(function () {
  "use strict";

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Page ready: smooth shell reveal */
  function initPageTransition() {
    if (prefersReducedMotion) {
      document.body.classList.add("is-ready");
      return;
    }
    requestAnimationFrame(() => {
      document.body.classList.add("is-ready");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageTransition);
  } else {
    initPageTransition();
  }

  /* Sticky navbar */
  const header = document.querySelector(".site-header");
  const scrollThreshold = 12;

  function updateHeaderScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > scrollThreshold);
  }

  window.addEventListener("scroll", updateHeaderScroll, { passive: true });
  updateHeaderScroll();

  /* Mobile menu */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  if (navToggle && header) {
    navToggle.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    mainNav?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  /* Hero: 3D tilt + parallax (Nike-style depth) */
  const hero = document.querySelector(".hero");
  const shoeStage = document.getElementById("shoeStage");
  const shoeCard = document.getElementById("shoeCard");
  const heroParallaxText = document.getElementById("heroParallaxText");
  const heroParallaxGlow = document.getElementById("heroParallaxGlow");
  const heroParallaxRing = document.getElementById("heroParallaxRing");
  const heroParallaxShadow = document.getElementById("heroParallaxShadow");

  let tiltRx = 0;
  let tiltRy = 0;
  let targetRx = 0;
  let tiltRyTarget = 0;
  let rafId = 0;

  function applyHeroParallax(e) {
    if (!hero || !shoeStage) return;
    const hRect = hero.getBoundingClientRect();
    const hx = (e.clientX - hRect.left) / hRect.width - 0.5;
    const hy = (e.clientY - hRect.top) / hRect.height - 0.5;

    if (heroParallaxText) {
      heroParallaxText.style.transform = `translate3d(${hx * -16}px, ${hy * -10}px, 0)`;
    }

    const sRect = shoeStage.getBoundingClientRect();
    const px = clamp(((e.clientX - sRect.left) / sRect.width) * 2 - 1, -1, 1);
    const py = clamp(((e.clientY - sRect.top) / sRect.height) * 2 - 1, -1, 1);

    targetRx = py * -16;
    tiltRyTarget = px * 18;

    if (heroParallaxGlow) {
      heroParallaxGlow.style.transform = `translate3d(${px * 18}px, ${py * 14}px, 0)`;
    }
    if (heroParallaxRing) {
      heroParallaxRing.style.transform = `translate3d(${px * 10}px, ${py * 8}px, 0) scale(1.02)`;
    }
    if (heroParallaxShadow) {
      heroParallaxShadow.style.transform = `translate3d(${px * 12}px, 0, 0) scaleX(${1 + Math.abs(px) * 0.08})`;
    }

    if (!prefersReducedMotion && shoeCard) {
      if (!rafId) rafId = requestAnimationFrame(smoothTilt);
    } else if (shoeCard) {
      shoeCard.style.transform = `rotateX(${targetRx}deg) rotateY(${tiltRyTarget}deg) scale3d(1.03, 1.03, 1.03)`;
    }
  }

  function smoothTilt() {
    if (!shoeCard) return;
    const k = 0.14;
    tiltRx += (targetRx - tiltRx) * k;
    tiltRy += (tiltRyTarget - tiltRy) * k;
    shoeCard.style.transform = `rotateX(${tiltRx}deg) rotateY(${tiltRy}deg) scale3d(1.03, 1.03, 1.03)`;
    if (Math.abs(targetRx - tiltRx) > 0.05 || Math.abs(tiltRyTarget - tiltRy) > 0.05) {
      rafId = requestAnimationFrame(smoothTilt);
    } else {
      rafId = 0;
    }
  }

  function resetHeroMotion() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    targetRx = 0;
    tiltRyTarget = 0;
    tiltRx = 0;
    tiltRy = 0;
    if (shoeCard) {
      shoeCard.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    }
    if (heroParallaxText) heroParallaxText.style.transform = "";
    if (heroParallaxGlow) heroParallaxGlow.style.transform = "";
    if (heroParallaxRing) heroParallaxRing.style.transform = "";
    if (heroParallaxShadow) heroParallaxShadow.style.transform = "";
  }

  if (hero && shoeStage && shoeCard && !prefersReducedMotion) {
    hero.addEventListener("mousemove", applyHeroParallax);
    hero.addEventListener("mouseleave", resetHeroMotion);
  } else if (hero && shoeStage && shoeCard && prefersReducedMotion) {
    shoeStage.addEventListener("mousemove", (event) => {
      const rect = shoeStage.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      const rotY = clamp(px * 14, -14, 14);
      const rotX = clamp(py * -12, -12, 12);
      shoeCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    shoeStage.addEventListener("mouseleave", resetHeroMotion);
  }

  const productGrid = document.getElementById("productGrid");
  const cartEl = document.querySelector(".cart-count");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartCloseBtn = document.getElementById("cartClose");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const placeOrderBtn = document.getElementById("placeOrderBtn");
  const headerCartBtn = document.querySelector(".header-cart");

  const STORAGE = {
    likes: "dhankor_likes_v1",
    cart: "dhankor_cart_v1"
  };

  const SIZES = [6, 7, 8, 9, 10];

  const PRODUCTS = [
    { id: "p1", name: "Velocity Running", type: "Running", price: 149, rating: 4.8, reviews: "2.1k", desc: "Feather-light cushioning for long runs.", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", badge: "Bestseller" },
    { id: "p2", name: "Noir Casual", type: "Casual", price: 129, rating: 4.6, reviews: "1.3k", desc: "Minimal street look with all-day comfort.", image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80", badge: "Popular" },
    { id: "p3", name: "Apex Sports", type: "Sports", price: 179, rating: 4.9, reviews: "980", desc: "Explosive grip and support for training.", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80", badge: "New" },
    { id: "p4", name: "Urban Sneaker", type: "Sneakers", price: 159, rating: 4.7, reviews: "1.8k", desc: "Premium upper with responsive sole.", image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80", badge: "Limited" },
    { id: "p5", name: "Classic Formal", type: "Formal", price: 189, rating: 4.7, reviews: "860", desc: "Elegant leather finish for formal wear.", image: "https://images.unsplash.com/photo-1610398752800-146f269dfcc8?auto=format&fit=crop&w=800&q=80", badge: "Premium" },
    { id: "p6", name: "Sprint Runner", type: "Running", price: 139, rating: 4.5, reviews: "1.1k", desc: "Breathable mesh and light rebound.", image: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=800&q=80", badge: "Hot" },
    { id: "p7", name: "Court Flex", type: "Sports", price: 169, rating: 4.6, reviews: "920", desc: "Stable base for quick directional moves.", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80", badge: "Top Rated" },
    { id: "p8", name: "Metro Casual", type: "Casual", price: 119, rating: 4.4, reviews: "740", desc: "Soft insole and modern matte finish.", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80", badge: "Value" },
    { id: "p9", name: "Air Glide", type: "Sneakers", price: 174, rating: 4.8, reviews: "1.5k", desc: "Air-cell sole for dynamic comfort.", image: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=800&q=80", badge: "Trending" },
    { id: "p10", name: "Monarch Formal", type: "Formal", price: 199, rating: 4.9, reviews: "540", desc: "Handcrafted profile with rich detailing.", image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=800&q=80", badge: "Luxury" },
    { id: "p11", name: "Trail Sports", type: "Sports", price: 166, rating: 4.6, reviews: "670", desc: "Durable outsole for rugged traction.", image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=80", badge: "Outdoor" },
    { id: "p12", name: "Street Wave", type: "Sneakers", price: 155, rating: 4.5, reviews: "1.0k", desc: "Contoured fit with cushioned ankle.", image: "https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=800&q=80", badge: "Editor Pick" },
    { id: "p13", name: "Form Fit", type: "Formal", price: 182, rating: 4.7, reviews: "410", desc: "Sleek silhouette for office and events.", image: "https://images.unsplash.com/photo-1556048219-bb6978360b84?auto=format&fit=crop&w=800&q=80", badge: "New" },
    { id: "p14", name: "Motion Lite", type: "Running", price: 145, rating: 4.6, reviews: "890", desc: "Balanced support with soft cushioning.", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=800&q=80", badge: "Fast" },
    { id: "p15", name: "Cloud Casual", type: "Casual", price: 124, rating: 4.4, reviews: "620", desc: "Lightweight comfort for daily wear.", image: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=800&q=80", badge: "Soft" },
    { id: "p16", name: "Prime Athlete", type: "Sports", price: 188, rating: 4.8, reviews: "780", desc: "Performance midsole with responsive feel.", image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80", badge: "Elite" }
  ];

  const safeParse = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  let liked = new Set(safeParse(STORAGE.likes, []));
  let cart = safeParse(STORAGE.cart, []);

  function saveLikes() {
    localStorage.setItem(STORAGE.likes, JSON.stringify(Array.from(liked)));
  }

  function saveCart() {
    localStorage.setItem(STORAGE.cart, JSON.stringify(cart));
  }

  function renderProducts() {
    if (!productGrid) return;

    const cardsHtml = PRODUCTS.map((product, index) => {
      const likeActive = liked.has(product.id);
      const sizeButtons = SIZES.map((size) =>
        `<button type="button" class="size-btn" data-size-btn data-size="${size}" aria-label="Select size ${size}">${size}</button>`
      ).join("");

      return `
        <article class="z-card reveal card-hover" data-delay="${(index % 8) * 60}" data-product-id="${product.id}">
          <div class="z-card-media z${(index % 4) + 1}">
            <img class="z-img" src="${product.image}" alt="${product.name} shoe" width="800" height="530" loading="lazy">
            <span class="z-badge">${product.badge}</span>
            <button type="button" class="z-like ${likeActive ? "is-liked" : ""}" data-like data-product-id="${product.id}" aria-pressed="${likeActive ? "true" : "false"}" aria-label="Save ${product.name}" title="Save">
              <svg class="z-like-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
          </div>
          <div class="z-card-body">
            <h3 class="z-title">${product.name}</h3>
            <div class="z-stars" role="img" aria-label="${product.rating} out of 5 stars">
              <span class="z-stars-row" style="--rating: ${product.rating}" aria-hidden="true"></span>
              <span class="z-rating-num">${product.rating}</span>
              <span class="z-rating-count">(${product.reviews})</span>
            </div>
            <p class="z-desc"><strong>${product.type}</strong> · ${product.desc}</p>
            <div class="z-meta">
              <span class="z-delivery">⚡ Ships in 24h</span>
              <span class="z-price">$${product.price}</span>
            </div>
            <label class="size-title">Select Size</label>
            <div class="size-list" data-size-list>
              ${sizeButtons}
            </div>
            <p class="z-card-status" data-size-status>Select a size to continue</p>
            <button type="button" class="btn btn-z btn-z-add" data-add-cart data-product-id="${product.id}">Add to cart</button>
          </div>
        </article>
      `;
    }).join("");

    productGrid.innerHTML = cardsHtml;
  }

  function setupReveal() {
    const revealEls = document.querySelectorAll(".reveal");
    revealEls.forEach((el) => {
      const d = el.getAttribute("data-delay");
      if (d !== null && d !== "") {
        el.style.transitionDelay = `${parseInt(d, 10) || 0}ms`;
      }
    });

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }
  }

  function getProductById(productId) {
    return PRODUCTS.find((item) => item.id === productId);
  }

  function flashStatus(card, message) {
    const statusEl = card.querySelector("[data-size-status]");
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.add("is-visible");
    window.setTimeout(() => statusEl.classList.remove("is-visible"), 1100);
  }

  function updateCartCount() {
    if (cartEl) cartEl.textContent = String(cart.length);
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }

  function renderCart() {
    if (!cartItemsEl || !cartTotalEl) return;

    if (!cart.length) {
      cartItemsEl.innerHTML = `<div class="cart-empty">Your cart is empty. Add products with a selected size.</div>`;
      cartTotalEl.textContent = "$0";
      return;
    }

    const html = cart.map((item, index) => `
      <article class="cart-item">
        <img src="${item.image}" alt="${item.name}" width="60" height="60" loading="lazy">
        <div>
          <h4>${item.name}</h4>
          <p class="cart-item-meta">Size ${item.size} · $${item.price}</p>
        </div>
        <button type="button" class="cart-remove" data-remove-index="${index}">Remove</button>
      </article>
    `).join("");

    cartItemsEl.innerHTML = html;
    cartTotalEl.textContent = `$${getCartTotal()}`;
  }

  function toggleCart(open) {
    if (!cartDrawer) return;
    cartDrawer.classList.toggle("is-open", open);
    cartDrawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
  }

  function setupProductInteractions() {
    if (!productGrid) return;

    productGrid.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const card = target.closest(".z-card");
      if (!card) return;

      const likeBtn = target.closest("[data-like]");
      if (likeBtn instanceof HTMLButtonElement) {
        const productId = likeBtn.getAttribute("data-product-id");
        if (!productId) return;
        if (liked.has(productId)) {
          liked.delete(productId);
          likeBtn.classList.remove("is-liked");
          likeBtn.setAttribute("aria-pressed", "false");
        } else {
          liked.add(productId);
          likeBtn.classList.add("is-liked");
          likeBtn.setAttribute("aria-pressed", "true");
        }
        saveLikes();
        return;
      }

      const sizeBtn = target.closest("[data-size-btn]");
      if (sizeBtn instanceof HTMLButtonElement) {
        const selectedSize = sizeBtn.getAttribute("data-size");
        card.querySelectorAll("[data-size-btn]").forEach((btn) => btn.classList.remove("is-selected"));
        sizeBtn.classList.add("is-selected");
        card.setAttribute("data-selected-size", selectedSize || "");
        return;
      }

      const addBtn = target.closest("[data-add-cart]");
      if (addBtn instanceof HTMLButtonElement) {
        const productId = addBtn.getAttribute("data-product-id");
        const size = card.getAttribute("data-selected-size");

        if (!size) {
          card.classList.add("is-size-missing");
          window.setTimeout(() => card.classList.remove("is-size-missing"), 350);
          flashStatus(card, "Please select a size first");
          return;
        }

        const product = productId ? getProductById(productId) : null;
        if (!product) return;

        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          size,
          image: product.image
        });

        saveCart();
        renderCart();
        updateCartCount();

        const originalLabel = addBtn.textContent;
        addBtn.textContent = "Added ✓";
        addBtn.disabled = true;
        flashStatus(card, `Size ${size} added to cart`);
        window.setTimeout(() => {
          addBtn.textContent = originalLabel || "Add to cart";
          addBtn.disabled = false;
        }, 850);
      }
    });
  }

  function setupCartActions() {
    headerCartBtn?.addEventListener("click", () => toggleCart(true));
    cartCloseBtn?.addEventListener("click", () => toggleCart(false));
    cartBackdrop?.addEventListener("click", () => toggleCart(false));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") toggleCart(false);
    });

    cartItemsEl?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const removeBtn = target.closest("[data-remove-index]");
      if (!(removeBtn instanceof HTMLButtonElement)) return;
      const index = Number(removeBtn.getAttribute("data-remove-index"));
      if (Number.isInteger(index) && index >= 0 && index < cart.length) {
        cart.splice(index, 1);
        saveCart();
        renderCart();
        updateCartCount();
      }
    });

    placeOrderBtn?.addEventListener("click", () => {
      if (!cart.length) {
        window.alert("Cart is empty. Please add items before placing order.");
        return;
      }

      const lines = cart.map((item, index) => `${index + 1}. ${item.name} - Size ${item.size} - $${item.price}`);
      const total = getCartTotal();
      const message = [
        "Hello Dhankor, I want to place an order:",
        "",
        ...lines,
        "",
        `Total: $${total}`
      ].join("\n");
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener");
    });
  }

  renderProducts();
  setupReveal();
  setupProductInteractions();
  setupCartActions();
  renderCart();
  updateCartCount();
})();