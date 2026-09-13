mapboxgl.accessToken = MAPBOX_TOKEN

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mjpjpg/cmk08nn4w001l01s5eel5hzhs',
    center: [-73.9857, 40.7184],
    zoom: 9.75,
    minZoom: 9.75,
    maxZoom: 13,
})

const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: [0, -20]
});

let hoveredPolygonId = null;

const initialCenter = [-73.9857, 40.7184]
const initialZoom = 9.75


map.on('load', () => {
    map.addSource('neighborhoods', {
        'type': 'geojson',
        'data': 'joined_neighborhoods.json',
        'generateId': true
    });

     map.addSource('nyc-border', {
        'type': 'geojson',
        'data': 'nyc_border.geojson',
        'generateId': true
    });

    map.addLayer({
        'id': 'neighborhoods',
        'type': 'fill',
        'source': 'neighborhoods',
        'paint': {
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
        'id': 'neighborhoods-outline',
        'type': 'line',
        'source': 'neighborhoods',
        'paint': {
            'line-color': 'white',
            'line-width': 0.5
        }
    });
    

    map.addLayer({
        'id': 'nyc-outline',
        'type': 'line',
        'source': 'nyc-border',
        'paint': {
            'line-color': 'black',
            'line-width': 0.5
        }
    })

    map.addInteraction('results-mousemove', {
        type: 'mousemove',
        target: {
            layerId: 'neighborhoods'
        },
        handler: (e) => {
            const props = e.feature.properties;
            const iso2 = props['Top 1 ISO2'];
            const flagImg = iso2
                ? `<img src="https://flagcdn.com/w20/${iso2.toLowerCase()}.png" style="vertical-align:middle; margin-right:4px;" width="20" alt="${props['Top 1 Country']} flag">`
                : '';

            popup
                .setLngLat(e.lngLat)
                .setHTML(`<strong>${props.name}</strong><br><span class="label-muted">Top foreign-born country:</span><br><span class="flag-country">${flagImg}${props['Top 1 Country']}</span>`)
                .addTo(map);
}
    });

    map.on('mousemove', 'neighborhoods', (e) => {
        if (e.features.length > 0) {
            if (hoveredPolygonId !== null) {
                map.setFeatureState(
                    { source: 'neighborhoods', id: hoveredPolygonId },
                    { hover: false }
                );
            }
        }
        hoveredPolygonId = e.features[0].id;
        map.setFeatureState(
            { source: 'neighborhoods', id: hoveredPolygonId },
            { hover: true }
        )
    })

    map.on('mouseleave', 'neighborhoods', () => {
        if (hoveredPolygonId !== null) {
            map.setFeatureState(
                { source: 'neighborhoods', id: hoveredPolygonId },
                { hover: false }
            );
        }
        hoveredPolygonId = null;
    });

    map.on('mouseleave', 'neighborhoods', () => {
        popup.remove();
    });

    map.on('click', 'neighborhoods', (e) => {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const bbox = turf.bbox(feature);

            map.fitBounds(bbox, {
                padding: 80,
                duration: 1000,
                maxZoom: 13
            });
        }
    });

    map.on('mouseenter', 'neighborhoods', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'neighborhoods', () => {
        map.getCanvas().style.cursor = '';
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    map.on('zoom', () => {
        const currentZoom = map.getZoom();
        const resetButton = document.getElementById('reset-zoom');

        if (currentZoom > initialZoom) {
            resetButton.style.display = 'block';
        } else {
            resetButton.style.display = 'none';
        }
    })

    map.on('click', 'neighborhoods', (e) => {
        const props = e.features[0].properties;
        showPanel(props);
    })
});

document.getElementById('reset-zoom').addEventListener('click', () => {
    map.flyTo({
        center: initialCenter,
        zoom: initialZoom,
        duration: 1000
    });
});

// A LLM helped me write this function to help me get the flag images for each country. 
function showPanel(props) {
    document.getElementById('panel-title').textContent = props.Area;
    document.getElementById('panel-subtitle').innerHTML =
    `${props['Percent Foreign-born (%)']}% foreign-born`;

    const container = document.getElementById('panel-countries');
    container.innerHTML = '';

    for (let i = 1; i<=5; i++) {
        const country = props[`Top ${i} Country`];
        const pct = props[`Top ${i} % of Foreign-born`];
        const iso2 = props[`Top ${i} ISO2`];

        const row = document.createElement('div');
        row.ClassName = 'country-row';
        row.innerHTML = `
            ${iso2 ? `<img src="https://flagcdn.com/w20/${iso2.toLowerCase()}.png" srcset="https://flagcdn.com/w40/${iso2.toLowerCase()}.png 2x" width="20" alt="${country} flag">` : ''}
            <span>${country}</span>
            <span class='pct'>${pct}%</span>`;
        container.appendChild(row);
    }

    document.getElementById('info-panel').classList.add('visible');
}

document.getElementById('close-panel').addEventListener('click', () => {
  document.getElementById('info-panel').classList.remove('visible');
});