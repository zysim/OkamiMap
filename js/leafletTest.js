import { getCollectible } from './collectibles.js'
import { getLocale } from './utils.js'

// TODO: The size here needs to be tinkered with. This will affect css/leafletTest.css too.
const ICON_SIZE = 40

function formatValue(value) {
  if (!value) return null
  const thousands = Math.floor(value / 1000)
  const rest = `${value % 1000}`.padStart(3, '0')
  return `${thousands > 0 ? thousands + ',' : ''}${rest} ${getLocale('currency')}`
}

function createIcon(name) {
  return L.icon({
    iconUrl: getCollectible(name)?.path || '../CollectiblesImages/Default.png',
    iconSize: [ICON_SIZE, ICON_SIZE],
    iconAnchor: [ICON_SIZE / 4, ICON_SIZE / 2],
    popupAnchor: [0, -ICON_SIZE / 2],
    className: 'mine-marker-icon',
  })
}

const zoomGranularity = 0.5;
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -6,
  maxZoom: -1,
  zoomSnap: zoomGranularity,
  zoomDelta: zoomGranularity,
  maxBoundsViscosity: 1,
  layerPreview: true
});
map.setView([0, 0], 0);

let currentGameMap;
let mapImage = null;
function setGameMap(mapID, scale, shiftN, shiftE) {
  currentGameMap = mapID;
  const bounds = [[-scale + shiftN, -scale + shiftE], [scale + shiftN, scale + shiftE]];
  let mapIDHex = mapID.toString(16);

  const mapURL = `./DumpedMaps/map_r${mapIDHex}_0out.png`
  if (mapImage === null) {
    mapImage = L.imageOverlay(mapURL, bounds).addTo(map);
  } else {
    mapImage.setUrl(mapURL);
    mapImage.setBounds(bounds);
  }
  map.fitBounds(bounds, {animate: false});
}
/* Initialize to Shinshu: */
setGameMap(0xf02, 5200, 1000, 1000);

/* Fetch multiple JSON files in parallel */
async function paraFetchJSON(...URLs) {
  const requests = URLs.map(u=>
    fetch(u).then(r=>r.json())
  );
  return Promise.all(requests);
}

let lootData;
let mapInfo
(async ()=>{
  [lootData, mapInfo] = await paraFetchJSON(
    './Loot/data.json', './mapInfo.json'
  );

  map.lootLayer = L.featureGroup().addTo(map);
  function addLootMarkers() {
    map.lootLayer.clearLayers();
    for (const loot of lootData) {
      if (loot.mapID === currentGameMap) {
        const coords = loot.coords;
        const latlong = [-coords[2], coords[0]];
        const value = formatValue(getCollectible(loot.contents)?.value);
        map.lootLayer.addLayer(
          L.marker(latlong, {
            image: loot.image,
            icon: createIcon(loot.contents),
          }).bindPopup(`${loot.contents}${value ? ' | ' + value : ''}`),
        );
      }
    }
  }
  addLootMarkers();

  function updatePreview(e) {
    map.setPreviewImage(e.sourceTarget.options.image);
  }
  map.lootLayer.on('popupopen', updatePreview);

  const MapSelector = L.Control.extend({
    onAdd: function(){
      const container = L.DomUtil.create('div');
      container.style.width = '300px';
      container.style.background = 'rgba(255,255,255,0.5)';
      container.style.textAlign = 'left';
      const selBox = L.DomUtil.create('select', '', container);
      for (const id in mapInfo) {
        const selOpt = L.DomUtil.create('option', '', selBox);
        selOpt.value = id;
        selOpt.innerText = mapInfo[id].name;

        if (+id === currentGameMap) selOpt.setAttribute('selected', '');
      }
      L.DomEvent.on(selBox, 'input', e=>{
        const selID = +selBox.value;
        const selInfo = mapInfo[selID];
        setGameMap(selID, selInfo.leafletScale, ...selInfo.leafletNEOffset);
        addLootMarkers();
      })
      return container;
    }
  });
  (new MapSelector).addTo(map);
})();
