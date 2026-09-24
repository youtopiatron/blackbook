const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const TOWNS_DIR = path.join(__dirname, "towns");

const TIER_CUTOFFS = [
  { max: 24, tier: "clear" },
  { max: 44, tier: "guarded" },
  { max: 64, tier: "elevated" },
  { max: 79, tier: "high" },
  { max: 101, tier: "severe" },
];

function tierFromScore(score) {
  return TIER_CUTOFFS.find((t) => score <= t.max).tier;
}

function confidenceFromSourceCount(n) {
  if (n >= 6) return "high";
  if (n >= 3) return "moderate";
  return "low";
}

module.exports = () => {
  const files = fs.readdirSync(TOWNS_DIR).filter((f) => /\.ya?ml$/.test(f));
  const towns = {};

  files.forEach((f) => {
    const slug = f.replace(/\.ya?ml$/, "");
    const raw = yaml.load(fs.readFileSync(path.join(TOWNS_DIR, f), "utf8"));
    const criteria = raw.criteria || [];
    const wSum = criteria.reduce((s, c) => s + c.weight, 0);
    const vSum = criteria.reduce((s, c) => s + c.weight * c.score, 0);
    const raw_score = wSum ? Math.round((vSum / (wSum * 5)) * 100) : null;

    const sourceIds = new Set();
    criteria.forEach((c) => (c.source_ids || []).forEach((id) => sourceIds.add(id)));

    towns[slug] = {
      ...raw,
      slug,
      raw_score,
      n_sources: sourceIds.size,
      confidence: confidenceFromSourceCount(sourceIds.size),
    };
  });

  // group by density_tier + region for peer-relative percentile
  const groups = {};
  Object.values(towns).forEach((t) => {
    if (t.raw_score === null) return;
    const key = `${t.density_tier}::${t.region}`;
    (groups[key] = groups[key] || []).push(t.raw_score);
  });

  Object.values(towns).forEach((t) => {
    if (t.raw_score === null) return;
    const key = `${t.density_tier}::${t.region}`;
    const peers = groups[key];
    t.peer_group_size = peers.length;

    if (peers.length >= 3) {
      const worseOrEqual = peers.filter((s) => s <= t.raw_score).length;
      t.peer_percentile = +(worseOrEqual / peers.length).toFixed(2);
      t.tier =
        t.peer_percentile >= 0.9 ? "severe" :
        t.peer_percentile >= 0.75 ? "high" :
        t.peer_percentile >= 0.5 ? "elevated" :
        t.peer_percentile >= 0.25 ? "guarded" : "clear";
      t.tier_basis = "peer-relative";
    } else {
      t.peer_percentile = null;
      t.tier = tierFromScore(t.raw_score);
      t.tier_basis = "absolute (insufficient peer data)";
    }
  });

  return towns;
};