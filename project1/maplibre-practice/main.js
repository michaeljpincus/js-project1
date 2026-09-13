 import * as maplibregl from 'https://unpkg.com/maplibre-gl@^6.9.0/dist/maplibre-gl.mjs';

    const map = new maplibregl.Map({
        container: 'map', // container id
        style: 'https://tiles.openfreemap.org/styles/positron', // style URL
        center: [0, 0], // starting position [lng, lat]
        zoom: 2 // starting zoom
    })

map.on('load', () => {
    map.addSource('neighborhoods', {
        'type': 'geojson',
        'data': 'joined_neighborhoods.json',
        'generateId': true
    });

    map.addLayer({
        'id': 'neighborhoods',
        'type': 'fill',
        'source': 'neighborhoods',
        'paint': {
            'fill-color': 'steelblue',
            'fill-opacity': 1
        }
    })

    map.addLayer({
        'id': 'neighborhoods-outline',
        'type': 'line',
        'source': 'neighborhoods',
        'paint': {
            'line-color': 'white',
            'line-width': 0.5
        }
    });

    map.addInteraction('results-mousemove', {
        type: 'mousemove',
        target: {
            layerId: 'neighborhoods'
        },
        handler: (e) => {
            popup
                .setLngLat(e.lngLat)
                .setHTML(`<strong>${e.feature.properties.name}</strong><br>Top Foreign Born Country: ${e.feature.properties['Top 1 Country']}`)
                .addTo(map);
        }
    });
});