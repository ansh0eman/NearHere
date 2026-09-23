import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

const styleUrl = new URL('../assets/maps/nearhere-night-arcade-v1.json', import.meta.url);
const style = JSON.parse(readFileSync(fileURLToPath(styleUrl), 'utf8'));

test('Night Arcade map style is a self-contained MapLibre v8 vector style', () => {
  assert.equal(style.version, 8);
  assert.match(style.glyphs, /^https:\/\/tiles\.openfreemap\.org\/fonts\//);
  assert.ok(style.sources.openmaptiles);
  assert.equal(style.sources.openmaptiles.type, 'vector');
  assert.equal(style.sources.openmaptiles.url, 'https://tiles.openfreemap.org/planet');
  assert.match(style.sources.openmaptiles.attribution, /OpenStreetMap/);

  const ids = style.layers.map((layer) => layer.id);
  assert.equal(new Set(ids).size, ids.length, 'style layer IDs must be unique');
  assert.ok(ids.includes('nearhere-background'));
  assert.ok(ids.includes('nearhere-water'));
  assert.ok(ids.includes('nearhere-parks'));
  assert.ok(ids.includes('nearhere-minor-roads'));
  assert.ok(ids.includes('nearhere-city-labels'));

  for (const layer of style.layers) {
    if (layer.type !== 'background') {
      assert.ok(style.sources[layer.source], `${layer.id} references a missing source`);
      assert.ok(layer['source-layer'], `${layer.id} needs a vector source-layer`);
    }
  }

  const errors = validateStyleMin(style);
  assert.deepEqual(errors, [], errors.map((error) => error.message).join('\n'));
});
