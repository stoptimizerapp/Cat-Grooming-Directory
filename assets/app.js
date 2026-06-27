
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
const useLocation = document.querySelector('#use-location');
const clearLocation = document.querySelector('#clear-location');
const radiusFilter = document.querySelector('#radius-filter');
const locationStatus = document.querySelector('#location-status');
const results = document.querySelector('#search-results');
let listings = [];
let userLocation = null;

function setLocationStatus(message) {
  if (locationStatus) locationStatus.textContent = message;
}

function hasCoordinates(item) {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude);
}

function distanceKm(from, item) {
  if (!from || !hasCoordinates(item)) return null;
  const earthRadiusKm = 6371;
  const lat1 = from.latitude * Math.PI / 180;
  const lat2 = item.latitude * Math.PI / 180;
  const dLat = (item.latitude - from.latitude) * Math.PI / 180;
  const dLng = (item.longitude - from.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return '';
  if (distance < 10) return `${distance.toFixed(1)} km away`;
  return `${Math.round(distance)} km away`;
}

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
  const radius = radiusFilter?.value ? Number(radiusFilter.value) : null;
  if (!q && !prov && !wantMobile && !userLocation) {
    results.innerHTML = '';
    return;
  }
  const matches = listings.filter(item => {
    const distance = distanceKm(userLocation, item);
    item.distanceKm = distance;
    const haystack = `${item.name} ${item.address || ''} ${item.city} ${item.province} ${item.postalCode || ''} ${item.services} ${item.description}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (prov && item.province !== prov) return false;
    if (wantMobile && item.mobile !== 'Mobile') return false;
    if (userLocation && radius && (!Number.isFinite(distance) || distance > radius)) return false;
    return true;
  }).sort((a, b) => {
    if (userLocation) {
      const aDistance = Number.isFinite(a.distanceKm) ? a.distanceKm : Infinity;
      const bDistance = Number.isFinite(b.distanceKm) ? b.distanceKm : Infinity;
      if (aDistance !== bDistance) return aDistance - bDistance;
    }
    const aRating = Number(a.rating) || 0;
    const bRating = Number(b.rating) || 0;
    const aReviews = Number(a.reviews) || 0;
    const bReviews = Number(b.reviews) || 0;
    return bRating - aRating || bReviews - aReviews;
  }).slice(0, 12);
  if (!matches.length) {
    const radiusText = userLocation && radius ? ` within ${radius} km` : '';
    results.innerHTML = `<p class="result-item">No matching listings${radiusText}. Try a larger radius, nearby city or province filter.</p>`;
    return;
  }
  results.innerHTML = matches.map(item => `
    <a class="result-item" href="${item.url}">
      <strong>${item.name}</strong>
      ${Number.isFinite(item.distanceKm) ? `<span class="distance-line">${formatDistance(item.distanceKm)}</span>` : ''}
      <span>${item.city}, ${item.province} · ${item.mobile} · ${item.rating || 'No rating'} stars · ${item.reviews || 0} reviews</span>
    </a>
  `).join('');
}

function requestUserLocation() {
  if (!navigator.geolocation || !window.isSecureContext) {
    setLocationStatus('Location needs HTTPS. Search by city or postal code until secure browsing is active.');
    return;
  }
  useLocation.disabled = true;
  setLocationStatus('Finding your location...');
  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      useLocation.disabled = false;
      clearLocation.hidden = false;
      const radius = radiusFilter?.value || 'all distances';
      setLocationStatus(radius === 'all distances' ? 'Showing closest cat groomers first.' : `Showing cat groomers within ${radius} km.`);
      renderResults();
    },
    () => {
      useLocation.disabled = false;
      setLocationStatus('Location was not shared. Search by city or postal code instead.');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

[search, province, mobileOnly, radiusFilter].forEach(control => control?.addEventListener('input', () => {
  if (userLocation) {
    const radius = radiusFilter?.value || 'all distances';
    setLocationStatus(radius === 'all distances' ? 'Showing closest cat groomers first.' : `Showing cat groomers within ${radius} km.`);
  }
  renderResults();
}));
useLocation?.addEventListener('click', requestUserLocation);
clearLocation?.addEventListener('click', () => {
  userLocation = null;
  clearLocation.hidden = true;
  setLocationStatus('Location sorting off.');
  renderResults();
});
loadListings();
