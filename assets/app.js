
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

const search = document.querySelector('#site-search');
const province = document.querySelector('#province-filter');
const mobileOnly = document.querySelector('#mobile-only');
const results = document.querySelector('#search-results');
let listings = [];

async function loadListings() {
  if (!search || !results) return;
  try {
    const response = await fetch('/data/listings.json');
    listings = await response.json();
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) search.value = params.get('q');
    renderResults();
  } catch (error) {
    results.innerHTML = '<p class="result-item">Search data could not load. Browse by province instead.</p>';
  }
}

function renderResults() {
  const q = (search?.value || '').trim().toLowerCase();
  const prov = province?.value || '';
  const wantMobile = Boolean(mobileOnly?.checked);
  if (!q && !prov && !wantMobile) {
    results.innerHTML = '';
    return;
  }
  const matches = listings.filter(item => {
    const haystack = `${item.name} ${item.city} ${item.province} ${item.services} ${item.description}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (prov && item.province !== prov) return false;
    if (wantMobile && item.mobile !== 'Mobile') return false;
    return true;
  }).slice(0, 12);
  if (!matches.length) {
    results.innerHTML = '<p class="result-item">No matching listings yet. Try a nearby city or browse by province.</p>';
    return;
  }
  results.innerHTML = matches.map(item => `
    <div class="result-item">
      <a href="${item.url}">${item.name}</a>
      <div>${item.city}, ${item.province} · ${item.mobile} · ${item.rating || 'No rating'} stars · ${item.reviews || 0} reviews</div>
    </div>
  `).join('');
}

[search, province, mobileOnly].forEach(control => control?.addEventListener('input', renderResults));
loadListings();
