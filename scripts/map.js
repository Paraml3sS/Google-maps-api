$(document).ready(function () {
    const $mapSelector = $('#map');
    const map = initMap($mapSelector.get(0));
    let mapObjects = [];

    generateMapComponents();

    const $zoomMapInput = $('#zoomMapInput');
    const $centerMapInput = $('#centerMapInput');
    const $polygonFromFileBtn = $('#polygonFromFileBtn');
    const $triangulatedPolygon = $('#triangulatedPolygonFromFileBtn');
    const $triangulateBtn = $('#triangulateBtn');
    const $dualGraphBtn = $('#dualGraphBtn');
    const $resetMapBtn = $('#resetMapBtn');
    const $coordInputsContainer = $('#coordInputs');

    $zoomMapInput.on('keyup', setZoomLevel);
    $centerMapInput.on('keyup', setMapCenter);
    $polygonFromFileBtn.on('click', showPolygonFromFile);
    $triangulatedPolygon.on('click', showTriangulatedPolygonFromFile);
    $triangulateBtn.on('click', triangulate);
    $dualGraphBtn.on('click', showGraph);
    $resetMapBtn.on('click', resetMap);
    $coordInputsContainer.on('input', 'input', constructDynamicPolygon);
    $coordInputsContainer.on('click', 'input', handleNewInputs);
    $coordInputsContainer.on('dblclick', 'input', handleDeleteInput);
    map.addListener('click', showInfoMarker);


    initDefaultValues();

    // drawCircle();
    // createPyramid();

    // On event functions
    function handleNewInputs() {
        let input = $(this);

        if (input.hasClass('not-active')) {
            input.removeClass('not-active');

            let newInput = generateCoordInput();
            $coordInputsContainer.append(newInput);
        }
    }

    function handleDeleteInput() {
        $(this).remove();
    }

    function constructDynamicPolygon() {
        deleteMapObj('DynamicPolygon');

        let $coordInputs = $coordInputsContainer.find('.coord-input');

        let coordinates = [];

        $coordInputs.each(function () {
            if (!$(this).hasClass('not-active')) {
                let coordinate = getInputCoordinates(this);
                coordinates.push(coordinate);
            }
        });

        createPolygonObj(coordinates, 'DynamicPolygon');
    }

    function setZoomLevel() {
        let val = parseInt($(this).val()) || mapZoomLevel;
        map.setZoom(val);
    }

    function setMapCenter() {
        let coordinates = getInputCoordinates(this);
        map.setCenter(coordinates);
    }

    function showPolygonFromFile() {
        $.getJSON(
            './root/cordinates.json',
            data => {
                createPolygonObj(data.polygon, "FilePolygon"
                );
            });
    }

    function showTriangulatedPolygonFromFile() {
        $.getJSON(
            './root/cordinates.json',
            data => {
                data.triangulatedPolygon.forEach(line => {
                    createPolylineObj(line, "pLine");
                });
            });
    }

    function triangulate() {
        let triangLines = getTriangulationLines('Polygon') || [];

        return triangLines.map(edge => createPolylineObj(edge, "TriangLine"));
    }

    function showGraph() {
        let edges = getEdges('pLine') || [];

        edges.forEach(edge => {
            edges = edges.filter(edgeParam => edgeParam !== edge);

            let egdesOfEachVertice = edge.map(vertice => {
                return edges.filter(edge => hasVertice(edge, vertice));
            });

            let missingTriangleEdges = [];
            let [firstVerticeEdges, secondVerticeEdges] = egdesOfEachVertice;

            for (let idx = 0; idx < secondVerticeEdges.length; idx++) {
                secondVerticeEdges[idx].forEach(vertice => {
                    let edges = firstVerticeEdges.map(edgeParam => hasVertice(edgeParam, vertice));
                    edges = edges.filter(x => x !== undefined);
                    if (edges.length !== 0) {
                        missingTriangleEdges = [...missingTriangleEdges, ...edges, [...secondVerticeEdges[idx]]];
                    }
                });
            }

            let triangEdges = [[...edge], ...missingTriangleEdges];

            let edgesCenters = triangEdges.map(e => getCenter(e));
            let triangCenter = getCenter(edgesCenters);

            edgesCenters.forEach(edgeCenter => {
                createPolylineObj([triangCenter, edgeCenter]);
            });
        });
    }

    const hasSameVertice = (edge1, edge2) => {
        if (edge1.some(v => sameCoordinate(edge2, v))) {
            return [edge1, edge2];
        }
    }


    const hasVertice = (edge, vertice) => {
        if (edge.some(v => sameCoordinate(v, vertice))) {
            return edge;
        }
    }

    const sameCoordinate = (с1, с2) => (с1.lat() === с2.lat() && с1.lng() === с2.lng());

    function resetMap() {
        mapObjects.forEach(object => {
            object.setMap(null);
        });

        mapObjects = [];
    }

    function showInfoMarker(e) {
        deleteMapObj('InfoMarker');

        let marker = createMarkerObj(e.latLng, 'InfoMarker');
        let infoWindow = createInfoWindow(coordinatesToString(e.latLng));

        infoWindow.open(map, marker);
    }


    // Generate and initialize components on start
    function initDefaultValues() {
        $zoomMapInput.val(mapZoomLevel);
        $centerMapInput.val(`${mapCenterPosition.lat()};${mapCenterPosition.lng()}`);
    }

    function generateMapComponents() {
        let generatedObjects = [
            generateMapResetBtn(),
            generateMapZoomInput(),
            generateMapCoordInput()
        ];

        generatedObjects.forEach(object => {
            $mapSelector.append(object);
        });
    }

    // Utility functions
    const getTriangulationLines = objName => {
        let lastPolygon = findLast(mapObjects, objName);

        if (lastPolygon === undefined)
            return;

        let vertices = lastPolygon.object.getPath();
        let firstVertice = vertices.removeAt(0);

        return vertices.getArray().map(vertice => [firstVertice, vertice]);
    }

    const getEdges = objName => {
        let edges = mapObjects
            .filter(obj => obj.name === objName)
            .map(obj => obj.object.getPath().getArray());

        return edges;
    }

    const getInputCoordinates = input => {
        let inputValues = $(input).val().toString().split(';');

        let lat = parseFloat(inputValues[0]) || 0;
        let lng = parseFloat(inputValues[1]) || 0;

        return createLatLng(lat, lng);
    }

    const coordinatesToString = coordinates => `${coordinateToString(coordinates.lat())}; ${coordinateToString(coordinates.lng())}`;

    const coordinateToString = (coordinate, accuracy = 4) => coordinate.toString().substring(0, accuracy);

    const getCenter = coordinates => {
        let lat = 0;
        let lng = 0;

        coordinates.forEach(c => {
            lat = lat + c.lat();
            lng = lng + c.lng();
        });

        return createLatLng(lat / coordinates.length, lng / coordinates.length);
    }

    const findLast = (array, type) => {
        let idx = array.length - 1;

        for (; idx >= 0; idx--) {
            if (array[idx].type === type) {
                return array[idx];
            }
        }
    }


    // Map objects manipulation
    function createMapObj(name, object, type) {
        let mapObj = new MapObject(name, object, type);

        object.setMap(map);
        mapObjects.push(mapObj);
    }

    function deleteMapObj(name) {
        let mapObj = mapObjects.find(o => o.name === name);

        if (mapObj === undefined)
            return;

        let objectIdx = mapObjects.indexOf(mapObj);

        mapObj.setMap(null);
        mapObjects.splice(objectIdx, 1);
    }

    function createMarkerObj(coordinates, name = "Marker") {
        let marker = createMarker(coordinates);

        createMapObj(name, marker, "Marker");
        return marker;
    }

    function createPolygonObj(coordinates, name = "Polygon") {
        let polygon = createPolygon(coordinates);

        createMapObj(name, polygon, "Polygon");
        return polygon
    }

    function createPolylineObj(coordinates, name = "Polyline") {
        let line = createPolyline(coordinates);

        createMapObj(name, line, "Polyline");
        return line;
    }

    function drawCircle() {
        let circle = createCircle();

        createMapObj('bla', circle, 'circle');
        return circle;
    }

    function createPyramid() {
        let pyramid = [
        [
            { "lat": -10, "lng": 10 },
            { "lat": -10, "lng": -10 }
        ],
        [
            { "lat": -2, "lng": 0 },
            { "lat": -10, "lng": 10 }
        ],
        [
            { "lat": -2, "lng": 0 },
            { "lat": -10, "lng": -10 }
        ],
        [
            { "lat": 16, "lng": 0 },
            { "lat": -2, "lng": 0 }
        ],
        [
            { "lat": 16, "lng": 0 },
            { "lat": -10, "lng": 10 }
        ],
        [
            { "lat": 16, "lng": 0 },
            { "lat": -10, "lng": -10 }
        ]
        ]
    
        pyramid.forEach(line => {
            createPolylineObj(line, "pLine");
        });
    }
    
});



