'use strict';

import { map } from 'app/TangramPlay';
import Modal from 'app/addons/ui/Modal';

let buttonEl;

function init () {
    const geolocator = window.navigator.geolocation;

    // Cache a reference to the element
    buttonEl = document.getElementById('tp-geolocator');

    // Hide the geolocator button if geolocation is not supported on the browser
    if (!geolocator) {
        buttonEl.style.display = 'none';
    }
    // If enabled, attach an event listener to it
    else {
        buttonEl.addEventListener('click', (e) => {
            if (buttonEl.classList.contains('tp-geolocator-active')) {
                return false;
            }
            buttonEl.classList.add('tp-geolocator-active');
            getCurrentLocation(onGeolocateSuccess, onGeolocateError);
        });
    }
}

function getCurrentLocation (success, error) {
    const geolocator = window.navigator.geolocation;
    const options = {
        enableHighAccuracy: true,
        maximumAge: 10000,
    };

    // Fixes an infinite loop bug with Safari
    // https://stackoverflow.com/questions/27150465/geolocation-api-in-safari-8-and-7-1-keeps-asking-permission/28436277#28436277
    window.setTimeout(() => {
        geolocator.getCurrentPosition(success, error, options);
    }, 0);
}

function onGeolocateSuccess (position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    // Zoom in a bit only if user's view is very zoomed out
    let zoom = (map.getZoom() < 16) ? 16 : map.getZoom();

    map.setView([latitude, longitude], zoom);
    resetGeolocateButton();
}

function onGeolocateError (err) {
    console.log(err);
    const modal = new Modal('Unable to retrieve current position. Geolocation may be disabled on this browser or unavailable on this system.');
    modal.show();
    resetGeolocateButton();
}

function resetGeolocateButton () {
    buttonEl.classList.remove('tp-geolocator-active');
}

let geolocator = {
    init
}

export default geolocator;
