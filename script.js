let userStorage = {
  activeSets: [],
  ownedCards: {}
};

let localDatabase = { sets: [] };
let currentTab = 'my-collection';
let currentLoadedCards = [];
const API_KEY = '18a4a589-9e85-4876-a058-fcf42250c608';

document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  loadLocalDatabase();
  renderAllViews();
});

function saveToLocalStorage() {
  localStorage.setItem('pokemon_collection_data', JSON.stringify(userStorage));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('pokemon_collection_data');
  if (saved) {
    try {
      userStorage = JSON.parse(saved);
    } catch (e) {
      console.error("Errore nel caricamento del salvataggio locale:", e);
    }
  }
}

function loadLocalDatabase() {
  if (typeof LOCAL_DATABASE !== 'undefined' && LOCAL_DATABASE.sets) {
    localDatabase = LOCAL_DATABASE;
  } else {
    console.error("File pokemon_database.js non rilevato correttamente.");
  }
}

function switchTab(tabName) {
  currentTab = tabName;
  
  document.getElementById('nav-my-collection').classList.toggle('active', tabName === 'my-collection');
  document.getElementById('nav-all-sets').classList.toggle('active', tabName === 'all-sets');
  
  document.getElementById('view-my-collection').classList.toggle('hidden', tabName !== 'my-collection');
  document.getElementById('view-all-sets').classList.toggle('hidden', tabName !== 'all-sets');

  if (tabName === 'my-collection') {
    closeCardsViewer();
    renderMyCollection();
  } else {
    renderAllSets();
  }
}

function renderAllViews() {
  renderMyCollection();
  renderAllSets();
}

function getOwnedCountForSet(setId) {
  return Object.keys(userStorage.ownedCards).filter(cardId => {
    return cardId.startsWith(setId + '-') && userStorage.ownedCards[cardId] === true;
  }).length;
}

// 1. Renderizza "La Mia Collezione"
function renderMyCollection() {
  const container = document.getElementById('active-sets-list');
  if (!container) return;
  container.innerHTML = '';

  const activeSetsObjects = (localDatabase.sets || []).filter(s => userStorage.activeSets.includes(s.id));

  if (activeSetsObjects.length === 0) {
    container.innerHTML = '<p class="subtitle">Nessuna espansione in collezione. Cerca una carta in alto o vai su <b>"Lista Espansioni"</b> per aggiungerne qualcuna!</p>';
    return;
  }

  activeSetsObjects.forEach(set => {
    const ownedCount = getOwnedCountForSet(set.id);
    const totalCards = set.total || '?';

    const card = document.createElement('div');
    card.className = 'set-card';
    card.innerHTML = `
      <img src="${set.images.logo}" alt="${set.name}" class="set-logo" loading="lazy">
      <div class="set-title">${set.name}</div>
      <div class="set-counter">Collezione: ${ownedCount} / ${totalCards}</div>
    `;
    
    card.addEventListener('click', () => openSetCards(set));
    container.appendChild(card);
  });
}

// 2. Renderizza "Lista Espansioni"
function renderAllSets() {
  const container = document.getElementById('all-sets-list');
  if (!container) return;
  container.innerHTML = '';

  const sets = localDatabase.sets || [];

  if (sets.length === 0) {
    container.innerHTML = '<p class="subtitle">Errore nel caricamento del database locale.</p>';
    return;
  }

  sets.forEach(set => {
    const isTracked = userStorage.activeSets.includes(set.id);
    
    const card = document.createElement('div');
    card.className = 'set-card';
    card.innerHTML = `
      <img src="${set.images.logo}" alt="${set.name}" class="set-logo" loading="lazy">
      <div class="set-title">${set.name}</div>
      <label class="set-checkbox-label">
        <input type="checkbox" ${isTracked ? 'checked' : ''}> In collezione
      </label>
    `;

    const checkbox = card.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleSetTracking(set.id, checkbox.checked);
    });

    container.appendChild(card);
  });
}

function toggleSetTracking(setId, isChecked) {
  if (isChecked) {
    if (!userStorage.activeSets.includes(setId)) {
      userStorage.activeSets.push(setId);
    }
  } else {
    userStorage.activeSets = userStorage.activeSets.filter(id => id !== setId);
  }
  saveToLocalStorage();
}

// === RICERCA GLOBALE (ONLINE VIA POKEMON TCG API) ===
function handleGlobalSearch(event) {
  if (event.key === 'Enter') {
    triggerGlobalSearch();
  }
}

