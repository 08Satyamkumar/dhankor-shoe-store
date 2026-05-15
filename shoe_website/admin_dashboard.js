document.addEventListener('DOMContentLoaded', () => {
  const loginOverlay = document.getElementById('loginOverlay');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const masterPasswordInput = document.getElementById('masterPassword');
  const sellerTableBody = document.getElementById('sellerTableBody');
  const totalCount = document.getElementById('totalCount');
  const logoutBtn = document.getElementById('logoutBtn');

  let adminPassword = localStorage.getItem('dhankor_admin_session_v1') || '';
  if (adminPassword) {
    adminPassword = adminPassword.replace(/"/g, ''); // Fix quotes from JSON stringify
  }

  requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
  });

  if (adminPassword) {
    verifyAndLoad(adminPassword);
  }

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = masterPasswordInput.value;
    await verifyAndLoad(pass);
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('dhankor_admin_session_v1');
    adminPassword = '';
    loginOverlay.style.display = 'flex';
  });

  async function verifyAndLoad(pass) {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });
      if (!res.ok) throw new Error('Invalid Password');
      
      adminPassword = pass;
      localStorage.setItem('dhankor_admin_session_v1', JSON.stringify(pass));
      loginOverlay.style.display = 'none';
      loadSellers();
    } catch (err) {
      alert("Incorrect master password!");
      localStorage.removeItem('dhankor_admin_session_v1');
      adminPassword = '';
    }
  }

  async function loadSellers() {
    try {
      const res = await fetch('/api/admin/sellers', {
        headers: { 'x-admin-password': adminPassword }
      });
      if (!res.ok) throw new Error("Failed to load sellers");
      const sellers = await res.json();
      renderSellers(sellers);
    } catch (err) {
      console.error(err);
      sellerTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Failed to load data. Ensure server is running.</td></tr>`;
    }
  }

  function renderSellers(sellers) {
    totalCount.textContent = sellers.length;
    sellerTableBody.innerHTML = '';
    
    if (sellers.length === 0) {
      sellerTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 3rem;">No sellers registered yet.</td></tr>`;
      return;
    }

    sellers.forEach(s => {
      const isVerified = s.isVerified;
      const statusClass = isVerified ? 'status-verified' : 'status-pending';
      const statusText = isVerified ? 'Verified' : 'Pending';
      const btnClass = isVerified ? 'btn-revoke' : 'btn-approve';
      const btnText = isVerified ? 'Revoke Access' : 'Approve Shop';
      
      let locText = "N/A";
      if (s.location && s.location.coordinates[0] !== 0) {
        locText = `Lng: ${s.location.coordinates[0].toFixed(2)}, Lat: ${s.location.coordinates[1].toFixed(2)}`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 600; color: #fff;">${s.shopName}</div>
          <a href="/shop/${s.shopUrl}" target="_blank" style="font-size: 0.8rem; color: #60a5fa; text-decoration: none;">/shop/${s.shopUrl}</a>
        </td>
        <td>
          <div>${s.ownerName}</div>
          <div style="font-size: 0.8rem; color: var(--muted);">${s.email}</div>
        </td>
        <td>${s.whatsappNumber}</td>
        <td style="font-size: 0.8rem;">${locText}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <button class="action-btn ${btnClass}" data-id="${s._id}" data-verified="${isVerified}">${btnText}</button>
        </td>
      `;
      sellerTableBody.appendChild(tr);
    });

    // Attach events
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const currentlyVerified = e.target.getAttribute('data-verified') === 'true';
        await toggleVerification(id, !currentlyVerified);
      });
    });
  }

  async function toggleVerification(id, newStatus) {
    try {
      const res = await fetch(`/api/admin/sellers/${id}/verify`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ isVerified: newStatus })
      });
      if (!res.ok) throw new Error("Update failed");
      loadSellers(); // Reload table
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  }
});
