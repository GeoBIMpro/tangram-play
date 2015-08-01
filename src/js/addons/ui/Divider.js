'use strict';

import TangramPlay from '../../TangramPlay.js';

// Import Greensock (GSAP)
import 'gsap/src/uncompressed/Tweenlite.js';
import 'gsap/src/uncompressed/plugins/CSSPlugin.js';
import Draggable from 'gsap/src/uncompressed/utils/Draggable.js';

const CM_MINIMUM_WIDTH = 160; // integer, in pixels
const LOCAL_STORAGE_PREFIX = 'tangram-play-';

export default class Divider {
    constructor(dividerId) {
        let transformStyle = 'translate3d(' + getStartingPosition() + 'px, 0px, 0px)';

        this.el = document.getElementById(dividerId);

        if (this.el.style.hasOwnProperty('transform')) {
            this.el.style.transform = transformStyle;
        }
        else if (this.el.style.hasOwnProperty('webkitTransform')) {
            // For Safari
            this.el.style.webkitTransform = transformStyle;
        }
        else {
            // For Firefox
            this.el.style.transform = transformStyle;
        }

        let divider = this;
        this.draggable = Draggable.create(this.el, {
            type: 'x',
            bounds: getBounds(),
            cursor: 'col-resize',
            zIndexBoost: false,
            onPress: function () {
                this.target.classList.add('tp-divider-is-dragging');
            },
            onDrag: function () {
                divider.reflow();
            },
            onDragEnd: function () {
                divider.update();
                divider.savePosition();
            },
            onRelease: function () {
                this.target.classList.remove('tp-divider-is-dragging');
            }
        });

        window.addEventListener('resize', function() {
            divider.reflow();
            divider.update();
        });

        this.reflow();

        // Create Events
        this.onResize = new CustomEvent('resize');
    }

    reflow() {
        let mapEl = document.getElementById('map');
        let contentEl = document.getElementById('content');
        let menuEl = document.querySelector('.tp-menu-container');
        let menuBottom = menuEl.getBoundingClientRect().bottom;
        let positionX = this.el.getBoundingClientRect().left;

        mapEl.style.width = positionX + 'px';
        contentEl.style.width = (window.innerWidth - positionX) + 'px';

        TangramPlay.editor.setSize('100%', (window.innerHeight - menuBottom) + 'px');
        this.el.style.height = (window.innerHeight - menuBottom) + 'px';
    }

    update() {
        TangramPlay.map.leaflet.invalidateSize(false);
        this.draggable[0].applyBounds(getBounds());

        // Trigger Events 
        TangramPlay.container.dispatchEvent(this.onResize);
    }

    savePosition() {
        let posX = this.el.getBoundingClientRect().left;
        if (posX) {
            window.localStorage.setItem(LOCAL_STORAGE_PREFIX + 'divider-position-x', posX);
        }
    }
}

// Private functions for dragable panel divider

function getStartingPosition() {
    let storedPosition = window.localStorage.getItem(LOCAL_STORAGE_PREFIX + 'divider-position-x');
    if (storedPosition) {
        return storedPosition;
    }

    if (window.innerWidth > 1024) {
        return Math.floor(window.innerWidth * 0.6);
    }
    else {
        return Math.floor(window.innerWidth / 2);
    }
}

function getBounds() {
    return {
        minX: 100,
        maxX: window.innerWidth - CM_MINIMUM_WIDTH
    };
}
