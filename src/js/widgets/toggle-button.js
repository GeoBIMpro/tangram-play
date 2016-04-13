import Widget from './widget.js';

export default class ToggleButton extends Widget {
    createEl (key) {
        const id = 'toggle-' + key.address;
        const el = document.createElement('div');
        el.className = 'widget';

        const inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        inputEl.className = 'widget-toggle';
        inputEl.id = id;
        inputEl.checked = (this.node.value === 'true') ? true : false;

        inputEl.addEventListener('change', (event) => {
            this.setEditorValue((inputEl.checked) ? 'true' : 'false');
        });

        const labelEl = document.createElement('label');
        labelEl.htmlFor = id;

        el.appendChild(inputEl);
        el.appendChild(labelEl);

        return el;
    }
}