// Defaults
const mapCenterPosition = createLatLng(30, 30);
const mapZoomLevel = 3;

const color = '#d1938e';
const strokeOpacity = 0.6;
const fillOpacity = 0.2;
const strokeWeight = 2;

function initMap(mapSelector) {
    var mapOptions = { center: mapCenterPosition, zoom: mapZoomLevel };

    return new google.maps.Map(mapSelector, mapOptions);
}


// Simplify google maps objects creation
function createLatLng(lat, lng) {
    let latLng = new google.maps.LatLng(lat, lng);

    return latLng;
}

function createMarker(coordinate) {
    let options = { position: coordinate };

    let marker = new google.maps.Marker(options);

    return marker;
}

function createPolygon(coordinates) {
    let options = {
        paths: coordinates,
        strokeColor: '#979937',
        strokeOpacity: strokeOpacity,
        strokeWeight: strokeWeight,
        fillColor: color,
        fillOpacity: fillOpacity
    }

    let polygon = new google.maps.Polygon(options);

    return polygon
}

function createPolyline(coordinates) {
    let options = {
        path: coordinates,
        strokeColor: color,
        strokeOpacity: strokeOpacity,
        strokeWeight: strokeWeight
    };

    let line = new google.maps.Polyline(options);

    return line;
}

function createInfoWindow(content) {
    let options = {
        content: content
    };

    let info = new google.maps.InfoWindow(options);

    return info;
}

function createCircle() {
    let circle = new google.maps.Circle({
        strokeColor: color,
        strokeOpacity: strokeOpacity,
        strokeWeight: strokeWeight,
        center: {
            lat: 0,
            lng: 0
        },
        radius: 20000 * 100
    });


    return circle;
}



class MapObject {
    constructor(name, object, type) {
        this.name = name;
        this.object = object
        this.type = type
    }

    setMap(map) {
        this.object.setMap(map);
    }
}