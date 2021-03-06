import L from 'leaflet';

import { getEditorContent } from '../editor/editor';
import { map } from '../map/map';
import { getScreenshotData } from '../map/screenshot';
import { createThumbnail } from '../tools/thumbnail';

import store from '../store';
import config from '../config';

const THUMBNAIL_WIDTH = 144;
const THUMBNAIL_HEIGHT = 81;

// We only need the user-id for the API (plus, I assume, cookie credentials).
// This is for retrieving just the user ID from Redux store. Maybe this goes
// elsewhere eventually.
function getUserId() {
  return store.getState().user.id;
}

// wrap fetch to make it work both locally and stuff
function makeMapzenAPIRequest(path, options = {}) {
  const apiPath = config.MAPZEN_API.SCENE_API_PATH;
  const mergeOptions = {
    ...options,
    credentials: 'same-origin',
  };

  let baseUrl;

  // use hostname to determine environment
  // (should we use process.env.NODE_ENV for this?)
  switch (window.location.hostname) {
    case 'localhost':
      baseUrl = config.MAPZEN_API.ORIGIN.DEVELOPMENT;
      mergeOptions.credentials = 'include';
      break;
    case 'dev.mapzen.com':
      baseUrl = config.MAPZEN_API.ORIGIN.STAGING;
      break;
    default:
      baseUrl = config.MAPZEN_API.ORIGIN.PRODUCTION;
  }

  // Return wrapped fetch. This also wraps the part that checks if response
  // is OK and throws an error or returns JSON.
  return window.fetch(`${baseUrl}${apiPath}${path}`, mergeOptions)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.status);
      }

      return response.json();
    });
}

/**
 * Create a thumbnail image of the current map scene as a Data-URI (which is
 * currently the format accepted by the Mapzen scene API).
 *
 * @returns {Promise} - fulfilled with the screenshot as a Data-URI.
 */
function makeThumbnail() {
  // Grab a screenshot from the map and convert it to a thumbnail at a fixed
  // dimension. This makes file sizes and layout more predictable.
  return getScreenshotData()
    // At this size, thumbnail image should clock in at around ~90kb
    // to ~120kb (unoptimized, but that's the limitations of our
    // thumbnail function)
    .then(screenshot =>
      createThumbnail(screenshot.blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, true, false));
}

/**
 * Replaces a thumbnail image.
 * TODO: refactor
 */
export function replaceThumbnail(sceneId) {
  return makeThumbnail()
    .then((screenshotData) => {
      const userId = getUserId();
      const requestOptions = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thumbnail: screenshotData,
        }),
      };

      return makeMapzenAPIRequest(`${userId}/${sceneId}`, requestOptions);
    });
}

/**
 * Creates additional metadata information about the current scene.
 *
 * @params {Object} data - data passed to saveToMapzenUserAccount()
 * @returns {Object} metadata - additional metadata for the Scene API
 */
function addMetadata(data) {
  // Add some additional view information to the metadata.
  const mapLabel = store.getState().map.label;
  const metadata = Object.assign({}, data, {
    view_label: mapLabel || '',
    view_lat: map.getCenter().lat,
    view_lng: map.getCenter().lng,
    view_zoom: map.getZoom(),
    versions_leaflet: L.version,
    versions_tangram: window.Tangram.version,
  });

  return metadata;
}

/**
 * Retrieve scene list from Mapzen scene API. Returns a Promise, resolved with
 * its contents in the form of an Array. This array is empty if there are no
 * scenes saved.
 *
 * @returns {Promise} - resolved with an array of saved scene data (or empty
 *          array if nothing is saved yet)
 */
export function fetchSceneList() {
  const userId = getUserId();

  return makeMapzenAPIRequest(userId)
    .then((scenes) => {
      // API gives an object with error property if an error occurred.
      if (scenes.error) {
        throw new Error(scenes.error);
      }

      // Returns with array of scenes (or empty array if no scenes).
      return scenes;
    });
}

export function putFile(content, location, contentType = 'text/x-yaml') {
  return window.fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: content,
    credentials: 'include',
  });
}

export function saveToMapzenUserAccount(data) {
  const userId = getUserId();

  // Add other data - here, or provided upstream?
  const metadata = addMetadata(data);

  // This is a single YAML file for now - whatever's in the current editor.
  // TODO: get only root scene file
  const content = getEditorContent();

  // POST a new scene.
  return makeThumbnail()
    .then((screenshotData) => {
      // Add thumbnail as data-URI to payload
      metadata.thumbnail = screenshotData;

      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      };

      return makeMapzenAPIRequest(`${userId}`, requestOptions);
    })
    // The returned `sceneData` will contain the `id` and
    // `resources_url` needed to POST each of our scene resources.
    // temp: to deal with this not needing url concatenation
    .then(sceneData => putFile(content, sceneData.entrypoint_url)
      .then((response) => {
        // There may be errors
        if (!response.ok) {
          const message = `There was a problem saving your scene. Error code ${response.status}`;
          throw new Error(message);
        }

        // Return original scene data to success handler.
        return sceneData;
      }));
}

export function deleteScene(sceneId) {
  // DELETE scenes/:developer_id/:scene_id
  const userId = getUserId();
  return makeMapzenAPIRequest(`${userId}/${sceneId}`, { method: 'DELETE' });
}
