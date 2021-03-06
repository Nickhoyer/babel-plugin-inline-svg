const { extname, dirname } = require("path");
const { readFileSync } = require("fs");
const template = require("@babel/template");
const resolveFrom = require("resolve-from");

const optimise = require("./optimise");
const buildOutput = template.smart`
  var SVG_NAME = SVG_CODE;
`;

let ignoreRegex;

module.exports = ({ types: t }) => ({
  visitor: {
    ImportDeclaration(path, state) {
      const { ignorePattern, optimise: shouldOptimise = true } = state.opts;
      if (ignorePattern) {
        // Only set the ignoreRegex once:
        ignoreRegex = ignoreRegex || new RegExp(ignorePattern);
        // Test if we should ignore this:
        if (ignoreRegex.test(path.node.source.value)) {
          return;
        }
      }
      // This plugin only applies for SVGs:
      if (extname(path.node.source.value) === ".svg") {
        // We only support the import default specifier, so let's use that identifier:
        const importIdentifier = path.node.specifiers[0].local;
        const iconPath = state.file.opts.filename;
        const svgPath = resolveFrom(dirname(iconPath), path.node.source.value);
        const rawSource = readFileSync(svgPath, "utf8");
        const varName = importIdentifier.name;

        const finalSource = shouldOptimise
          ? optimise(varName, rawSource, state.opts.svgo)
          : rawSource;

        const svgReplacement = buildOutput({
          SVG_NAME: importIdentifier,
          SVG_CODE: t.stringLiteral(finalSource),
        });

        path.replaceWith(svgReplacement);
      }
    },
  },
});
