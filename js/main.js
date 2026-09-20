// ============================================================================
// Config
// ============================================================================

// Access token configured only for michaeljpincus.github.io url requests
mapboxgl.accessToken = 'pk.eyJ1IjoibWpwanBnIiwiYSI6ImNtdTBlODVjeTB5bm4yenBtcW15Y3dmbzgifQ.Gyy9P1sfCGT2QtizeNiqgw';
// mapboxgl.accessToken = MAPBOX_TOKEN;

const INITIAL_CENTER = [-73.9857, 40.7184];
const INITIAL_ZOOM = 9.75;

// ============================================================================
// Map + DOM references
// ============================================================================

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mjpjpg/cmk08nn4w001l01s5eel5hzhs',
  center: INITIAL_CENTER,
  zoom: INITIAL_ZOOM,
  minZoom: 9.75,
  maxZoom: 13
});

const popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: [0, -20]
});

const neighborhoodSelect = document.getElementById('neighborhood-select');
const infoPanel = document.getElementById('info-panel');
const resetButton = document.getElementById('reset-zoom');

let hoveredPolygonId = null;
let neighborhoodFeatures = [];

// ============================================================================
// Helpers
// ============================================================================

function flagImg(iso2, country) {
  if (!iso2) return '';
  return `<img src="https://flagsapi.com/${iso2}/flat/64.png" width="20" alt="${country} flag">`;
}

function setHover(id, isHovered) {
  if (id === null) return;
  map.setFeatureState({ source: 'neighborhoods', id }, { hover: isHovered });
}

// A LLM helped me write this function to help me get the flag images for each country.
function showPanel(props) {
  document.getElementById('panel-title').textContent = props.Area;
  document.getElementById('panel-subtitle').innerHTML =
    `${props['Percent Foreign-born (%)']}% foreign-born`;

  const container = document.getElementById('panel-countries');
  container.innerHTML = '';

  for (let i = 1; i <= 5; i++) {
    const country = props[`Top ${i} Country`];
    const pct = props[`Top ${i} % of Foreign-born`];
    const iso2 = props[`Top ${i} ISO2`];

    const row = document.createElement('div');
    row.className = 'country-row';
    row.innerHTML = `
      ${flagImg(iso2, country)}
      <span>${country}</span>
      <span class="pct">${pct}%</span>`;
    container.appendChild(row);
  }

  infoPanel.classList.add('visible');
}

function setSelected(name) {
  map.setPaintProperty('neighborhoods', 'fill-opacity', [
    'case',
    ['==', ['get', 'Area'], name ?? ''],
    0.9,
    ['boolean', ['feature-state', 'hover'], false],
    0.8,
    0.5
  ]);
}

function selectNeighborhood(feature) {
  neighborhoodSelect.value = feature.properties.Area;
  setSelected(feature.properties.Area);

  map.fitBounds(turf.bbox(feature), {
    padding: 80,
    duration: 1000,
    maxZoom: 13
  });

  showPanel(feature.properties);
}

function clearSelection() {
  setSelected(null);
  neighborhoodSelect.value = '';
}

// ============================================================================
// Map layers + interactions
// ============================================================================

map.on('load', () => {
  // ---- Sources ----
  map.addSource('neighborhoods', {
    type: 'geojson',
    data: 'joined_neighborhoods.json',
    promoteId: 'Area'
  });

  map.addSource('nyc-border', {
    type: 'geojson',
    data: 'nyc_border.geojson',
    generateId: true
  });

  // ---- Layers ----
  map.addLayer({
    id: 'neighborhoods',
    type: 'fill',
    source: 'neighborhoods',
    paint: {
      'fill-color': 'steelblue',
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0.8,
        0.5
      ]
    }
  });

  map.addLayer({
    id: 'neighborhoods-outline',
    type: 'line',
    source: 'neighborhoods',
    paint: {
      'line-color': 'white',
      'line-width': 0.5
    }
  });

  map.addLayer({
    id: 'nyc-outline',
    type: 'line',
    source: 'nyc-border',
    paint: {
      'line-color': 'black',
      'line-width': 0.5
    }
  });

  // ---- Controls ----
  map.addControl(new mapboxgl.NavigationControl(), 'top-left');

  // ---- Hover popup ----
  map.addInteraction('results-mousemove', {
    type: 'mousemove',
    target: { layerId: 'neighborhoods' },
    handler: (e) => {
      const props = e.feature.properties;
      const iso2 = props['Top 1 ISO2'];
      const country = props['Top 1 Country'];

      popup
        .setLngLat(e.lngLat)
        .setHTML(`
          <strong>${props.name}</strong><br>
          <span class="label-muted">Top foreign-born country:</span><br>
          <span class="flag-country">${flagImg(iso2, country)}<span>${country}</span></span>`)
        .addTo(map);
    }
  });

  // ---- Hover highlight ----
  map.on('mousemove', 'neighborhoods', (e) => {
    if (e.features.length === 0) return;

    setHover(hoveredPolygonId, false);
    hoveredPolygonId = e.features[0].id;
    setHover(hoveredPolygonId, true);
  });

  map.on('mouseenter', 'neighborhoods', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'neighborhoods', () => {
    setHover(hoveredPolygonId, false);
    hoveredPolygonId = null;
    popup.remove();
    map.getCanvas().style.cursor = '';
  });

  // ---- Click to select ----
  map.on('click', 'neighborhoods', (e) => {
    if (e.features.length > 0) {
      selectNeighborhood(e.features[0]);
    }
  });

  // ---- Show reset button only when zoomed in ----
  map.on('zoom', () => {
    resetButton.style.display = map.getZoom() > INITIAL_ZOOM ? 'block' : 'none';
  });
});

// ============================================================================
// Dropdown
// ============================================================================

fetch('joined_neighborhoods.json')
  .then((res) => res.json())
  .then((data) => {
    neighborhoodFeatures = data.features;

    // Sort alphabetically by the name shown in the panel
    const sorted = [...neighborhoodFeatures].sort((a, b) =>
      a.properties.Area.localeCompare(b.properties.Area)
    );

    sorted.forEach((feature) => {
      const option = document.createElement('option');
      option.value = feature.properties.Area;
      option.textContent = feature.properties.Area;
      neighborhoodSelect.appendChild(option);
    });
  });

neighborhoodSelect.addEventListener('change', () => {
  const selected = neighborhoodSelect.value;
  if (!selected) return;

  const feature = neighborhoodFeatures.find(
    (f) => f.properties.Area === selected
  );
  if (feature) selectNeighborhood(feature);
});

// ============================================================================
// UI buttons
// ============================================================================

document.getElementById('splash-close').addEventListener('click', () => {
  document.getElementById('splash').classList.add('hidden');
});

resetButton.addEventListener('click', () => {
  infoPanel.classList.remove('visible');
  clearSelection();
  map.flyTo({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    duration: 1000
  });
});

document.getElementById('close-panel').addEventListener('click', () => {
  infoPanel.classList.remove('visible');
  clearSelection();
});