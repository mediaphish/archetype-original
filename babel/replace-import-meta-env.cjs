/**
 * Jest/Babel only: map Vite's import.meta.env.* to process.env.* so DOM tests parse.
 */

module.exports = function replaceImportMetaEnv(babel) {
  const { types: t } = babel;

  return {
    name: 'replace-import-meta-env',
    visitor: {
      BinaryExpression(path) {
        const { node } = path;
        if (node.operator !== '!==' || !t.isLiteral(node.right)) return;
        if (node.right.value !== 'undefined') return;
        const left = node.left;
        if (!t.isUnaryExpression(left)) return;
        if (left.operator !== 'typeof') return;
        if (!t.isMetaProperty(left.argument)) return;
        if (left.argument.meta.name !== 'import' || left.argument.property.name !== 'meta') return;
        path.replaceWith(t.booleanLiteral(true));
      },
      OptionalMemberExpression(path) {
        const { node } = path;
        if (!t.isIdentifier(node.property)) return;
        if (!node.optional) return;
        if (!isImportMetaEnvObject(node.object)) return;
        path.replaceWith(t.optionalMemberExpression(
          t.memberExpression(t.identifier('process'), t.identifier('env')),
          node.property,
          true,
        ));
      },
      MemberExpression(path) {
        const { node } = path;
        if (!t.isIdentifier(node.property)) return;
        if (!isImportMetaEnvObject(node.object)) return;
        path.replaceWith(t.memberExpression(
          t.memberExpression(t.identifier('process'), t.identifier('env')),
          node.property,
          false,
        ));
      },
    },
  };

  function isImportMetaEnvObject(objectNode) {
    if (!objectNode || !t.isMemberExpression(objectNode)) return false;
    if (!objectNode.property || objectNode.property.name !== 'env') return false;
    const obj = objectNode.object;
    if (!t.isMetaProperty(obj)) return false;
    return obj.meta.name === 'import' && obj.property.name === 'meta';
  }
};