async function triggerGlobalSearch() {
  const input = document.getElementById('global-search-input');
  const query = input.value.trim();
  const loading = document.getElementById('global-search-loading');
  const resultsContainer = document.getElementById('global-search-results');

  if (!query) {
    resultsContainer.classList.add('hidden');
    resultsContainer.innerHTML = '';
    return;
  }

  loading.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
  resultsContainer.innerHTML = '';

  try {
    const searchUrl = `https://api.pokemontcg.io/v2/cards?q=name:"*${query}*" OR number:"${query}"&pageSize=30&select=id,name,number,images,set`;
    const response = await fetch(searchUrl, {
      headers: { 'X-Api-Key': API_KEY }
    });

    const data = await response.json();
    loading.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    renderGlobalSearchResults(data.data);
  } catch (err) {
    loading.textContent = 'Errore durante la ricerca online.';
    console.error(err);
  }
}

function renderGlobalSearchResults(cards) {
  const container = document.getElementById('global-search-results');
  container.innerHTML = '';

  if (!cards || cards.length === 0) {
    container.innerHTML = '<p class="subtitle">Nessuna carta trovata.</p>';
    return;
  }

  cards.forEach(card => {
    const isOwned = !!userStorage.ownedCards[card.id];
    const setName = card.set ? card.set.name : 'Espansione';
    const setId = card.set ? card.set.id : null;

    const cardEl = document.createElement('div');
    cardEl.className = `card ${isOwned ? 'owned' : 'missing'}`;

    cardEl.innerHTML = `
      <img src="${card.images.small}" alt="${card.name}" loading="lazy">
      <div class="card-number">#${card.number}</div>
      <div class="card-set-tag" title="${setName}">${setName}</div>
    `;

    cardEl.addEventListener('click', () => {
      const newState = !userStorage.ownedCards[card.id];
      userStorage.ownedCards[card.id] = newState;

      if (newState && setId && !userStorage.activeSets.includes(setId)) {
        userStorage.activeSets.push(setId);
      }

      cardEl.className = `card ${newState ? 'owned' : 'missing'}`;
      saveToLocalStorage();
      renderMyCollection();
    });

    container.appendChild(cardEl);
  });
}

// === APERTURA CARTE ESPANSIONE (POKEMON TCG API) ===
async function openSetCards(setObj) {
  document.getElementById('active-sets-list').classList.add('hidden');
  const viewer = document.getElementById('cards-viewer');
  viewer.classList.remove('hidden');

  document.getElementById('current-set-title').textContent = setObj.name;
  document.getElementById('card-search-input').value = '';
  
  const grid = document.getElementById('cards-grid');
  const loading = document.getElementById('loading');
  grid.innerHTML = '';

  loading.textContent = 'Caricamento carte in corso...';
  loading.classList.remove('hidden');

  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setObj.id}&pageSize=250&orderBy=number&select=id,name,number,images`;
    const response = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
    const data = await response.json();
    
    loading.classList.add('hidden');
    currentLoadedCards = data.data || [];
    renderCards(currentLoadedCards);
  } catch (err) {
    loading.textContent = 'Errore di connessione. Assicurati di aprire la pagina tramite server locale (es. Live Server).';
    console.error(err);
  }
}

function closeCardsViewer() {
  document.getElementById('cards-viewer').classList.add('hidden');
  document.getElementById('active-sets-list').classList.remove('hidden');
  renderMyCollection();
}

function filterCards() {
  const query = document.getElementById('card-search-input').value.toLowerCase().trim();
  
  if (!query) {
    renderCards(currentLoadedCards);
    return;
  }

  const filtered = currentLoadedCards.filter(card => {
    const nameMatch = card.name.toLowerCase().includes(query);
    const numberMatch = card.number.toString().toLowerCase().includes(query);
    return nameMatch || numberMatch;
  });

  renderCards(filtered);
}

function renderCards(cards) {
  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';

  if (!cards || cards.length === 0) {
    grid.innerHTML = '<p class="subtitle">Nessuna carta trovata.</p>';
    return;
  }

  cards.forEach(card => {
    const isOwned = !!userStorage.ownedCards[card.id];
    
    const cardEl = document.createElement('div');
    cardEl.className = `card ${isOwned ? 'owned' : 'missing'}`;
    
    cardEl.innerHTML = `
      <img src="${card.images.small}" alt="${card.name}" loading="lazy">
      <div class="card-number">#${card.number}</div>
    `;

    cardEl.addEventListener('click', () => {
      const newState = !userStorage.ownedCards[card.id];
      userStorage.ownedCards[card.id] = newState;
      
      cardEl.className = `card ${newState ? 'owned' : 'missing'}`;
      saveToLocalStorage();
    });

    grid.appendChild(cardEl);
  });
}