// .cjs on purpose. package.json sets "type": "module", so a babel.config.js is
// an ES module, and Babel can only load an ESM config synchronously on Node 22+
// where require(esm) is enabled by default. On Node 18 — the version in .nvmrc
// and in every GitHub workflow — jest failed to start at all, every suite,
// with "You appear to be using a native ECMAScript module configuration file".
// The suite only ever ran because local Node happened to be newer.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: ['./babel/replace-import-meta-env.cjs'],
};
