// Funzione per caricare TUTTI i set direttamente dall'API in tempo reale
async function loadAllSetsFromAPI() {
  const container = document.getElementById('all-sets-list');
  if (!container) return;
  
  container.innerHTML = '<p class="subtitle">Caricamento espansioni in corso...</p>';

  try {
    const response = await fetch('https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate');
    const data = await response.json();
    const sets = data.data;

    container.innerHTML = ''; // Pulisce il messaggio di caricamento

    sets.forEach(set => {
      const isTracked = userStorage.activeSets.includes(set.id);
      
      const card = document.createElement('div');
      card.className = 'set-card';
      card.innerHTML = `
        <img src="${set.images.logo}" alt="${set.name}" class="set-logo" loading="lazy" onerror="this.src='https://images.pokemontcg.io/unknown.png'">
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

  } catch (error) {
    console.error("Errore durante il recupero dei set:", error);
    container.innerHTML = '<p class="subtitle">Errore nel caricamento delle espansioni dall\'API.</p>';
  }
}
