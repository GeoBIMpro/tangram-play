import { assert } from 'chai';
import {
  YAML_SCALAR,
  YAML_MAPPING,
  // YAML_MAP,
  YAML_SEQUENCE,
  YAML_ANCHOR_REF,
  ParsedYAMLDocument,
  getScalarNodesInRange,
  getKeyAddressForNode,
  getKeyNameForNode,
  getNodeLevel,
} from '../src/js/editor/yaml-ast';

const TEST_DOCUMENT = `
import:
    - components/globals.yaml
    - styles/common.yaml
    - layers/water.yaml

sources:
    mapzen:
        type: TopoJSON
        url: https://tile.mapzen.com/mapzen/vector/v1/all/{z}/{x}/{y}.topojson

layers:
    earth:
        # Comment line
        data: { source: mapzen }
        draw:
            polygons:
                order: 0
                color: &color grey
    water:
        data: { source: mapzen }
        draw:
            polygons:
                order: 1
                color: *color
`;

let parsed;

describe('YAML abstract syntax tree parser', () => {
  it('parses a document', () => {
    const doc = new ParsedYAMLDocument(TEST_DOCUMENT);
    parsed = doc;
    assert.isOk(parsed.nodes);
  });

  describe('getNodeAtIndex()', () => {
    it('returns a mapping node', () => {
      const node = parsed.getNodeAtIndex(1);
      assert.equal(node.kind, YAML_MAPPING);
    });

    it('returns a sequence node', () => {
      const node = parsed.getNodeAtIndex(13);
      assert.equal(node.kind, YAML_SEQUENCE);
    });

    it('returns a scalar node of a mapping parent node', () => {
      const node = parsed.getNodeAtIndex(200);
      assert.equal(node.kind, YAML_SCALAR);
      assert.equal(node.parent.kind, YAML_MAPPING);
    });

    it('returns a scalar node of a sequence parent node', () => {
      const node = parsed.getNodeAtIndex(50);
      assert.equal(node.kind, YAML_SCALAR);
      assert.equal(node.parent.kind, YAML_SEQUENCE);
    });

    it('returns an anchor reference node', () => {
      const node = parsed.getNodeAtIndex(517);
      assert.equal(node.kind, YAML_ANCHOR_REF);
    });

    it('returns null if index does not correspond to a node', () => {
      const node = parsed.getNodeAtIndex(0);
      assert.isNull(node);
    });

    it('returns null if index is out of bounds', () => {
      const node = parsed.getNodeAtIndex(9999);
      assert.isNull(node);
    });
  });

  describe('getNodeAtKeyAddress()', () => {
    it('returns the mapping node for an address whose value is scalar', () => {
      const node = parsed.getNodeAtKeyAddress('sources:mapzen:url');
      assert.equal(node.kind, YAML_MAPPING);
      assert.equal(node.key.value, 'url');
    });

    it('returns the mapping node for an address whose value is another map', () => {
      const node = parsed.getNodeAtKeyAddress('layers:earth');
      assert.equal(node.kind, YAML_MAPPING);
      assert.equal(node.key.value, 'earth');
    });

    it('returns the mapping node for an address whose value is a sequence', () => {
      const node = parsed.getNodeAtKeyAddress('import');
      assert.equal(node.kind, YAML_MAPPING);
      assert.equal(node.key.value, 'import');
    });

    it('returns null for an address that cannot be found', () => {
      const node = parsed.getNodeAtKeyAddress('foo:bar');
      assert.isNull(node);
    });

    it('returns null for an address that partially matches the structure but cannot be found', () => {
      const node = parsed.getNodeAtKeyAddress('layers:foo');
      assert.isNull(node);
    });
  });

  describe('getScalarNodesInRange()', () => {
    it('returns all scalar nodes in document', () => {
      const nodes = getScalarNodesInRange(parsed.nodes, 0, parsed.nodes.endPosition);
      assert.equal(nodes.length, 10);
    });

    it('returns all scalar nodes in document (including anchor references)', () => {
      const nodes = getScalarNodesInRange(parsed.nodes, 0, parsed.nodes.endPosition, true);
      assert.equal(nodes.length, 11);
    });

    it('returns a node that overlaps the start of the range', () => {
      const start = 130;
      const nodes = getScalarNodesInRange(parsed.nodes, start, parsed.nodes.endPosition);
      assert.equal(nodes[0].value, 'TopoJSON');
      assert.isBelow(nodes[0].startPosition, start);
      assert.isAbove(nodes[0].endPosition, start);
    });

    it('returns a node that overlaps the end of the range', () => {
      const end = 130;
      const nodes = getScalarNodesInRange(parsed.nodes, 0, end);
      const last = nodes.length - 1;
      assert.equal(nodes[last].value, 'TopoJSON');
      assert.isBelow(nodes[last].startPosition, end);
      assert.isAbove(nodes[last].endPosition, end);
    });

    it('returns a node that overlaps both the start and end of the range', () => {
      const start = 129;
      const end = 130;
      const nodes = getScalarNodesInRange(parsed.nodes, start, end);
      assert.equal(nodes[0].value, 'TopoJSON');
      assert.isBelow(nodes[0].startPosition, start);
      assert.isAbove(nodes[0].endPosition, end);
    });

    it('does not return nodes before the range', () => {
      const start = 250;
      const nodes = getScalarNodesInRange(parsed.nodes, start, parsed.nodes.endPosition);
      assert.isAbove(nodes.length, 0); // Maks sure there are nodes to test
      nodes.forEach((node) => {
        assert.isAbove(node.endPosition, start);
      });
    });

    it('does not return nodes after the range', () => {
      const end = 250;
      const nodes = getScalarNodesInRange(parsed.nodes, 0, end);
      assert.isAbove(nodes.length, 0); // Maks sure there are nodes to test
      nodes.forEach((node) => {
        assert.isBelow(node.startPosition, end);
      });
    });

    it('includes scalar nodes that are children of sequences', () => {
      const nodes = getScalarNodesInRange(parsed.nodes, 0, 90);
      assert.equal(nodes[0].parent.kind, YAML_SEQUENCE);
      assert.equal(nodes[1].parent.kind, YAML_SEQUENCE);
      assert.equal(nodes[2].parent.kind, YAML_SEQUENCE);
      assert.equal(nodes[0].value, 'components/globals.yaml');
      assert.equal(nodes[1].value, 'styles/common.yaml');
      assert.equal(nodes[2].value, 'layers/water.yaml');
    });

    it('returns nodes when the range straddles branches of the syntax tree', () => {
      const start = 133;
      const end = 286;
      const nodes = getScalarNodesInRange(parsed.nodes, start, end);
      assert.equal(nodes[0].value, 'https://tile.mapzen.com/mapzen/vector/v1/all/{z}/{x}/{y}.topojson');
      assert.equal(nodes[1].value, 'mapzen');
    });

    it('returns an empty array if no nodes are found', () => {
      const nodes = getScalarNodesInRange(parsed.nodes, 0, 1);
      assert.isArray(nodes);
      assert.equal(nodes.length, 0);
    });

    it('returns an empty array if a null node is passed in', () => {
      const nodes = getScalarNodesInRange(null, 0, 1000);
      assert.isArray(nodes);
      assert.equal(nodes.length, 0);
    });

    it('returns an empty array if range is out of bounds', () => {
      const start = parsed.nodes.endPosition + 100;
      const end = parsed.nodes.endPosition + 300;
      const nodes = getScalarNodesInRange(parsed.nodes, start, end);
      assert.isArray(nodes);
      assert.equal(nodes.length, 0);
    });

    it.skip('does not include duplicate child nodes of anchor reference nodes');
  });

  describe('getKeyAddressForNode()', () => {
    it('returns an empty string for a top-level node', () => {
      const address = getKeyAddressForNode(parsed.nodes);
      assert.equal(address, '');
    });

    it('returns the address for a node of type "mapping"', () => {
      const node = parsed.nodes.mappings[1].value.mappings[0].value.mappings[1];
      const address = getKeyAddressForNode(node);
      assert.equal(address, 'sources:mapzen:url');
    });

    it('returns the address for a node of type "scalar"', () => {
      const node = parsed.nodes.mappings[1].value.mappings[0].value.mappings[1].value;
      const address = getKeyAddressForNode(node);
      assert.equal(address, 'sources:mapzen:url');
    });

    it('returns an empty string if passed in a null value', () => {
      const address = getKeyAddressForNode(null);
      assert.equal(address, '');
    });
  });

  describe('getKeyNameForNode()', () => {
    it('returns null for a top-level node', () => {
      const address = getKeyNameForNode(parsed.nodes);
      assert.equal(address, null);
    });

    it('returns the key name for a node of type "mapping"', () => {
      const node = parsed.nodes.mappings[1].value.mappings[0].value.mappings[1];
      const address = getKeyNameForNode(node);
      assert.equal(address, 'url');
    });

    it('returns the key name for a node of type "scalar"', () => {
      const node = parsed.nodes.mappings[1].value.mappings[0].value.mappings[1].value;
      const address = getKeyNameForNode(node);
      assert.equal(address, 'url');
    });

    it('returns the key name for a node in a sequence', () => {
      const node = parsed.getNodeAtIndex(50);
      const address = getKeyNameForNode(node);
      assert.equal(address, 'import');
    });

    it('returns null if passed in a null value', () => {
      const address = getKeyNameForNode(null);
      assert.equal(address, null);
    });
  });

  describe('getNodeLevel()', () => {
    it('returns null for a blank line', () => {
      const node = parsed.getNodeAtIndex(212);
      const level = getNodeLevel(node);
      assert.equal(level, null);
    });

    it('returns 0 for a top-level block', () => {
      const node = parsed.getNodeAtKeyAddress('sources');
      const level = getNodeLevel(node);
      assert.equal(level, 0);
    });

    it('returns 0 for the character at the beginning of a top-level block following another nested block', () => {
      const node = parsed.getNodeAtIndex(213);
      const level = getNodeLevel(node);
      assert.equal(level, 0);
    });

    it('returns the correct level for a nested block', () => {
      const node = parsed.getNodeAtIndex(263);
      const level = getNodeLevel(node);
      assert.equal(level, 2);
    });

    it('returns the correct level for an inline block', () => {
      const node = parsed.getNodeAtIndex(271);
      const level = getNodeLevel(node);
      assert.equal(level, 3);
    });

    it('does not increment level inside a sequence', () => {
      const node = parsed.getNodeAtIndex(20);
      const level = getNodeLevel(node);
      assert.equal(level, 0);
    });
  });
});
