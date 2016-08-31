import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import Panel from 'react-bootstrap/lib/Panel';
import ButtonGroup from 'react-bootstrap/lib/ButtonGroup';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import Tooltip from 'react-bootstrap/lib/Tooltip';
import Icon from './Icon';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import Col from 'react-bootstrap/lib/Col';

import { editor } from '../editor/editor';
import Draggable from 'react-draggable';

import TANGRAM from '../tangram-docs.json';

/**
 * Represents the main map panel that user can toggle in and out of the leaflet
 * map.
 */
export default class DocsPanel extends React.Component {
    /**
     * Used to setup the state of the component. Regular ES6 classes do not
     * automatically bind 'this' to the instance, therefore this is the best
     * place to bind event handlers
     *
     * @param props - parameters passed from the parent
     */
    constructor (props) {
        super(props);

        const INITIAL_HEIGHT = 400;
        this.MIN_HEIGHT = 50;

        this.state = {
            open: true, // Whether panel should be open or not
            display: '{}',
            height: INITIAL_HEIGHT
        };

        this.lastSavedHeight = INITIAL_HEIGHT;

        this.openPanel = this.openPanel.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.closePanel = this.closePanel.bind(this);
    }

    /**
     * This needs to be called by the parent component after it has
     * mounted, since it relies on the editor being present and ready
     */
    init () {
        const wrapper = editor.getWrapperElement();

        wrapper.addEventListener('mouseup', (event) => {
            // bail out if we were doing a selection and not a click
            if (editor.somethingSelected()) {
                return;
            }

            let cursor = editor.getCursor(true);

            let line = editor.lineInfo(cursor.line);
            let nodes = line.handle.stateAfter.nodes;
            let address;

            if (nodes.length === 1) {
                address = nodes[0].address;
                this.setState({ display: this.findMatch(address, true) });
            }
            else {
                console.log('line has more than one node');
            }
        });
    }

    /**
     * Toggle the panel so it is visible or not visible
     */
    openPanel () {
        this.setState({ height: this.lastSavedHeight });
    }

    closePanel () {
        this.lastSavedHeight = this.state.height;

        this.setState({ height: 0 });
    }

    onDrag (e, ui) {
        let delta = this.state.height - (ui.y);

        if (delta < this.MIN_HEIGHT) {
            delta = this.MIN_HEIGHT;
        }

        this.setState({ height: delta });
    }

    findMatch (address, optionalBool) {
        let currentTree = TANGRAM.keys; // Initializes to the tree at level 0
        // console.log(address);
        let split = address.split(':');

        let partialAddress;
        let currentNode;
        let currentParent;
        for (let i = 0; i < split.length; i++) {
            if (currentNode !== undefined) {
                currentParent = currentNode;
            }

            // Construct a partial address for each child in the tree
            if (i === 0) {
                partialAddress = split[0];
            }
            else {
                partialAddress = partialAddress + ':' + split[i];
            }

            // Find a match of that address within our docs JSON
            for (let node of currentTree) {
                let found = partialAddress.match(node.address);

                if (found !== null) {
                    currentNode = node;
                    currentTree = node.children;
                    break;
                }
            }
        }

        // Adding parent node
        if (currentParent !== undefined) {
            currentNode.parent = { name: currentParent.name, description: currentParent.description, example: currentParent.example };
        }

        // Adding original address searched (not the regex)
        if (optionalBool) {
            currentNode.originalAddress = address;
        }

        return JSON.stringify(currentNode);
    }

    onClickChild (address) {
        this.setState({ display: this.findMatch(address, false) });
    }

    renderChildren (node) {
        let list;

        if (node.children !== undefined) {
            list = node.children.map((value, i) => {
                return (
                    <Row key={i} className='child-row'>
                        <Row>
                            <Col sm={2} className='capitalize'>name:</Col>
                            <Col sm={10} onClick={this.onClickChild.bind(this, value.example)} className='docs-link'><code>{value.name}</code></Col>
                        </Row>
                        <Row>
                            <Col sm={2} className='capitalize'>description:</Col>
                            <Col sm={10}><code>{value.description}</code></Col>
                        </Row>
                    </Row>
                );
            });
        }
        else {
            list = null;
        }

        return list;
    }

    renderParent (node) {
        const parent = node.parent;

        const list = (
            <Row className='child-row'>
                <Row>
                    <Col sm={2} className='capitalize'>name:</Col>
                    <Col sm={10} onClick={this.onClickChild.bind(this, parent.example)} className='docs-link'><code>{parent.name}</code></Col>
                </Row>
                <Row>
                    <Col sm={2} className='capitalize'>description:</Col>
                    <Col sm={10}><code>{parent.description}</code></Col>
                </Row>
            </Row>
        );

        return list;
    }

    /**
     * Official React lifecycle method
     * Called every time state or props are changed
     */
    render () {
        var divStyle = {
            height: this.state.height + 'px'
        };

        let result = JSON.parse(this.state.display);

        return (
            <div className='docs-panel'>
                {/* Toggle docs panel to show it*/}
                <OverlayTrigger rootClose placement='top' overlay={<Tooltip id='tooltip'>{'Open docs toolbar'}</Tooltip>}>
                    <Button onClick={this.openPanel} className='docs-panel-button-show'>
                        <Icon type={'bt-caret-up'} />
                    </Button>
                </OverlayTrigger>

                {/* Docs panel */}
                <Draggable axis='y' onDrag={this.onDrag} handle='.docs-divider'>
                    <Panel className='docs-panel-collapsible' style={divStyle}>
                        <div className='docs-divider'><span className='docs-divider-affordance'></span></div>

                        <div className='docs-panel-toolbar' >
                            {/* Text within the docs panel */}
                            <div className='docs-panel-toolbar-content'>
                                <Grid>
                                    {(() => {
                                        const list = Object.keys(result).map((value, i) => {
                                            if (value === 'children') {
                                                return (
                                                    <Row key={i} className='toolbar-content-row'>
                                                        <Col sm={2} className='capitalize'>{value}:</Col>
                                                        <Col sm={10}>{this.renderChildren(result)}</Col>
                                                    </Row>
                                                );
                                            }
                                            else if (value === 'parent') {
                                                return (
                                                    <Row key={i} className='toolbar-content-row'>
                                                        <Col sm={2} className='capitalize'>{value}:</Col>
                                                        <Col sm={10}>{this.renderParent(result)}</Col>
                                                    </Row>
                                                );
                                            }
                                            else {
                                                return (
                                                    <Row key={i} className='toolbar-content-row'>
                                                        <Col sm={2} className='capitalize'>{value}:</Col>
                                                        <Col sm={10}><code>{result[value]}</code></Col>
                                                    </Row>
                                                );
                                            }
                                        });

                                        return list;
                                    })()}
                                </Grid>
                            </div>

                            {/* Toggle docs panel to hide it*/}
                            <ButtonGroup className='docs-panel-toolbar-toggle'>
                                <OverlayTrigger rootClose placement='top' overlay={<Tooltip id='tooltip'>{'Close docs toolbar'}</Tooltip>}>
                                    <Button onClick={this.closePanel}> <Icon type={'bt-caret-down'} /> </Button>
                                </OverlayTrigger>
                            </ButtonGroup>

                        </div>
                    </Panel>
                </Draggable>
            </div>
        );
    }
}
