/* seller.js */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tab');
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const sellerLogoutBtn = document.getElementById('sellerLogoutBtn');
  const welcomeText = document.getElementById('welcomeText');
  const sellerProductGrid = document.getElementById('sellerProductGrid');

  // Modal elements
  const addBtn = document.getElementById('dashboardAddProductBtn');
  const modal = document.getElementById('sellerProductModal');
  const modalClose = document.getElementById('sellerProductClose');
  const modalCancel = document.getElementById('sellerProductCancel');
  const modalForm = document.getElementById('sellerProductForm');

  let currentToken = localStorage.getItem('sellerToken');
  let currentSeller = JSON.parse(localStorage.getItem('sellerInfo') || 'null');

  // Trigger the main-shell fade in animation (since main.js is not loaded here)
  requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      if (target === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
      } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
      }
    });
  });

  function showDashboard() {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    sellerLogoutBtn.hidden = false;
    welcomeText.textContent = `Welcome, ${currentSeller.shopName}`;
    
    // Setup the Seller Status Banner
    const vipLinkEl = document.getElementById('vipStoreLink');
    const badgeEl = document.getElementById('kycStatusBadge');
    const warningEl = document.getElementById('kycWarningMsg');

    const shopUrl = `http://localhost:3000/shop/${currentSeller.shopUrl}`;
    vipLinkEl.href = shopUrl;
    vipLinkEl.textContent = shopUrl;

    if (currentSeller.isVerified) {
       badgeEl.textContent = "Verified";
       badgeEl.style.background = "rgba(34, 197, 94, 0.2)";
       badgeEl.style.color = "#86efac";
       badgeEl.style.border = "1px solid rgba(34, 197, 94, 0.3)";
       warningEl.style.display = "none";
    } else {
       badgeEl.textContent = "Pending Approval";
       badgeEl.style.background = "rgba(234, 179, 8, 0.2)";
       badgeEl.style.color = "#fde047";
       badgeEl.style.border = "1px solid rgba(234, 179, 8, 0.3)";
       warningEl.style.display = "block";
    }

    fetchSellerProducts();
  }

  function showAuth() {
    authSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
    sellerLogoutBtn.hidden = true;
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerInfo');
    currentToken = null;
    currentSeller = null;
  }

  if (currentToken && currentSeller) {
    showDashboard();
  }

  sellerLogoutBtn.addEventListener('click', showAuth);

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    const data = Object.fromEntries(fd.entries());
    
    try {
      const res = await fetch('/api/seller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      localStorage.setItem('sellerToken', result.token);
      localStorage.setItem('sellerInfo', JSON.stringify(result.seller));
      currentToken = result.token;
      currentSeller = result.seller;
      showDashboard();
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const data = Object.fromEntries(fd.entries());

    try {
      const res = await fetch('/api/seller/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      localStorage.setItem('sellerToken', result.token);
      localStorage.setItem('sellerInfo', JSON.stringify(result.seller));
      currentToken = result.token;
      currentSeller = result.seller;
      showDashboard();
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  });

  async function fetchSellerProducts() {
    if (!currentToken) return;
    try {
      const res = await fetch('/api/seller/products', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const products = await res.json();
      renderProducts(products);
    } catch (err) {
      sellerProductGrid.innerHTML = `<p>${err.message}</p>`;
    }
  }

  function renderProducts(products) {
    sellerProductGrid.innerHTML = '';
    if (products.length === 0) {
      sellerProductGrid.innerHTML = '<p style="grid-column: 1/-1;">You have not added any products yet.</p>';
      return;
    }
    products.forEach(p => {
      const el = document.createElement('article');
      el.className = 'product-card reveal';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.innerHTML = `
        <div class="product-badge">${p.badge || 'New'}</div>
        <div class="product-image-box">
          <img src="${p.image}" alt="${p.name}" class="product-image">
        </div>
        <div class="product-info">
          <div>
            <div class="product-type">${p.type}</div>
            <h3 class="product-name">${p.name}</h3>
          </div>
          <div class="product-price">₹${p.price}</div>
        </div>
      `;
      sellerProductGrid.appendChild(el);
    });
  }

  // Modal logic
  addBtn.addEventListener('click', () => { modal.setAttribute('aria-hidden', 'false'); });
  modalClose.addEventListener('click', () => { modal.setAttribute('aria-hidden', 'true'); });
  modalCancel.addEventListener('click', () => { modal.setAttribute('aria-hidden', 'true'); });

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentToken) return;
    
    const fd = new FormData(modalForm);
    const data = Object.fromEntries(fd.entries());
    const fileInput = modalForm.querySelector('input[type="file"]');
    
    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        data.image = ev.target.result;
        data.images = [ev.target.result];
        submitProduct(data);
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      alert("Please upload at least one image");
    }
  });

  async function submitProduct(data) {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error);
      }
      modal.setAttribute('aria-hidden', 'true');
      modalForm.reset();
      fetchSellerProducts();
    } catch (err) {
      alert("Failed to add product: " + err.message);
    }
  }
});
