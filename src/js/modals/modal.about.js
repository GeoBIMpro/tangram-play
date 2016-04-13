import Modal from './modal';
import CodeMirror from 'codemirror';

let modalEl;

class AboutModal extends Modal {
    constructor () {
        super();
        this.el = modalEl = document.body.querySelector('.about-modal');

        // Get and display version numbers.
        // Tangram version comes with its own "v"
        modalEl.querySelector('.about-tangram-version').textContent = window.Tangram.version;
        // Add "v" for Leaflet and CodeMirror
        modalEl.querySelector('.about-leaflet-version').textContent = `v${window.L.version}`;
        modalEl.querySelector('.about-cm-version').textContent = `v${CodeMirror.version}`;
    }
}

export const aboutModal = new AboutModal();