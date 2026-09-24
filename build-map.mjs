import * as d3geo from 'd3-geo';
import * as topojson from 'topojson-client';
import * as tsimplify from 'topojson-simplify';
import fs from 'fs';

// counties-albers-10m.json is ALREADY projected — do NOT pass a projection here
const topology = JSON.parse(fs.readFileSync('./counties-albers-10m.json'));

let simplified = tsimplify.presimplify(topology);
simplified = tsimplify.simplify(simplified, 0.6);

const countiesFC = topojson.feature(simplified, simplified.objects.counties);
const statesMesh = topojson.mesh(simplified, simplified.objects.states, (a, b) => a !== b);

const path = d3geo.geoPath();   // <-- no projection argument, coords are already in pixel space
path.digits(1);

let svgParts = [`<g class="counties">`];
for (const f of countiesFC.features) {
  const d = path(f);
  if (!d) continue;
  svgParts.push(`<path class="county" data-id="${f.id}" data-name="${(f.properties && f.properties.name) || ''}" d="${d}"/>`);
}
svgParts.push(`</g>`);
svgParts.push(`<path class="state-border" d="${path(statesMesh)}"/>`);

const [x0, y0, x1, y1] = topology.bbox;
const svg = `<svg viewBox="${Math.floor(x0)} ${Math.floor(y0)} ${Math.ceil(x1 - x0)} ${Math.ceil(y1 - y0)}" xmlns="http://www.w3.org/2000/svg">\n${svgParts.join('\n')}\n</svg>`;

fs.writeFileSync('./us-counties-base.svg', svg);
console.log('wrote us-counties-base.svg,', svg.length, 'bytes');