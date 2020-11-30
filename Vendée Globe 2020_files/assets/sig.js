µ.events.SIG_IS_INIT = "sig_is_init";
µ.events.SIG_IS_RESIZED = "sig_is_resized";
µ.events.SIG_MOUSE_MOVE = "map_mouse_move";
µ.events.MAP_MOVE = "map_move";
µ.events.MAP_ZOOM_CHANGE_PLEASE = "map_zoom_change_please";
µ.events.MAP_ZOOM_CHANGED = "map_zoom_changed";
µ.events.MAP_ZOOM_CHANGED_MANUALLY = "map_zoom_changed_manually";
µ.events.BOAT_CLICK = "boat_click";
µ.events.BOAT_TOUCH = "boat_touch";
µ.events.BOAT_OVER = "boat_over";
µ.events.BOAT_OUT = "boat_out";
µ.events.FORECAST_DISPLAYED = "forecast_displayed";
µ.events.FORECAST_WIND_VALUE = "forecast_wind_value";
µ.events.REFERENCE_PLOT_MOUSE_EVENT = "reference_plot_mouse_event";
µ.events.RULE_ANCHOR_CREATED = "rule_anchor_created";
µ.events.RULE_ANCHOR_MOUSE_EVENT = "rule_anchor_mouse_event";
µ.events.RULE_ANCHOR_DRAGGING = "rule_anchor_mouse_dragging";
µ.events.GEOMEDIA_CLICK = "geomedia_click";
var sig = {
    _projections: {},
    mapScale: 1,
    zoomMax: 20,
    sigBounds: null,
    zoomWindowBounds: null,
    mapBounds: null,
    centerX: 0,
    isWorldWide: false,
    isOverAntiMeridian: false,
    worldWidth: 0,
    mapArea: null,
    activeBoat: null,
    _sig: null,
    _sigPosition: null,
    _map: null,
    _shapesUrl: '',
    _shapes: null,
    _layout: null,
    _areasLayer: null,
    _areasTip: null,
    _refLayer: null,
    _gatesLayer: null,
    _groundLayer: null,
    _bathyLayer: null,
    _orthoLayer: null,
    _tracksLayer: null,
    _tracksSTMLayer: null,
    _routingsLayer: null,
    _boatsLayer: null,
    _poiLayer: null,
    _mediaLayer: null,
    _projection: null,
    _lands: null,
    _tracks: null,
    _sigCenter: {
        x: 0,
        y: 0,
        lat: 0,
        lng: 0
    },
    _currentFocusPoint: null,
    _zoomTimeout: null,
    _bathyconfig: null,
    _boats: [],
    _boatsByIds: {},
    _boatsPositions: {},
    _currentTimecode: 0,
    _raceGates: [],
    _raceAreas: [],
    _raceReferences: [],
    _raceReferencesByBoatId: {},
    _poiLayers: [],
    _poiLayersByLevel: {},
    _geoMedias: [],
    _moveElements: [],
    _timeElements: [],
    _miscElements: [],
    _pathElements: [],
    _times: [],
    _resizeTimeout: null,
    _svgModels: {},
    _interactiveLayerManagers: [],
    init: function (params) {
        var that = this;
        this._initJQueryElements();
        this.zoomMax = params && params.zoommax ? params.zoommax : 20;
        this._bathyconfig = params ? params.bathy : null;
        this._shapesUrl = params.map.file.replace("&amp;", "&");
        this._initProjection(params && params.map && params.map.projection ? params.map.projection : "Mercator", params && params.map && params.map.area ? params.map.area : µ.MAP_MAX_AREA);
        this.tiledmap.initLeafletPath(params.leafletpath);
        this.tiledmap.navionicsApiKey = params ? params.navionics || "" : "";
        this._updateSigBounds();
        this._updateMapBounds();
        this._startListeners();
        this.daynight.init();
        this.weather.init();
        document.addEventListener("touchmove", function (event) {
            event.preventDefault()
        });
        $(document).trigger(µ.events.SIG_IS_INIT, null)
    },
    loadShapes: function (isClear) {
        var url = µ.WEBROOT + this._shapesUrl;
        var that = this;
        if (isClear) {
            $.ajax({
                url: url,
            }).done(function (data) {
                try {
                    that._onShapesLoaded(eval("(" + data + ")").shape)
                } catch (err) {}
            }).fail(function (err) {
                that._onShapesLoaded(eval("(" + err.responseText + ")").shape)
            })
        } else {
            µ.loadHwxFile(url, "json", function (data) {
                that._onShapesLoaded(data.shape)
            })
        }
    },
    getLat: function (x, y) {
        return this._projection.getLat(x, y)
    },
    getLng: function (x, y, noModulo) {
        return this._projection.getLng(x, y, noModulo)
    },
    getGeoPoint: function (x, y) {
        return {
            "lat": this.getLat(x, y),
            "lng": this.getLng(x, y)
        }
    },
    getX: function (latitude, longitude, noModulo) {
        return this._projection.getX(latitude, longitude, noModulo)
    },
    getY: function (latitude, longitude) {
        return this._projection.getY(latitude, longitude)
    },
    getRect: function () {
        var isGeoArea = arguments.length == 1;
        var latMax = isGeoArea ? arguments[0].top : arguments[0];
        var lngMin = isGeoArea ? arguments[0].left : arguments[1];
        var width = isGeoArea ? arguments[0].width : arguments[2];
        var height = isGeoArea ? arguments[0].height : arguments[3];
        var top = sig.getY(latMax, lngMin);
        var left = sig.getX(latMax, lngMin);
        var bottom = sig.getY(latMax - height, lngMin);
        var right = sig.getX(latMax - height, lngMin + width);
        return {
            top: top,
            left: left,
            bottom: bottom,
            right: right,
            width: right - left,
            height: bottom - top
        }
    },
    getOuterX: function (latitude, longitude, noModulo) {
        return this.mapBounds.left + this._projection.getX(latitude, longitude, noModulo) * this.mapScale
    },
    getOuterY: function (latitude, longitude) {
        return this.mapBounds.top + this._projection.getY(latitude, longitude) * this.mapScale
    },
    getSvgPathCommands: function (polygon) {
        if (polygon.length == 0 || polygon[0].length == 0) return "";
        var nbPoints = polygon.length;
        var worldWidth = this.worldWidth;
        var swapX = 0;
        var path = [];
        var path2 = [];
        var path3 = [];
        var commands = [];
        var side = 0;
        var previousLng = polygon[0][1];
        for (var i = 0; i < nbPoints; i++) {
            var point = polygon[i];
            var lat = point[0];
            var lng = point[1];
            if (lng > 180) {
                lng -= 360
            } else if (lng < -180) {
                lng += 360
            }
            if (this.isWorldWide && Math.abs(lng - previousLng) > 300) {
                swapX = (swapX != 0 ? 0 : previousLng > 0 ? worldWidth : -worldWidth);
                if (side == 0) side = previousLng > 0 ? 1 : -1
            }
            var x = this.getX(lat, lng) + swapX;
            var y = this.getY(lat, lng);
            path.push([x, y]);
            previousLng = lng
        };
        commands.push("M" + path.map(function (pt) {
            return pt.join(" ")
        }).join("L"));
        if (this.isWorldWide) {
            commands.push("M" + path.map(function (pt) {
                return (pt[0] + (side == 1 ? -worldWidth : worldWidth)) + " " + pt[1]
            }).join("L"));
            commands.push("M" + path.map(function (pt) {
                return (pt[0] + (side == 1 ? worldWidth : worldWidth * 2)) + " " + pt[1]
            }).join("L"))
        }
        return commands.join("")
    },
    getWindowArea: function (step) {
        var latBottom = this._projection.getLat(0, (this.sigBounds.height - this.mapBounds.top) / this.mapScale);
        var latTop = this._projection.getLat(0, -this.mapBounds.top / this.mapScale);
        var lngLeft = this._projection.getLng(-this.mapBounds.left / this.mapScale, 0, true);
        var lngRight = this._projection.getLng((this.sigBounds.width - this.mapBounds.left) / this.mapScale, 0, true);
        if (step == undefined) return µ.geo.getArea(latTop, latBottom, lngLeft, lngRight);
        var latMin = Math.floor(latBottom / step) * step;
        var latMax = Math.ceil(latTop / step) * step;
        var lngMin = Math.floor(lngLeft / step) * step;
        var lngMax = Math.ceil(lngRight / step) * step;
        return µ.geo.getArea(latMax, latMin, lngMin, lngMax)
    },
    mapEventToProjPoint: function (evt) {
        var usefullevt = evt.originalEvent.touches && evt.originalEvent.touches[0] ? evt.originalEvent.touches[0] : evt.originalEvent;
        return {
            "x": (usefullevt.pageX - this.mapBounds.absLeft) / this.mapScale,
            "y": (usefullevt.pageY - this.mapBounds.absTop) / this.mapScale
        }
    },
    mapEventToSigPoint: function (evt) {
        var usefullevt = evt.originalEvent.touches && evt.originalEvent.touches[0] ? evt.originalEvent.touches[0] : evt.originalEvent;
        return {
            "x": this.mapBounds.left + usefullevt.pageX - this.mapBounds.absLeft,
            "y": this.mapBounds.top + usefullevt.pageY - this.mapBounds.absTop
        }
    },
    mapEventToGeoPoint: function (evt) {
        var usefullevt = evt.originalEvent.touches && evt.originalEvent.touches[0] ? evt.originalEvent.touches[0] : evt.originalEvent;
        return this.getGeoPoint((usefullevt.pageX - this.mapBounds.absLeft) / this.mapScale, (usefullevt.pageY - this.mapBounds.absTop) / this.mapScale)
    },
    mapPointToSigPoint: function (x, y) {
        return {
            "x": this.mapBounds.left + x,
            "y": this.mapBounds.top + y
        }
    },
    projPointToSigPoint: function (x, y) {
        return {
            "x": this.mapBounds.left + x * this.mapScale,
            "y": this.mapBounds.top + y * this.mapScale
        }
    },
    getBoat: function (id) {
        return this._boatsByIds[id]
    },
    getReference: function (id) {
        return this._raceReferencesByBoatId[id]
    },
    centerOn: function (lat, lng) {
        this._centerOn(this.getX(lat, lng) * this.mapScale, this.getY(lat, lng) * this.mapScale)
    },
    projPointIsInFrame: function (x, y) {
        var outerX = x * this.mapScale + this.mapBounds.left;
        var outerY = y * this.mapScale + this.mapBounds.top;
        var outside = outerX < this.zoomWindowBounds.left || outerX > this.zoomWindowBounds.right || outerY < this.zoomWindowBounds.top || outerY > this.zoomWindowBounds.bottom;
        return !outside
    },
    keepProjPointInFrame: function (x, y) {
        var outerX = x * this.mapScale + this.mapBounds.left;
        var outerY = y * this.mapScale + this.mapBounds.top;
        var outside = outerX < this.zoomWindowBounds.left || outerX > this.zoomWindowBounds.right || outerY < this.zoomWindowBounds.top || outerY > this.zoomWindowBounds.bottom;
        if (outside) {
            var dx = outerX < this.zoomWindowBounds.left ? this.zoomWindowBounds.left - outerX : outerX > this.zoomWindowBounds.right ? this.zoomWindowBounds.right - outerX : 0;
            var dy = outerY < this.zoomWindowBounds.top ? this.zoomWindowBounds.top - outerY : outerY > this.zoomWindowBounds.bottom ? this.zoomWindowBounds.bottom - outerY : 0;
            this._mapMoveBy(dx, dy)
        }
        return outside
    },
    keepActiveBoatInFrame: function () {
        if (!this.activeBoat) return;
        this.keepProjPointInFrame(this.activeBoat.x, this.activeBoat.y);
        this._currentFocusPoint = {
            "x": this.activeBoat.x,
            "y": this.activeBoat.y
        }
    },
    centerOnActiveBoat: function (onlyIfNotVisible) {
        if (this.activeBoat && (onlyIfNotVisible ? !this.projPointIsInFrame(this.activeBoat.x, this.activeBoat.y) : true)) {
            this._centerOn(this.activeBoat.x * this.mapScale, this.activeBoat.y * this.mapScale);
            this._currentFocusPoint = {
                "x": this.activeBoat.x,
                "y": this.activeBoat.y
            }
        }
    },
    focusOnActiveBoat: function () {
        if (this.activeBoat) {
            this._mapMoveTo(this.zoomWindowBounds.centerX - this.activeBoat.x * this.mapScale, this.zoomWindowBounds.centerY - this.activeBoat.y * this.mapScale);
            this._currentFocusPoint = {
                "x": this.activeBoat.x,
                "y": this.activeBoat.y
            }
        }
        console.log("focusOnActiveBoat")
    },
    focusOnPoint: function (x, y) {
        this._mapMoveTo(this.zoomWindowBounds.centerX - x * this.mapScale, this.zoomWindowBounds.centerY - y * this.mapScale);
        this._currentFocusPoint = {
            "x": x,
            "y": y
        };
        console.log("focusOnPoint")
    },
    zoomHome: function () {
        this._mapZoomFocusedOn(0, 0, 0)
    },
    zoomTo: function (level) {
        var focusPoint = this._currentFocusPoint && this.projPointIsInFrame(this._currentFocusPoint.x, this._currentFocusPoint.y) ? this._currentFocusPoint : this._getSigCenter();
        this._mapZoomFocusedOn(focusPoint.x * this.mapScale, focusPoint.y * this.mapScale, level)
    },
    zoomBy: function (factor) {
        this.zoomTo(this.mapScale * factor)
    },
    zoomToRect: function (xProjMin, xProjMax, yProjMin, yProjMax, defaultLevel) {
        var centerX = (xProjMax + xProjMin) / 2;
        var centerY = (yProjMax + yProjMin) / 2;
        var width = (xProjMax - xProjMin) * this.mapScale;
        var height = (yProjMax - yProjMin) * this.mapScale;
        var level = this.mapScale * Math.min(this.zoomWindowBounds.width / width, this.zoomWindowBounds.height / height);
        var x = centerX * this.mapScale;
        var y = centerY * this.mapScale;
        this._currentFocusPoint = {
            "x": centerX,
            "y": centerY
        };
        this._mapZoomCenterOn(x, y, (defaultLevel != undefined && defaultLevel > 0) ? defaultLevel : level)
    },
    zoomToRoute: function () {
        this.zoomToRect(this.route.rect.xMin, this.route.rect.xMax, this.route.rect.yMin, this.route.rect.yMax)
    },
    zoomCenterOnActiveBoat: function (level) {
        if (this.activeBoat) this._mapZoomCenterOn(this.activeBoat.x * this.mapScale, this.activeBoat.y * this.mapScale, level)
    },
    displayGeoMedia: function () {
        var that = this;
        this._mediaLayer.show();
        if (this.activeBoat) {
            $.each(this._geoMedias, function (i, media) {
                media.setVisibilityAt(that._currentTimecode);
                media.boatId == that.activeBoat.id ? media.display() : media.hide()
            })
        }
    },
    hideGeoMedia: function () {
        this._mediaLayer.hide()
    },
    resize: function () {
        var that = this;
        var center = this._getSigCenter();
        window.clearTimeout(this._resizeTimeout);
        this._resizeTimeout = window.setTimeout(function () {
            that._updateSigBounds();
            that._updateMapBounds();
            that._updateProjection();
            that._redrawMap();
            that._redrawBathymetry();
            that._updateElementsPositions();
            that._reCenterMap(center.lat, center.lng);
            that.keepActiveBoatInFrame();
            that.daynight.redraw();
            $(document).trigger(µ.events.SIG_IS_RESIZED, null)
        }, 50)
    },
    pointIsOnLand: function (lat, lng) {
        var onLand = false;
        for (var i = 0; i < this._shapes.length; i++) {
            if (this._shapes[i].contains(lat, lng)) {
                onLand = true;
                break
            }
        };
        if (onLand) return true;
        for (var i = 0; i < this._raceAreas.length; i++) {
            var area = this._raceAreas[i];
            if (!area.isLive && area.contains(lat, lng)) {
                onLand = true;
                break
            }
        };
        return onLand
    },
    pointIsOnLiveArea: function (lat, lng) {
        var onLiveArea = false;
        for (var i = 0; i < this._raceAreas.length; i++) {
            var area = this._raceAreas[i];
            if (area.isLive) {
                if (area.contains(lat, lng)) {
                    onLiveArea = true;
                    break
                }
            }
        };
        return onLiveArea
    },
    pointIsOnArrivalArea: function (lat, lng) {
        var onArrivalArea = false;
        for (var i = 0; i < this._raceAreas.length; i++) {
            var area = this._raceAreas[i];
            if (area.isLive && area.id == "ArrivalArea") {
                if (area.contains(lat, lng)) {
                    onArrivalArea = true;
                    break
                }
            }
        };
        return onArrivalArea
    },
    addMiscElement: function (layerId, miscElement) {
        if (miscElement == undefined) return;
        var layer = $("g#" + layerId);
        if (layer.length == 0) return;
        this._miscElements.push(miscElement);
        layer.append(miscElement.tag)
    },
    removeMiscElement: function (layerId, miscElement) {
        if (miscElement == undefined) return;
        var layer = $("g#" + layerId);
        if (layer.length == 0) return;
        var index = this._miscElements.indexOf(miscElement);
        if (index > -1) this._miscElements.splice(index, 1);
        $(miscElement.tag).remove()
    },
    addTimeElement: function (layerId, timeElement) {
        if (timeElement == undefined) return;
        var layer = $("g#" + layerId);
        if (layer.length == 0) return;
        this._timeElements.push(timeElement);
        layer.append(timeElement.tag)
    },
    removeTimeElement: function (layerId, timeElement) {
        if (timeElement == undefined) return;
        var layer = $("g#" + layerId);
        if (layer.length == 0) return;
        var index = this._timeElements.indexOf(timeElement);
        if (index > -1) this._timeElements.splice(index, 1);
        $(timeElement.tag).remove()
    },
    addMoveElement: function (layerId, moveElement) {
        if (moveElement == undefined) return;
        var layer = $("g#" + layerId);
        if (layer.length == 0) return;
        this._moveElements.push(moveElement);
        layer.append(moveElement.tag)
    },
    removeMoveElement: function (layerId, moveElement) {
        if (moveElement == undefined) return;
        var layer = $("g#" + layerId);
        if (layer.length == 0) return;
        var index = this._moveElements.indexOf(moveElement);
        if (index > -1) this._moveElements.splice(index, 1);
        $(moveElement.tag).remove()
    },
    addPathElement: function (layerId, pathElement) {
        if (pathElement == undefined) return;
        var layer = $("g#" + layerId);
        if (layer.length == 0) return;
        this._pathElements.push(pathElement);
        layer.append(pathElement.tag);
        if (pathElement.parseDash) pathElement.parseDash()
    },
    addBathymetry: function () {
        if (this._bathyconfig != undefined) {
            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("width", this._bathyconfig.size.width + "px");
            rect.setAttribute("height", this._bathyconfig.size.height + "px");
            this._bathyLayer.append(rect);
            var img = document.createElementNS("http://www.w3.org/2000/svg", "image");
            img.setAttributeNS("http://www.w3.org/1999/xlink", "href", µ.WEBROOT + this._bathyconfig.file);
            img.setAttribute("width", this._bathyconfig.size.width + "px");
            img.setAttribute("height", this._bathyconfig.size.height + "px");
            this._bathyLayer.append(img);
            this._redrawBathymetry()
        } else {
            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("width", Math.ceil(this.mapBounds.width) + "px");
            rect.setAttribute("height", Math.ceil(this.mapBounds.height) + "px");
            this._bathyLayer.append(rect)
        }
    },
    addBoat: function (id, name, category, hulls, hullColors, trackColor) {
        var boat = new sig.Boat(id, name, category, hulls, hullColors, trackColor);
        this._boats.push(boat);
        this._moveElements.push(boat);
        this._boatsByIds[id] = boat;
        this._boatsLayer.prepend(boat.tag);
        this._tracksLayer.prepend(boat.track.tag);
        this._tracksSTMLayer.prepend(boat.trackSTM.tag);
        this._routingsLayer.prepend(boat.routing.tag);
        return boat
    },
    addRaceArea: function (id, isLive, definition) {
        var racearea = new sig.RaceArea(id, isLive, definition);
        this._raceAreas.push(racearea);
        this._pathElements.push(racearea);
        this._areasLayer.append(racearea.tag)
    },
    addRaceGate: function (id, definition) {
        var gate = new sig.RaceGate(id, definition);
        this._raceGates.push(gate);
        this._gatesLayer.prepend(gate.tag)
    },
    addRaceReference: function (id, name, tracksData, withTimePlot) {
        var that = this;
        var ref = new sig.RaceReference(id, name, tracksData);
        this._raceReferences.push(ref);
        this._raceReferencesByBoatId[id] = ref;
        this._refLayer.hide();
        this._refLayer.append(ref.track.tag);
        $.each(ref.plots, function (index, plot) {
            that._refLayer.append(plot.tag)
        });
        if (withTimePlot) {
            var currentPlot = ref.addCurrentPlot();
            this._refLayer.append(currentPlot.tag)
        }
        return ref
    },
    addPlotsToBoatTrack: function (boat) {
        if (boat == null) return;
        var track = boat.track;
        var currentTimecode = track.firstLocation.timecode;
        var endTimecode = track.lastLocation.timecode;
        var index = 1;
        while (currentTimecode <= endTimecode) {
            currentTimecode += 86400;
            var location = track.getPositionAt(currentTimecode);
            var plot = new sig.RaceReferencePlot(boat.name, index, currentTimecode, location.lat, location.lng, track.color);
            this._refLayer.append(plot.tag);
            this._timeElements.push(plot);
            index++
        }
    },
    addPoiLayer: function (zoom) {
        if (this._poiLayersByLevel[zoom] != null) return this._poiLayersByLevel[zoom];
        var layer = new sig.PointOfInterestLayer(zoom, this._poiLayer);
        this._poiLayersByLevel[zoom] = layer;
        this._poiLayers.push(layer);
        return layer
    },
    addPoi: function (id, zoom, type, name, lat, lng, clock) {
        var layer = this.addPoiLayer(zoom);
        if (!layer) return;
        var poi = new sig.PointOfInterest(id, type, name, lat, lng, clock);
        layer.addPoint(poi);
        layer.updateScale();
        return poi
    },
    addGeoMedia: function (boatId, mediaId, type, timecode, title, hat, content, credits) {
        var boat = this.getBoat(boatId);
        if (!boat) return;
        var position = boat.track.getPositionAt(timecode);
        var media = new sig.GeoMedia(mediaId, boat.id, type, timecode, position.lat, position.lng, title, hat, content, credits);
        this._mediaLayer.append(media.tag);
        this._timeElements.push(media);
        this._geoMedias.push(media)
    },
    addInteractiveLayerManager: function (manager) {
        this._interactiveLayerManagers.push(manager)
    },
    getSvgModel: function (modelId, fallbackModelId) {
        var model = this._svgModels[modelId];
        if (model == undefined && fallbackModelId != undefined) model = this._svgModels[fallbackModelId];
        return model == undefined ? document.createElementNS("http://www.w3.org/2000/svg", "g") : model.cloneNode(true)
    },
    displayOrthodromy: function () {
        this._orthoLayer.append(this.route.tag)
    },
    hideOrthodromy: function () {
        $(sig.route.tag).remove()
    },
    displayReferences: function () {
        this._refLayer.show();
        $.each(this._raceReferences, function (index, ref) {
            ref.track.updateScale();
            $.each(ref.plots, function (index, plot) {
                plot.updateScale()
            })
        })
    },
    hideReferences: function () {
        this._refLayer.hide()
    },
    displayDaynight: function () {
        sig.daynight.display()
    },
    hideDaynight: function () {
        sig.daynight.hide()
    },
    _initJQueryElements: function () {
        this._sig = $("#sig");
        this._map = $("#map");
        this._layout = document.getElementById("layout");
        this._areasLayer = $("#areasLayer");
        this._gatesLayer = $("#gatesLayer");
        this._refLayer = $("#referencesLayer");
        this._groundLayer = $("#groundLayer");
        this._bathyLayer = $("#bathyLayer");
        this._orthoLayer = $("#orthoLayer");
        this._tracksLayer = $("#tracksLayer");
        this._tracksSTMLayer = $("#tracksSTMLayer");
        this._routingsLayer = $("#routingsLayer");
        this._boatsLayer = $("#boatsLayer");
        this._poiLayer = $("#poiLayer");
        this._mediaLayer = $("#mediaLayer");
        this._areasTip = $("#areaTip").data("translations", ($("#areaTip").attr("rel") || "") == "" ? {} : eval("({" + ($("#areaTip").attr("rel") || "").split(",").join('",').split(":").join(':"') + '"})'));
        var svgModels = $("#svgmodels>g");
        for (var i = 0; i < svgModels.length; i++) {
            var model = svgModels[i].cloneNode(true);
            var modelId = model.getAttribute("id").replace("svgmodel_", "");
            model.removeAttribute("id");
            this._svgModels[modelId] = model
        }
    },
    _startListeners: function (state) {
        var that = this;
        $(window).resize(function (evt) {
            that.resize()
        });
        this._map.on("mousedown", function (evt) {
            that._onMouseDown(evt)
        }).on("touchstart", function (evt) {
            that._onTouchStart(evt)
        }).on("mousewheel DOMMouseScroll", function (evt) {
            that._onMouseWheel(evt)
        }).on("mousemove", function (evt) {
            that._onMouseMove(evt)
        });
        $(document).on(µ.events.TIMELINE_CHANGE, function (evt, timecode) {
            that._onTimelineChange(timecode)
        })
    },
    _initProjection: function (type, area) {
        this.mapArea = area;
        this._projection = new sig._projections[type]();
        this._updateProjection();
        this.isWorldWide = this.mapArea.width >= 350;
        this.isOverAntiMeridian = (this.mapArea.width < 350) && ((this.mapArea.left + this.mapArea.width) > 180)
    },
    _onShapesLoaded: function (shapesData) {
        this._initShapes(shapesData);
        this._redrawMap();
        this.addBathymetry()
    },
    _onMouseMove: function (evt) {
        var geoPoint = this.mapEventToGeoPoint(evt);
        $(document).trigger(µ.events.SIG_MOUSE_MOVE, geoPoint);
        if (sig.weather.isActive) {
            var windValue = sig.weather.getValueAt(geoPoint.lat, geoPoint.lng);
            if (windValue) {
                var sigPoint = this.mapEventToSigPoint(evt);
                $(document).trigger(µ.events.FORECAST_WIND_VALUE, {
                    "x": sigPoint.x,
                    "y": sigPoint.y,
                    "speed": windValue.speed,
                    "origin": windValue.origin
                })
            }
        }
    },
    _onMouseDown: function (evt) {
        var that = this;
        var interactiveLayerIsOn = false;
        for (var i = 0; i < this._interactiveLayerManagers.length; i++) {
            var interactiveLayer = this._interactiveLayerManagers[i];
            interactiveLayerIsOn = interactiveLayer.isActive && interactiveLayer.start(evt);
            if (interactiveLayerIsOn) break
        }
        if (!interactiveLayerIsOn) {
            $(document).on("mousemove.map", function (evt2) {
                that._drag(evt2)
            });
            $(document).on("mouseup.map", function () {
                $(document).off("mousemove.map mouseup.map")
            });
            this._map.data({
                "lastMousePosition": {
                    "x": evt.originalEvent.pageX,
                    "y": evt.originalEvent.pageY
                },
                "isIntouch": false,
                "pinchDistance": 0
            })
        }
        evt.preventDefault();
        evt.stopPropagation()
    },
    _onMouseWheel: function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var direction = evt.originalEvent.wheelDelta ? (evt.originalEvent.wheelDelta > 0 ? 1 : -1) : evt.originalEvent.detail ? (evt.originalEvent.detail < 0 ? 1 : -1) : 0;
        var level = this.mapScale * (1 + direction * 0.15);
        this._mapZoomFocusedOn(evt.originalEvent.pageX - this.mapBounds.absLeft, evt.originalEvent.pageY - this.mapBounds.absTop, level);
        $(document).trigger(µ.events.MAP_ZOOM_CHANGED_MANUALLY, this.mapScale)
    },
    _onTouchStart: function (evt) {
        var that = this;
        var interactiveLayerIsOn = false;
        for (var i = 0; i < this._interactiveLayerManagers.length; i++) {
            var interactiveLayer = this._interactiveLayerManagers[i];
            interactiveLayerIsOn = interactiveLayer.isActive && interactiveLayer.start(evt);
            if (interactiveLayerIsOn) break
        }
        if (!interactiveLayerIsOn && !this._map.data("isIntouch")) {
            var firstTouch = evt.originalEvent.touches[0];
            this._map.data({
                "lastMousePosition": {
                    x: firstTouch.pageX,
                    y: firstTouch.pageY
                },
                "isIntouch": true,
                "pinchDistance": 0
            }).on("touchmove.map", function (evt2) {
                that._onTouchMove(evt2)
            });
            $(document).on("touchend.map", function () {
                that._onTouchEnd()
            })
        }
        evt.preventDefault();
        evt.stopPropagation()
    },
    _onTouchMove: function (evt) {
        var nbTouches = evt.originalEvent.touches.length;
        switch (nbTouches) {
        case 1:
            this._drag(evt);
            break;
        case 2:
            this._pinch(evt);
            break
        }
    },
    _onTouchEnd: function () {
        this._map.off("touchmove.map").data("isIntouch", false);
        $(document).off("touchend.map")
    },
    _drag: function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var currentMousePosition = {
            x: 0,
            y: 0
        };
        var oldMousePosition = this._map.data("lastMousePosition");
        switch (evt.type) {
        case "mousemove":
            currentMousePosition = {
                x: evt.originalEvent.pageX,
                y: evt.originalEvent.pageY
            };
            break;
        case "touchmove":
            var firstTouch = evt.originalEvent.touches[0];
            currentMousePosition = {
                x: firstTouch.pageX,
                y: firstTouch.pageY
            };
            break
        }
        var dx = currentMousePosition.x - oldMousePosition.x;
        var dy = currentMousePosition.y - oldMousePosition.y;
        this._map.data("lastMousePosition", currentMousePosition);
        this._mapMoveBy(dx, dy)
    },
    _pinch: function (evt) {
        var firstTouch = evt.originalEvent.touches[0];
        var secondTouch = evt.originalEvent.touches[1];
        var firstPoint = {
            x: firstTouch.pageX,
            y: firstTouch.pageY
        };
        var secondPoint = {
            x: secondTouch.pageX,
            y: secondTouch.pageY
        };
        var oldDistance = this._map.data("pinchDistance");
        var newDistance = Math.sqrt(Math.pow(firstPoint.x - secondPoint.x, 2) + Math.pow(firstPoint.y - secondPoint.y, 2));
        if (oldDistance != 0) {
            var level = this.mapScale * (newDistance / oldDistance);
            this._mapZoomFocusedOn((firstPoint.x + secondPoint.x) / 2 - this.mapBounds.absLeft, (firstPoint.y + secondPoint.y) / 2 - this.mapBounds.absTop, level)
        }
        this._map.data("pinchDistance", newDistance);
        $(document).trigger(µ.events.MAP_ZOOM_CHANGED_MANUALLY, this.mapScale)
    },
    _mapZoomFocusedOn: function (x, y, level) {
        var oldScale = this.mapScale;
        this._applyZoom(level);
        var newFactor = this.mapScale / oldScale;
        var dx = Math.round(x * (1 - newFactor));
        var dy = Math.round(y * (1 - newFactor));
        this._mapMoveBy(dx, dy)
    },
    _mapZoomCenterOn: function (x, y, level) {
        var oldScale = this.mapScale;
        this._applyZoom(level);
        var newFactor = this.mapScale / oldScale;
        this._centerOn(x * newFactor, y * newFactor)
    },
    _applyZoom: function (level) {
        this.mapScale = Math.min(this.zoomMax, Math.max(1, level));
        this._map.width(Math.round(this._map.data("startWidth") * this.mapScale)).height(Math.round(this._map.data("startHeight") * this.mapScale));
        this._layout.setAttribute("transform", "scale(" + this.mapScale + ")");
        this._onZoomChange();
        $(document).trigger(µ.events.MAP_ZOOM_CHANGED, this.mapScale)
    },
    _centerOn: function (x, y) {
        this._mapMoveTo(this.zoomWindowBounds.centerX - x, this.zoomWindowBounds.centerY - y)
    },
    _mapMoveBy: function (dx, dy) {
        this._mapMoveTo(this.mapBounds.left + dx, this.mapBounds.top + dy)
    },
    _mapMoveTo: function (x, y) {
        var sigWidth = this.sigBounds.width;
        var mapWidth = this.mapBounds.width;
        var minLeft = sigWidth - mapWidth;
        var newLeft = this.isWorldWide ? (x < minLeft ? x + mapWidth / 2 : x > 0 ? x - mapWidth / 2 : x) : Math.min(0, Math.max(minLeft, x));
        if (newLeft + mapWidth < sigWidth) newLeft = 0;
        var minTop = this.sigBounds.height - this.mapBounds.height;
        var newTop = Math.min(0, Math.max(minTop, y));
        this._map.css({
            "left": newLeft + "px",
            "top": newTop + "px"
        });
        var mapHasChanged = this._updateMapBounds();
        if (!mapHasChanged) return;
        if (this.isWorldWide) this._swapElements();
        $(document).trigger(µ.events.MAP_MOVE, null)
    },
    _reCenterMap: function (lat, lng) {
        var oldScale = this.mapScale;
        this._mapZoomFocusedOn(0, 0, 0);
        this._mapZoomFocusedOn(0, 0, oldScale);
        this.centerOn(lat, lng)
    },
    _getProjectionBounds: function (geoArea) {
        if (geoArea == undefined) {
            geoArea = this._mapMaxArea
        }
        var lngMinToPx = this._projection([geoArea.lngMin, 0])[0];
        var lngMaxToPx = this._projection([geoArea.lngMin + geoArea.width, 0])[0];
        var latMinToPx = this._projection([0, geoArea.latMax - geoArea.height])[1];
        var latMaxToPx = this._projection([0, geoArea.latMax])[1];
        return {
            xMin: lngMinToPx,
            xMax: lngMaxToPx,
            width: lngMaxToPx - lngMinToPx,
            yMin: latMinToPx,
            yMax: latMaxToPx,
            height: latMinToPx - latMaxToPx
        }
    },
    _updateCurrentForecast: function () {},
    _getSigCenter: function () {
        var x = (this.sigBounds.width / 2 - this.mapBounds.left) / this.mapScale;
        var y = (this.sigBounds.height / 2 - this.mapBounds.top) / this.mapScale;
        return {
            "x": x,
            "y": y,
            "lat": this._projection.getLat(x, y),
            "lng": this._projection.getLng(x, y)
        }
    },
    _rescaleTracks: function () {
        if (this._tracks) {
            this._tracks.attr("stroke-width", 1 / this.mapScale)
        }
    },
    _pointIsVisible: function (x, y, expand) {
        if (!expand) var expand = 0;
        var outerX = x * this.mapScale + this.mapBounds.left;
        var outerY = y * this.mapScale + this.mapBounds.top;
        return (outerX >= -expand) && (outerX <= (this.sigBounds.width + expand)) && (outerY >= -expand) && (outerY <= (this.sigBounds.height + expand))
    },
    _initShapes: function (shapesData) {
        var tt = µ.getTimer();
        this._shapes = [];
        for (var i = 0; i < shapesData.length; i++) {
            var polygon = new µ.geo.GeoPolygon(shapesData[i]);
            this._shapes.push(polygon)
        }
    },
    _onTimelineChange: function (timecode) {
        $.each(this._moveElements, function (index, ele) {
            ele.moveTo(timecode)
        });
        $.each(this._timeElements, function (index, ele) {
            ele.setVisibilityAt(timecode)
        });
        this._currentTimecode = timecode;
        if (this.isWorldWide) this._swapElements()
    },
    _onZoomChange: function () {
        var that = this;
        this._updateMapBounds();
        this._updateElementsScales()
    },
    _updateSigBounds: function () {
        if (document.getElementById("sig") == null) return;
        var offset = this._sig.offset();
        var position = this._sig.position();
        var rect = document.getElementById("sig").getBoundingClientRect();
        this.sigBounds = {
            absLeft: offset.left,
            absTop: offset.top,
            absRight: offset.left + rect.width,
            absBottom: offset.top + rect.height,
            left: position.left,
            top: position.top,
            right: position.left + rect.width,
            bottom: position.top + rect.height,
            width: rect.width,
            height: rect.height,
            centerX: position.left + rect.width / 2,
            centerY: position.top + rect.height / 2
        };
        if (document.getElementById("zoomwindow") == null) {
            this.zoomWindowBounds = this.sigBounds
        } else {
            var zoomWindow = $("#zoomwindow");
            var offset = zoomWindow.offset();
            var position = zoomWindow.position();
            var rect = zoomWindow[0].getBoundingClientRect();
            this.zoomWindowBounds = {
                absLeft: offset.left,
                absTop: offset.top,
                absRight: offset.left + rect.width,
                absBottom: offset.top + rect.height,
                left: position.left,
                top: position.top,
                right: position.left + rect.width,
                bottom: position.top + rect.height,
                width: rect.width,
                height: rect.height,
                centerX: position.left + rect.width / 2,
                centerY: position.top + rect.height / 2
            }
        }
    },
    _updateMapBounds: function () {
        if (document.getElementById("map") == null) return;
        var mapOffset = this._map.offset();
        var mapPosition = this._map.position();
        var rect = document.getElementById("map").getBoundingClientRect();
        var oldBounds = this.mapBounds;
        this.mapBounds = {
            absLeft: mapOffset.left,
            absTop: mapOffset.top,
            left: mapPosition.left,
            top: mapPosition.top,
            width: rect.width * (this.isWorldWide ? 2 : 1),
            height: rect.height
        };
        this.centerX = this.sigBounds.width / 2 - this.mapBounds.left;
        var hasChanged = oldBounds == null || this.mapBounds.left != oldBounds.left || this.mapBounds.top != oldBounds.top || this.mapBounds.width != oldBounds.width || this.mapBounds.height != oldBounds.height;
        return hasChanged
    },
    _updateProjection: function () {
        var width = this._sig.width();
        var height = this._sig.height();
        this._projection.update(this.mapArea, {
            width: width,
            height: height
        });
        this.worldWidth = this._projection.worldWidth;
        this.isOverAntiMeridian = (this.mapArea.width < 350) && ((this.mapArea.left + this.mapArea.width) > 180);
        width = this._projection.getX(0, this.mapArea.left + this.mapArea.width) - this._projection.getX(0, this.mapArea.left);
        height = this._projection.getY(this.mapArea.top - this.mapArea.height, 0) - this._projection.getY(this.mapArea.top, 0);
        this._map.width(width).height(height).data({
            "startWidth": width,
            "startHeight": height
        });
        if (this.isWorldWide) {
            $.each(this._boats, function (index, boat) {
                boat.track.updatePaths();
                boat.trackSTM.updatePaths();
                boat.routing.updatePaths()
            });
            $.each(this._raceReferences, function (index, ref) {
                ref.track.updatePaths()
            })
        }
    },
    _redrawMap: function () {
        this._groundLayer.empty();
        var nbPoly = this._shapes == null ? 0 : this._shapes.length;
        for (var i = 0; i < nbPoly; i++) {
            var poly = new µ.geo.GeoPolygon(this._shapes[i]);
            var nbCoords = poly.length;
            var commands = [];
            var commandsRight = [];
            for (var j = 0; j < nbCoords; j++) {
                var lng = poly[j][0];
                var lat = poly[j][1];
                var x = this._projection.getX(lat, lng);
                var y = this._projection.getY(lat, lng);
                commands.push(x + " " + y);
                if (this.isWorldWide) commandsRight.push((x + this.worldWidth) + " " + y)
            }
            var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("rel", i + 2);
            this._groundLayer.append($(path).attr("d", "M" + commands.join("L") + (this.isWorldWide ? "M" + commandsRight.join("L") : "")))
        }
    },
    _redrawBathymetry: function () {
        if (!this._bathyconfig) return;
        var area = this._bathyconfig.area;
        var xMin = this.getX(area.top, area.left);
        var xMax = this.getX(area.top, area.left + area.width);
        var yMin = this.getY(area.top - area.height, area.left);
        var yMax = this.getY(area.top, area.left);
        var scaleX = Math.abs(xMax - xMin) / this._bathyconfig.size.width;
        var scaleY = Math.abs(yMax - yMin) / this._bathyconfig.size.height;
        document.getElementById("bathyLayer").setAttribute("transform", "translate(" + xMin + " " + yMax + ") scale(" + scaleX + " " + scaleY + ")")
    },
    _updateElementsScales: function () {
        $.each(this._moveElements, function (index, boat) {
            boat.updateScale()
        });
        $.each(this._raceGates, function (index, gate) {
            gate.updateScale()
        });
        $.each(this._raceReferences, function (index, ref) {
            ref.updateScale()
        });
        $.each(this._poiLayers, function (index, layer) {
            layer.updateScale()
        });
        $.each(this._timeElements, function (index, ele) {
            ele.updateScale()
        });
        $.each(this._miscElements, function (index, ele) {
            ele.updateScale()
        });
        $.each(this._pathElements, function (index, ele) {
            ele.updateScale()
        });
        this.route.updateScale();
        this.rule.updateAnchors()
    },
    _updateElementsPositions: function () {
        var that = this;
        $.each(this._moveElements, function (index, ele) {
            ele.updatePosition();
            if (ele.track) {
                ele.track.updateCommands();
                ele.track.updatePath(that._currentTimecode)
            }
            if (ele.trackSTM) {
                ele.trackSTM.updateCommands();
                ele.trackSTM.updatePath(that._currentTimecode)
            }
            if (ele.routing) {
                ele.routing.updateCommands();
                ele.routing.updatePath(5000000000)
            }
        });
        $.each(this._raceGates, function (index, gate) {
            gate.updateTag()
        });
        $.each(this._raceReferences, function (index, ref) {
            ref.updatePosition()
        });
        $.each(this._poiLayers, function (index, layer) {
            layer.updatePosition()
        });
        $.each(this._timeElements, function (index, ele) {
            ele.updatePosition()
        });
        $.each(this._miscElements, function (index, ele) {
            ele.updatePosition()
        });
        $.each(this._pathElements, function (index, ele) {
            ele.updatePath()
        });
        this.route.updatePath();
        this.rule.updateAnchors()
    },
    _swapElements: function () {
        $.each(this._moveElements, function (index, ele) {
            ele.swapPosition()
        });
        $.each(this._raceGates, function (index, gate) {
            gate.swapPositions()
        });
        $.each(this._raceReferences, function (index, ref) {
            ref.swapPositions()
        });
        $.each(this._poiLayers, function (index, layer) {
            layer.swapPosition()
        });
        $.each(this._timeElements, function (index, ele) {
            ele.swapPosition()
        });
        $.each(this._miscElements, function (index, ele) {
            ele.swapPosition()
        });
        this.rule.swapAnchors()
    },
    _DEBUG_traceTouchOnMap: function (evt) {
        var point = document.getElementById("pointclicked");
        if (point == null) {
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("id", "pointclicked");
            circle.setAttribute("cx", 0);
            circle.setAttribute("cy", 0);
            circle.setAttribute("r", 1);
            circle.setAttribute("fill", "#FFFFFF");
            this._layout.appendChild(circle);
            point = document.getElementById("pointclicked")
        };
        var geo = this.mapEventToProjPoint(evt);
        point.setAttribute("transform", "translate(" + geo.x + " " + geo.y + ") scale(" + 1 / this.mapScale + ")")
    }
};
sig.tiledmap = {
    leafletPath: "assets/javascript/leaflet/",
    navionicsApiKey: "",
    _map: null,
    _isInit: false,
    _isLoaded: false,
    _leafletCredits: null,
    _navionicsLayer: null,
    _navionicsCredits: null,
    _changeTimeout: null,
    initLeafletPath: function (path) {
        if (path != undefined) this.leafletPath = path
    },
    display: function () {
        var that = this;
        $("body").addClass("LEAFLET" + (this.navionicsApiKey != "" ? " NAVIONICS" : ""));
        this._init();
        this._onMapChange();
        $(document).on(µ.events.MAP_MOVE + ".leaflet " + µ.events.MAP_ZOOM_CHANGED + ".leaflet", function (evt) {
            if (evt.type == µ.events.MAP_MOVE) {
                that._onMapChange()
            } else {
                if (that._changeTimeout) window.clearTimeout(that._changeTimeout);
                $("#leaflet").hide();
                that._changeTimeout = window.setTimeout(function () {
                    $("#leaflet").show();
                    that._onMapChange()
                }, 300)
            }
        });
        if (this._leafletCredits) this._leafletCredits.show()
    },
    hide: function () {
        $("body").removeClass("LEAFLET");
        $(document).off(µ.events.MAP_MOVE + ".leaflet " + µ.events.MAP_ZOOM_CHANGED + ".leaflet");
        if (this._leafletCredits) this._leafletCredits.hide();
        if (this._navionicsCredits) this._navionicsCredits.hide()
    },
    displayNavionics: function () {
        var that = this;
        if (this._navionicsLayer != null) {
            $("#navionicsOption").removeClass("waiting");
            this._navionicsLayer.addTo(this._map);
            if (this._navionicsCredits) this._navionicsCredits.show();
            this._onMapChange()
        } else {
            $("#navionicsOption").addClass("waiting");
            $.getScript("https://webapiv2.navionics.com/dist/webapi/webapi.min.no-dep.js").done(function (script, textStatus) {
                that._initNavionicsLeyer()
            })
        }
    },
    hideNavionics: function () {
        this._map.removeLayer(this._navionicsLayer);
        if (this._navionicsCredits) this._navionicsCredits.hide()
    },
    _init: function () {
        if (this._isInit) return;
        this._load();
        this._isInit = true
    },
    _load: function () {
        if (this.__isLoaded) return;
        this._isLoaded = true;
        var that = this;
        $("<link>", {
            rel: "stylesheet",
            type: "text/css",
            href: this.leafletPath + "leaflet.css"
        }).appendTo('head');
        $("<link>", {
            rel: "stylesheet",
            type: "text/css",
            href: this.leafletPath + "webapi.min.css"
        }).appendTo('head');
        $.getScript(this.leafletPath + "leaflet.js").done(function (script, textStatus) {
            that._initMap()
        })
    },
    _initMap: function () {
        this._map = L.map('leaflet', {
            zoomSnap: 0.001,
            zoomAnimation: false,
            fadeAnimation: true,
            inertia: false,
            zoomControl: false
        });
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' + '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' + 'Imagery © <a href="http://mapbox.com">Mapbox</a>',
            id: 'mapbox.streets'
        }).addTo(this._map);
        this._onMapChange();
        var that = this;
        $("#navionicsOption>input").on("click", function () {
            var isChecked = ($(this).is(":checked"));
            if (isChecked) {
                that.displayNavionics()
            } else {
                that.hideNavionics()
            }
        });
        this._leafletCredits = $("#leaflet div.leaflet-control-attribution").attr("id", "leafletcredits").appendTo($("#sig"))
    },
    _onMapChange: function () {
        if (this._map == null) return;
        var area = sig.getWindowArea();
        this._map.fitBounds([
            [area.top - area.height, area.left],
            [area.top, area.left + area.width]
        ], {
            animate: false
        })
    },
    _initNavionicsLeyer: function () {
        this._navionicsLayer = new JNC.Leaflet.NavionicsOverlay({
            navKey: this.navionicsApiKey,
            chartType: JNC.NAVIONICS_CHARTS.NAUTICAL,
            isTransparent: false,
            zIndex: 1
        });
        this.displayNavionics();
        this._navionicsCredits = $("<div id='navionicscredits'></div>").append($("#leaflet .jnc-navionics-overlay-logo")).append($("#leaflet .jnc-navionics-overlay-ackno")).appendTo($("#sig"))
    }
};
sig.route = {
    tag: null,
    rect: null,
    segments: [],
    _polygons: [],
    _dash_1: -1,
    _dash_2: -2,
    _strokeWidth: 0.5,
    init: function (definition, noSpline) {
        var that = this;
        var lines = definition.split("|");
        this.controls = [];
        this._polygons = [];
        for (var i = 0; i < lines.length; i++) {
            var controls = [];
            var points = lines[i].split(";");
            var previousLng = Number(points[0].split(",")[1]);
            var swapLng = 0;
            $.each(points, function (i, point) {
                var coords = point.split(",");
                if (coords.length == 2) {
                    var lat = Number(coords[0]);
                    var lng = Number(coords[1]);
                    if (Math.abs(lng - previousLng) > 180) swapLng = swapLng != 0 ? 0 : previousLng > lng ? 360 : -360;
                    controls.push([lat, lng + swapLng]);
                    previousLng = lng
                }
            });
            this.segments.push(controls);
            if (noSpline) {
                this._polygons.push(controls)
            } else {
                this._polygons.push(µ.math.getSpline(controls, 1000000))
            }
        }
        this._buildTag();
        this.updatePath()
    },
    updatePath: function () {
        if (this.tag == undefined) return;
        var commands = [];
        this.rect = {
            xMin: Number.MAX_VALUE,
            xMax: Number.MIN_VALUE,
            yMin: Number.MAX_VALUE,
            yMax: Number.MIN_VALUE
        };
        var worldWidth = sig.worldWidth;
        for (var i = 0; i < this._polygons.length; i++) {
            var points = this._polygons[i];
            for (var j = 0; j < points.length; j++) {
                var point = points[j];
                var lat = point[0];
                var lng = point[1];
                var x = sig.getX(lat, lng);
                var y = sig.getY(lat, lng);
                this.rect.xMin = Math.min(this.rect.xMin, x);
                this.rect.xMax = Math.max(this.rect.xMax, x);
                this.rect.yMin = Math.min(this.rect.yMin, y);
                this.rect.yMax = Math.max(this.rect.yMax, y)
            }
            commands.push(sig.getSvgPathCommands(points))
        }
        this.tag.setAttribute("d", commands.join(""));
        this.updateScale()
    },
    updateScale: function () {
        if (this.tag == null) return;
        this.tag.setAttribute("stroke-width", this._strokeWidth / sig.mapScale);
        if (this._dash_1 > 0) this.tag.setAttribute("stroke-dasharray", (this._dash_1 / sig.mapScale) + "," + (this._dash_2 / sig.mapScale))
    },
    _buildTag: function () {
        this.tag = document.createElementNS("http://www.w3.org/2000/svg", "path");
        var dashes = $("#orthoLayer").css("stroke-dasharray").replace(/\s/gi, "").split(",");
        if (dashes.length == 2) {
            this._dash_1 = Number(dashes[0]) || 6;
            this._dash_2 = Number(dashes[1]) || 2
        }
        this._strokeWidth = Number($("#orthoLayer").css("stroke-width").replace("px", "")) || 0.5
    }
};
sig.daynight = {
    _tag: null,
    _history: null,
    _visible: false,
    _timecode: -1,
    init: function () {
        var that = this;
        this._tag = document.getElementById("daynightLayer");
        $(document).on(µ.events.TIMELINE_CHANGE, function (evt, timecode) {
            that._onTimelineChange(timecode)
        })
    },
    setHistory: function (history) {
        var currentTimecode = history[0];
        var previousDate = null;
        var currentDate = null;
        this._history = [];
        for (var i = 1; i < history.length; i++) {
            currentDate = {
                "timecode": currentTimecode,
                "lat": history[i],
                "next": null
            };
            this._history.push(currentDate);
            if (previousDate != null) previousDate.next = currentDate;
            currentTimecode += 24 * 3600;
            previousDate = currentDate
        }
    },
    update: function (plot) {
        var that = this;
        var lat = Number(plot[0]);
        var lng = Number(plot[1]);
        var closeLat = lat > 0 ? sig.mapArea.top - sig.mapArea.height - 1 : sig.mapArea.top + 1;
        var commands = [];
        var points = [
            [(90 - Math.abs(lat)) * (lat > 0 ? 1 : -1), -180],
            [0, -90],
            [(90 - Math.abs(lat)) * (lat > 0 ? -1 : 1), 0],
            [0, 90],
            [(90 - Math.abs(lat)) * (lat > 0 ? 1 : -1), 180]
        ];
        var limit = [points[0]];
        var previousPoint = null;
        $.each(points, function (index, point) {
            if (previousPoint != null) limit = limit.concat(µ.geo.getGreatCircle(previousPoint, point, 100, false, 0));
            previousPoint = point
        });
        var x;
        var y;
        var worldWidth = sig.worldWidth;
        commandsLeft = [];
        commandsCenter = [];
        commandsRight = [];
        commandsRight2 = [];
        $.each(limit, function (index, point) {
            x = sig.getX(point[0], point[1] + lng, true);
            y = sig.getY(point[0], point[1] + lng);
            commandsLeft.push((x - worldWidth) + " " + y);
            commandsCenter.push(x + " " + y);
            commandsRight.push((x + worldWidth) + " " + y);
            commandsRight2.push((x + worldWidth * 2) + " " + y)
        });
        commands = commandsLeft.concat(commandsCenter).concat(commandsRight).concat(commandsRight2);
        var firstPoint = limit[0];
        x = sig.getX(closeLat, firstPoint[1]);
        y = sig.getY(closeLat, firstPoint[1]);
        commands.unshift((x - worldWidth) + " " + y);
        var lastPoint = limit[limit.length - 1];
        x = sig.getX(closeLat, lastPoint[1]);
        y = sig.getY(closeLat, lastPoint[1]);
        commands.push((x + worldWidth * 2) + " " + y);
        this._tag.setAttribute("d", "M" + commands.join("L"))
    },
    display: function () {
        this._visible = true;
        if (this._history != null) this._onTimelineChange();
        $(this._tag).show()
    },
    hide: function () {
        this._visible = false;
        $(this._tag).hide()
    },
    redraw: function () {
        if (this._visible && this._history != null) this._onTimelineChange()
    },
    _onTimelineChange: function (timecode) {
        if (timecode == null) var timecode = this._timecode;
        this._timecode = timecode;
        if (!this._visible || this._history == null || this._history.length == 0) return;
        var previous = $.grep(this._history, function (value, index) {
            return value.timecode < timecode
        }).pop();
        if (previous == null) previous = this._history[0];
        var next = previous == null ? null : previous.next;
        if (next == null) next = this._history[0];
        if (next == null) return;
        var dt_a = 1 / (next.timecode - previous.timecode);
        var dt_b = previous.timecode / (previous.timecode - next.timecode);
        var ratio = dt_a * timecode + dt_b;
        var lat = previous.lat + (next.lat - previous.lat) * ratio;
        var lng = -((timecode % (24 * 3600) / 3600) - 12) * 15;
        this.update([lat, lng])
    }
};
sig.rule = {
    isActive: false,
    dy: 0,
    __classAnchorIsInit: false,
    _isInit: false,
    _container: null,
    _tip: null,
    _tipUnit: "",
    _firstAnchor: null,
    _lastAnchor: null,
    _activeAnchor: null,
    _distance: 0,
    _ortho: null,
    _dash_1: -1,
    _dash_2: -2,
    _isSpline: false,
    _renewOnClickOutside: false,
    display: function (renewOnClickOutside, anchorsDef) {
        this._renewOnClickOutside = renewOnClickOutside || false;
        if (!this._isInit) this._init();
        this._container.empty().append(this._ortho).show();
        if (anchorsDef != undefined && anchorsDef.length > 0) {
            var previous = null;
            for (var i = 0; i < anchorsDef.length; i++) {
                var lat = anchorsDef[i][0];
                var lng = anchorsDef[i][1];
                var anchor = new sig.rule.Anchor(lat, lng, true);
                this._container.append(anchor.tag);
                anchor.updatePosition();
                anchor.swapPosition();
                if (i == 0) this._firstAnchor = anchor;
                if (i == anchorsDef.length - 1) this._lastAnchor = anchor;
                if (previous != null) previous.setNext(anchor);
                previous = anchor
            };
            this._activeAnchor = null
        }
        this._drawOrtho();
        this._updateOrthoScale();
        this._startListeners();
        this.isActive = true
    },
    hide: function () {
        this._container.empty().hide();
        this._ortho.setAttribute("d", "");
        this._firstAnchor = null;
        this._stopListeners();
        this.isActive = false
    },
    isPersistent: function () {
        return this._isSpline && this._firstAnchor != null
    },
    start: function (evt) {
        var evtType = evt.originalEvent.type;
        if (evtType == "mousedown" && evt.which != 1) return false;
        if ((this._isSpline || (this._firstAnchor != null && !this._renewOnClickOutside)) && this._activeAnchor == null) return false;
        var that = this;
        this._setDy();
        if (this._activeAnchor == null) {
            var geoPoint = sig.mapEventToGeoPoint(evt);
            var projPoint = sig.mapEventToProjPoint(evt);
            this._firstAnchor = new sig.rule.Anchor(geoPoint.lat, geoPoint.lng, true);
            this._lastAnchor = new sig.rule.Anchor(geoPoint.lat, geoPoint.lng, true);
            this._firstAnchor.setNext(this._lastAnchor);
            this._activeAnchor = this._lastAnchor;
            this._firstAnchor.updatePosition();
            this._lastAnchor.updatePosition();
            this._firstAnchor.setPosition(projPoint.x, projPoint.y);
            this._lastAnchor.setPosition(projPoint.x, projPoint.y);
            this._firstAnchor.swapPosition();
            this._lastAnchor.swapPosition();
            this._container.empty().append(this._ortho, this._firstAnchor.tag, this._lastAnchor.tag);
            this._tip.empty().show();
            this._onDrag(evt)
        }
        $(document).on("mousemove.rule touchmove.rule", function (evt2) {
            that._onDrag(evt2)
        });
        $(document).on("mouseup.rule touchend.rule", function (evt2) {
            that._onRelease(evt2)
        });
        return true
    },
    updateAnchors: function () {
        if (!this.isActive) return;
        this._setDy();
        var anchor = this._firstAnchor;
        if (anchor == null) return;
        do {
            anchor.updatePosition();
            anchor = anchor.next
        } while (anchor != null);
        this._drawOrtho();
        this._updateOrthoScale()
    },
    swapAnchors: function () {
        if (this._firstAnchor == null) return;
        this._setDy();
        var anchor = this._firstAnchor;
        if (anchor == null) return;
        do {
            anchor.swapPosition();
            anchor = anchor.next
        } while (anchor != null);
        this._drawOrtho();
        this._updateOrthoScale()
    },
    updateVirtualAnchors: function (anchor) {
        if (anchor == undefined) anchor = this._activeAnchor;
        if (anchor == undefined) return;
        if (anchor.previous) {
            if (anchor.previous.isReal) {
                var midPoint = µ.geo.getMidPoint(anchor.previous.target, anchor.target);
                var virtualAnchor = new sig.rule.Anchor(midPoint[0], midPoint[1], false);
                anchor.previous.setNext(virtualAnchor);
                virtualAnchor.setNext(anchor);
                virtualAnchor.updatePosition();
                virtualAnchor.swapPosition();
                this._container.append(virtualAnchor.tag)
            } else {
                var midPoint = µ.geo.getMidPoint(anchor.previous.previous.target, anchor.target);
                anchor.previous.setTarget(midPoint[0], midPoint[1]);
                anchor.previous.updatePosition();
                anchor.previous.swapPosition()
            }
        }
        if (anchor.next) {
            if (anchor.next.isReal) {
                var midPoint = µ.geo.getMidPoint(anchor.target, anchor.next.target);
                var virtualAnchor = new sig.rule.Anchor(midPoint[0], midPoint[1], false);
                virtualAnchor.setNext(anchor.next);
                anchor.setNext(virtualAnchor);
                virtualAnchor.updatePosition();
                virtualAnchor.swapPosition();
                this._container.append(virtualAnchor.tag)
            } else {
                var midPoint = µ.geo.getMidPoint(anchor.target, anchor.next.next.target);
                anchor.next.setTarget(midPoint[0], midPoint[1]);
                anchor.next.updatePosition();
                anchor.next.swapPosition()
            }
        }
    },
    _init: function () {
        var that = this;
        this._container = $("#ruleLayer");
        this._ortho = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this._tip = $("#ruleTip");
        this._tipUnit = this._tip.attr("rel");
        var dashes = this._container.css("stroke-dasharray").replace(/\s/gi, "").split(",");
        if (dashes.length == 2) {
            this._dash_1 = Number(dashes[0]) || 6;
            this._dash_2 = Number(dashes[1]) || 2
        }
        $(document).on(µ.events.RULE_ANCHOR_MOUSE_EVENT, function (evt, data) {
            that._onAnchorEvent(data)
        });
        sig.addInteractiveLayerManager(this);
        this._isInit = true
    },
    _startListeners: function () {
        var that = this;
        $(document).on("keydown.rule", function (evt) {
            if (evt.which == 32) {
                that.isActive = false
            } else if (evt.altKey && evt.which == ("R".charCodeAt(0))) {
                that._copyRoute()
            } else if (evt.altKey && evt.which == ("S".charCodeAt(0))) {
                that._toggleSpline()
            } else if (evt.altKey && evt.which == ("C".charCodeAt(0))) {
                that._copyToClipboard()
            }
        }).on("keyup.rule", function (evt) {
            if (evt.which == 32) that.isActive = true
        })
    },
    _stopListeners: function () {
        $(document).off("keydown.rule keyup.rule")
    },
    _onDrag: function (evt) {
        var projPoint = sig.mapEventToProjPoint(evt);
        var sigPoint = sig.mapEventToSigPoint(evt);
        this._activeAnchor.setPosition(projPoint.x, projPoint.y);
        this._activeAnchor.swapPosition();
        this._activeAnchor.setReal(true);
        if (evt.type == "mousemove") this.updateVirtualAnchors();
        this._updateTip(sigPoint.x, sigPoint.y);
        this._drawOrtho();
        $(document).trigger(µ.events.RULE_ANCHOR_DRAGGING, this._activeAnchor)
    },
    _onRelease: function (evt) {
        $(document).off("mousemove.rule touchmove.rule mouseup.rule touchend.rule");
        this._tip.hide();
        this._activeAnchor = null
    },
    _onAnchorEvent: function (anchorEvent) {
        var anchor = anchorEvent.anchor;
        var evt = anchorEvent.evt;
        var point = sig.mapEventToSigPoint(evt);
        switch (evt.originalEvent.type) {
        case "mouseout":
        case "touchend":
            this._tip.hide();
            break;
        case "mouseover":
            this._updateTip(point.x, point.y);
            this._tip.show();
            if (this._isSpline) this._activeAnchor = anchor;
            break;
        case "mousedown":
            this._activeAnchor = anchor;
            this.updateVirtualAnchors();
            break;
        case "touchstart":
            this._activeAnchor = anchor;
            this._updateTip(point.x, point.y);
            this._tip.show();
            break;
        case "dblclick":
            this._removeAnchor(anchor);
            break
        }
    },
    _updateOrthoScale: function () {
        this._ortho.setAttribute("stroke-width", 1 / sig.mapScale);
        if (this._dash_1 > 0) this._ortho.setAttribute("stroke-dasharray", (this._dash_1 / sig.mapScale) + "," + (this._dash_2 / sig.mapScale))
    },
    _drawOrtho: function () {
        if (this._firstAnchor == null) return;
        var polygon = [this._firstAnchor.target];
        var anchor = this._firstAnchor;
        while (anchor.next) {
            if (this._isSpline) {
                if (anchor.next.isReal) polygon.push(anchor.next.target)
            } else {
                polygon = polygon.concat(µ.geo.getGreatCircle(anchor.target, anchor.next.target, 100, false, 0))
            }
            anchor = anchor.next
        }
        if (this._isSpline) polygon = µ.math.getSpline(polygon, 1000000);
        this._ortho.setAttribute("d", sig.getSvgPathCommands(polygon))
    },
    _updateTip: function (x, y) {
        var distance = 0;
        var anchor = this._firstAnchor;
        while (anchor.next) {
            distance += µ.geo.getOrthodromy(anchor.target, anchor.next.target);
            anchor = anchor.next
        }
        this._tip.empty().append(µ.toNumber(distance, " ¤2¤.") + " " + this._tipUnit).css({
            "left": (x + 5) + "px",
            "top": (y - 18 + (µ.IS_TOUCHE_DEVICE ? -50 : 0)) + "px"
        })
    },
    _setDy: function () {
        this.dy = µ.IS_TOUCHE_DEVICE ? -50 / sig.mapScale : 0
    },
    _removeAnchor: function (anchor) {
        if (!anchor.isReal || !anchor.previous || !anchor.next) return;
        anchor.previous.tag.remove();
        anchor.next.tag.remove();
        anchor.tag.remove();
        anchor.previous.previous.setNext(anchor);
        anchor.setNext(anchor.next.next);
        this._activeAnchor = anchor.previous;
        anchor.previous.setNext(anchor.next);
        anchor.previous = anchor.next = null;
        this.updateVirtualAnchors();
        this._drawOrtho();
        this._activeAnchor = null
    },
    _copyRoute: function () {
        var nbRouteSegments = sig.route.segments.length;
        if (nbRouteSegments == 0) return;
        this._container.empty().append(this._ortho);
        this._isSpline = true;
        var index = 0;
        if (nbRouteSegments > 1) {
            var index = window.prompt("Index of polygon to copy :");
            if (isNaN(index)) index = 0;
            index = Math.max(0, Math.min(index, nbRouteSegments - 1))
        }
        var segment = sig.route.segments[index];
        var previousAnchor = null;
        this._firstAnchor = null;
        this._lastAnchor = null;
        for (var i = 0; i < segment.length; i++) {
            var currentControl = segment[i];
            this._lastAnchor = new sig.rule.Anchor(currentControl[0], currentControl[1], true);
            this._container.append(this._lastAnchor.tag);
            this._lastAnchor.updatePosition();
            this._lastAnchor.swapPosition();
            if (previousAnchor != null) previousAnchor.setNext(this._lastAnchor);
            previousAnchor = this._lastAnchor;
            if (this._firstAnchor == null) this._firstAnchor = this._lastAnchor;
            this._activeAnchor = this._lastAnchor;
            this.updateVirtualAnchors()
        }
        this._drawOrtho()
    },
    _toggleSpline: function () {
        this._isSpline = !this._isSpline;
        this._drawOrtho()
    },
    _copyToClipboard: function () {
        var anchor = this._firstAnchor;
        var content = [];
        while (anchor) {
            if (anchor.isReal) content.push((Math.round(anchor.target[0] * 100000) / 100000) + "," + (Math.round(anchor.target[1] * 100000) / 100000));
            anchor = anchor.next
        }
        µ.clipboard.show($("#sig").parent(), content.join(";"))
    }
};
sig.gridlines = {
    _SUBDIVISIONS: [1, 2, 5, 10, 15, 20, 30, 60, 90, 180],
    _isInit: false,
    _active: false,
    _tag: null,
    _path: null,
    _group: null,
    display: function () {
        var that = this;
        if (!this._isInit) this._init();
        this._active = true;
        $(document).on(µ.events.MAP_ZOOM_CHANGED, function (evt, level) {
            that.update()
        }).on(µ.events.MAP_MOVE, function (evt) {
            that.update()
        });
        this.update();
        this._tag.show()
    },
    hide: function () {
        this._tag.hide();
        this._active = false
    },
    update: function () {
        if (!this._active) return;
        var left = sig.mapBounds.left / sig.mapScale;
        var top = sig.mapBounds.top / sig.mapScale;
        var areaLatMax = sig.getLat(-left, -top);
        var areaLngMin = sig.getLng(-left, -top);
        var areaWidth = Math.abs(sig.getLng(sig.sigBounds.width / sig.mapScale, 0) - sig.getLng(0, 0));
        var width = sig.sigBounds.width;
        var height = sig.sigBounds.height;
        var maxLines = width / 60;
        var unitFactor = 1;
        var numberOfUnits = areaWidth;
        while (numberOfUnits < maxLines) {
            unitFactor *= 60;
            numberOfUnits *= 60
        }
        var gridStep = numberOfUnits / maxLines;
        for (var i = 0; i < 10; i++)
            if (this._SUBDIVISIONS[i] >= gridStep) break;
        gridStep = this._SUBDIVISIONS[i];
        var unitStep = gridStep / unitFactor;
        this._group.empty();
        var dx = this._tag.css("text-align") == "right" ? sig.sigBounds.width - 55 : 5;
        var dy = this._tag.css("vertical-align") == "bottom" ? sig.sigBounds.height - 10 : 15;
        var commands = [];
        var text;
        var lat = (Math.round(areaLatMax / unitStep) + 1) * unitStep;
        do {
            var y = sig.getOuterY(lat, 0);
            if (y >= 0 && y <= height) {
                commands.push("0 " + y + "h" + width);
                this._group.append(this._getText(lat, dx, y, "start", true))
            }
            lat -= unitStep
        } while (y < height);
        var lng = (Math.floor(areaLngMin / unitStep) - 1) * unitStep;
        do {
            var x = sig.getOuterX(0, lng);
            commands.push(x + " 0v" + height);
            this._group.append(this._getText(lng > 180 ? lng - 360 : lng, x, dy, "middle", false));
            lng += unitStep
        } while (x < width);
        this._path.attr("d", "M" + commands.join("M"))
    },
    _getText: function (value, x, y, align, isLat) {
        var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        var positive = value >= 0;
        var secondsTotal = Math.round(Math.abs(value * 3600));
        var degrees = Math.floor(secondsTotal / 3600);
        var minutes = Math.floor(secondsTotal % 3600 / 60);
        var seconds = Math.floor(secondsTotal % 3600 / 60 / 60);
        var content = degrees + "°" + ("00" + minutes).substr(-2) + "'" + ("00" + seconds).substr(-2) + (isLat ? (positive ? "N" : "S") : (positive ? "E" : "W"));
        text.textContent = content.replace("°00'00", "°").replace("'00", "");
        text.setAttribute("text-anchor", align);
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        return text
    },
    _init: function () {
        this._tag = $("#gridlines");
        this._path = $("#gridlines path");
        this._group = $("#gridlines g");
        this._isInit = true
    }
};
sig.weather = {
    LOCAL_URL: "data/weather/",
    isActive: false,
    _isInit: false,
    _$streamLayer: null,
    _streamLayer: null,
    _$colorsLayer: null,
    _colorsLayer: null,
    _colorCanvas: null,
    _updateTimeout: null,
    _mapChangeTimeout: null,
    _surface: 1,
    _ratio: 1,
    _streamlines: null,
    _nbPartFc: µ.math.getLinearFc(65000, 1000, 1300000, 6000),
    _speedFc: µ.math.getLinearFc(65000, 0.06, 1300000, 0.1),
    _agingFc: µ.math.getLinearFc(65000, 4, 1300000, 1.2),
    _palettes: {
        "LIGHT": ["#FFFFFF", "#15C8E8", "#13EABA", "#30E815", "#D3EF0E", "#E8B415", "#E86415", "#B40800", "#930400", "#9404A1", "#470077"],
        "DARK": ["#C1C1C1", "#0F97AF", "#0EB18C", "#2AA129", "#9FB50A", "#AF880F", "#AF4B0F", "#880600", "#6F0300", "#70037A", "#470077"],
        "STREAM": ["#C1C1C1", "#008EBD", "#00BD89", "#00B900", "#97B700", "#E8B400", "#BD4700", "#AC0026", "#970004", "#840081", "#470077"]
    },
    _colors: null,
    _currentForecast: null,
    _forecastsByTimecode: {},
    _forecastTimeout: null,
    _currentForecast: null,
    _forecastToDisplay: null,
    init: function () {
        var that = this;
        this._$streamLayer = $("#streamlines");
        this._streamLayer = this._$streamLayer.get(0);
        this._$colorsLayer = $("#weathercolorsLayer");
        this._colorsLayer = this._$colorsLayer.get(0);
        this._colorCanvas = document.createElement("canvas");
        this._isInit = true
    },
    setColors: function (paletteConfig) {
        var palette = this._palettes["LIGHT"];
        if (typeof (paletteConfig) == "string") {
            palette = this._palettes[paletteConfig] || palette
        } else if (typeof (paletteConfig) == "array") {
            palette = paletteConfig
        }
        this._colors = [];
        var alpha = 0.3;
        for (var i = 0; i < palette.length; i++) {
            var a = (i == 0 ? alpha * 0.2 : i == 1 ? alpha * 0.5 : alpha) * 255;
            var value = palette[i];
            var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
            this._colors.push({
                r: parseInt(rgb[1], 16),
                g: parseInt(rgb[2], 16),
                b: parseInt(rgb[3], 16),
                a: a
            })
        };
        return this._colors
    },
    getWindColor: function (windSpeed, withAlpha) {
        v = Math.min(10, Math.max(0, windSpeed / 4));
        var vSup = Math.min(Math.ceil(v), 10);
        var vInf = Math.max(vSup - 1, 0);
        var colorSup = this._colors[vSup];
        var colorInf = this._colors[vInf];
        return {
            r: Math.round(colorInf.r + (colorSup.r - colorInf.r) * (v - vInf)),
            g: Math.round(colorInf.g + (colorSup.g - colorInf.g) * (v - vInf)),
            b: Math.round(colorInf.b + (colorSup.b - colorInf.b) * (v - vInf)),
            a: Math.round(withAlpha ? colorInf.a + (colorSup.a - colorInf.a) * (v - vInf) : 255)
        }
    },
    setLocalUrl: function (url) {
        this.LOCAL_URL = url
    },
    getForecast: function (timecode) {
        var forecast = this._forecastsByTimecode[timecode];
        if (forecast == undefined) forecast = this._forecastsByTimecode[timecode] = new sig.Forecast(µ.WEBROOT + this.LOCAL_URL, timecode);
        return forecast
    },
    displayForecast: function (timecode) {
        if (!this.isActive) {
            this._startListeners();
            this.isActive = true
        }
        var forecast = this.getForecast(timecode);
        if (this._currentForecast == forecast) {
            $(document).trigger(µ.events.FORECAST_DISPLAYED, forecast.timecode);
            return
        }
        if (forecast.isLoaded) {
            this._treatForecast(forecast)
        } else {
            var that = this;
            window.clearTimeout(this._forecastTimeout);
            this._forecastToDisplay = forecast;
            this._forecastTimeout = setTimeout(function () {
                forecast.load(function () {
                    if (forecast == that._forecastToDisplay) {
                        that._treatForecast(forecast)
                    }
                })
            }, 100)
        }
    },
    hide: function () {
        this._stopListeners();
        if (this._streamlines) this._streamlines.stop();
        this._$colorsLayer.empty();
        this._currentForecast = null;
        this.isActive = false
    },
    getValueAt: function (lat, lng) {
        return this._currentForecast ? this._currentForecast.getValueAt(lat, lng) : null
    },
    _startListeners: function () {
        $(document).on(µ.events.SIG_IS_RESIZED + ".weather", function (evt) {
            that._resize()
        });
        var that = this;
        $(document).on(µ.events.MAP_MOVE + ".weather " + µ.events.MAP_ZOOM_CHANGED + ".weather", function (evt) {
            if (evt.type == µ.events.MAP_ZOOM_CHANGED && that._streamlines != null) that._streamlines.stop();
            window.clearTimeout(that._mapChangeTimeout);
            that._mapChangeTimeout = window.setTimeout(function () {
                that._update()
            }, 200)
        })
    },
    _stopListeners: function () {
        $(document).off(µ.events.SIG_IS_RESIZED + ".weather").off(µ.events.MAP_MOVE + ".weather").off(µ.events.MAP_ZOOM_CHANGED + ".weather")
    },
    _treatForecast: function (forecast) {
        this._currentForecast = forecast;
        if (!sig.Forecast.DEBUG) this._initStreamlines();
        this._drawColors();
        if (!sig.Forecast.DEBUG) this._update();
        $(document).trigger(µ.events.FORECAST_DISPLAYED, forecast.timecode)
    },
    _initStreamlines: function () {
        if (this._streamlines) this._streamlines.stop();
        var surface = sig.sigBounds.width * sig.sigBounds.height;
        this._ratio = sig.sigBounds.width / sig.sigBounds.height;
        var vectorField = new µ.VectorField(this._currentForecast.speedsGrid, this._currentForecast.anglesGrid, this._ratio, 60000);
        this._streamlines = new sig.Streamlines(vectorField, this._nbPartFc(surface), this._streamLayer);
        this._streamlines.speed = this._speedFc(surface);
    },
    _drawColors: function () {
        if (sig.Forecast.DEBUG) {
            var oldRaduis = this._currentForecast.speedsGrid.smoothRadius;
            this._currentForecast.speedsGrid.smoothRadius = 0.5;
            this._currentForecast.anglesGrid.smoothRadius = 0.5
        }
        var t = µ.getTimer();
        var area = µ.geo.getArea(this._currentForecast.area);
        area.top = Math.min(area.top, sig.mapArea.top);
        area.height = Math.min(area.height, sig.mapArea.height);
        var rect = sig.getRect(area);
        var drawFactor = sig.Forecast.DEBUG ? 10 : 1.5;
        var buffer = this._currentForecast.speedsGrid.getBufferRGBA(drawFactor, this._colors, this._currentForecast.area, rect);
        this._colorCanvas.width = buffer.width;
        this._colorCanvas.height = buffer.height;
        var idata = this._colorCanvas.getContext('2d').createImageData(buffer.width, buffer.height);
        idata.data.set(buffer);
        this._colorCanvas.getContext('2d').putImageData(idata, 0, 0);
        area.height += this._currentForecast.stepHeight;
        area.width += this._currentForecast.stepWidth;
        rect = sig.getRect(area);
        var scaleX = rect.width / buffer.width;
        var scaleY = rect.height / buffer.height;
        this._colorsLayer.setAttribute("transform", "translate(" + rect.left + " " + rect.top + ") scale(" + scaleX + " " + scaleY + ")");
        var dataUrl = this._colorCanvas.toDataURL();
        var img = document.getElementById("weatherColorImg");
        if (img == null) {
            img = document.createElementNS("http://www.w3.org/2000/svg", "image");
            img.setAttribute("id", "weatherColorImg");
            this._$colorsLayer.append(img)
        }
        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataUrl);
        img.setAttribute("width", this._colorCanvas.width + "px");
        img.setAttribute("height", this._colorCanvas.height + "px");
        if (sig.Forecast.DEBUG) {
            this._currentForecast.speedsGrid.smoothRadius = oldRaduis;
            this._currentForecast.anglesGrid.smoothRadius = oldRaduis
        }
    },
    _update: function () {
        if (this._currentForecast == null) return;
        var geoArea = this._currentForecast.getIntersectionWith(sig.getWindowArea(0.1));
        var dataArea = this._currentForecast.getDataArea(geoArea);
        var top = sig.getY(geoArea.top, geoArea.left) * sig.mapScale;
        var bottom = sig.getY(geoArea.top - geoArea.height, geoArea.left) * sig.mapScale;
        var left = sig.getX(geoArea.top, geoArea.left) * sig.mapScale;
        var right = sig.getX(geoArea.top, geoArea.left + geoArea.width) * sig.mapScale;
        this._$streamLayer.css({
            "left": left + "px",
            "top": top + "px"
        });
        this._streamLayer.left = left;
        this._streamLayer.top = top;
        this._streamLayer.width = right - left;
        this._streamLayer.height = bottom - top;
        this._streamlines.run(dataArea, geoArea)
    },
    _resize: function () {
        this._initStreamlines();
        this._drawColors(false);
        this._update()
    }
};
sig.selection = {
    isActive: false,
    _tag: null,
    _startPoint: null,
    _endPoint: null,
    _startGeoPoint: null,
    _endGeoPoint: null,
    _callback: null,
    display: function (callback) {
        if (!this._isInit) this._init();
        this._reset();
        this._container.empty().append(this._tag).show();
        this._startListeners();
        this._callback = callback;
        this.isActive = true
    },
    hide: function () {
        this._container.empty().hide();
        this._reset();
        this._stopListeners();
        this.isActive = false
    },
    start: function (evt) {
        var that = this;
        this._reset();
        this._startGeoPoint = sig.mapEventToGeoPoint(evt);
        this._startPoint = sig.mapEventToProjPoint(evt);
        this._tag.setAttribute("transform", "translate(" + this._startPoint.x + " " + this._startPoint.y + ")");
        $(document).on("mousemove.selection touchmove.selection", function (evt2) {
            that._onDrag(evt2)
        });
        $(document).on("mouseup.selection touchend.selection", function (evt2) {
            that._onRelease(evt2)
        });
        return true
    },
    _init: function () {
        var that = this;
        this._container = $("#selectionLayer");
        this._tag = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this._reset();
        sig.addInteractiveLayerManager(this);
        this._isInit = true
    },
    _reset: function () {
        this._tag.setAttribute("width", 0);
        this._tag.setAttribute("height", 0);
        this._tag.setAttribute("stroke-width", 0.5 / sig.mapScale)
    },
    _startListeners: function () {
        var that = this;
        $(document).on("keydown.selection", function (evt) {
            if (evt.which == 32) that.isActive = false
        }).on("keyup.selection", function (evt) {
            if (evt.which == 32) that.isActive = true
        }).on(µ.events.MAP_ZOOM_CHANGED, function (evt) {
            that._onMapZoomChange(evt)
        })
    },
    _stopListeners: function () {
        $(document).off(µ.events.MAP_ZOOM_CHANGED);
        $(document).off("keydown.selection keyup.selection")
    },
    _onDrag: function (evt) {
        this._endGeoPoint = sig.mapEventToGeoPoint(evt);
        this._endPoint = sig.mapEventToProjPoint(evt);
        var x = this._startPoint.x;
        var y = this._startPoint.y;
        var width = this._endPoint.x - x;
        var height = this._endPoint.y - y;
        if (width < 0) {
            x = this._endPoint.x;
            width = -width
        }
        if (height < 0) {
            y = this._endPoint.y;
            height = -height
        }
        this._tag.setAttribute("transform", "translate(" + x + " " + y + ")");
        this._tag.setAttribute("width", width);
        this._tag.setAttribute("height", height)
    },
    _onRelease: function (evt) {
        $(document).off("mousemove.selection touchmove.selection mouseup.selection touchend.selection");
        var xMin = this._startPoint.x;
        var yMin = this._startPoint.y;
        var xMax = this._endPoint.x;
        var yMax = this._endPoint.y;
        var latMax = this._startGeoPoint.lat;
        var lngMin = this._startGeoPoint.lng;
        if (xMax < xMin) {
            xMin = this._endPoint.x;
            xMax = this._startPoint.x;
            lngMin = this._endGeoPoint.lng
        }
        if (yMax < yMin) {
            yMin = this._endPoint.y;
            yMax = this._startPoint.y;
            latMax = this._endGeoPoint.lat
        }
        if (this._callback != null) this._callback({
            "rect": {
                "x": xMin,
                "y": yMin,
                "width": xMax - xMin,
                "height": yMax - yMin
            },
            "geo": {
                "top": latMax,
                "left": lngMin,
                "width": Math.abs(this._endGeoPoint.lng - this._startGeoPoint.lng),
                "height": Math.abs(this._endGeoPoint.lat - this._startGeoPoint.lat),
            }
        });
        this._reset()
    },
    _onMapZoomChange: function (evt) {
        this._tag.setAttribute("stroke-width", 0.5 / sig.mapScale)
    }
};
sig.pointer = {
    isActive: false,
    activate: function () {
        if (!this._isInit) this._init();
        this.isActive = true
    },
    desactivate: function () {
        this.isActive = false
    },
    start: function (evt) {
        return true
    },
    _init: function () {
        sig.addInteractiveLayerManager(this);
        this._isInit = true
    }
};
sig.PointElement = function (lat, lng) {
    var __package = sig;
    this.lat = lat || 0;
    this.lng = lng || 0;
    this.x = 0;
    this.y = 0;
    this.tag = null;
    this._scale = 1;
    this._position = "";
    if (!__package.__classPointElementIsInit) {
        var __class = __package.PointElement;
        var __proto = __class.prototype;
        __proto.updatePosition = function () {
            this.x = sig.getX(this.lat, this.lng);
            this.y = sig.getY(this.lat, this.lng);
            this._position = "translate(" + this.x + " " + this.y + ")";
            this.updateScale()
        };
        __proto.updateScale = function () {
            this._scale = (1 / sig.mapScale);
            this._updateTag()
        };
        __proto.swapPosition = function () {
            if (!sig.isWorldWide) return;
            var deltaX = sig.centerX - this.x * sig.mapScale;
            if (Math.abs(deltaX) > (sig.worldWidth / 2 * sig.mapScale)) {
                this.x += deltaX < 0 ? -sig.worldWidth : sig.worldWidth;
                this._position = "translate(" + this.x + " " + this.y + ")";
                this._updateTag()
            }
        };
        __proto.placeAt = function (lat, lng) {
            this.lat = lat;
            this.lng = lng;
            this.updatePosition()
        };
        __proto._updateTag = function () {
            this.tag.setAttribute("transform", this._position + " scale(" + this._scale + ")")
        };
        __package.__classPointElementIsInit = true
    };
};
sig.PointElement.INSTANCE = new sig.PointElement();
sig.PathElement = function (isClosed, definition) {
    var __package = sig;
    this.tag = null;
    this.$tag = null;
    this._scale = 1;
    this._points = [];
    this._isClosed = isClosed;
    this._closeCommand = isClosed ? "z" : "";
    this._dash_1 = -1;
    this._dash_2 = -2;
    if (!__package.__classPathElementIsInit) {
        var __class = __package.PathElement;
        var __proto = __class.prototype;
        __proto.reset = function () {
            this._points = [];
            this.tag.setAttribute("d", "")
        };
        __proto.setPoints = function (points) {
            this._points = points
        };
        __proto.addPoint = function (lat, lng) {
            this._points.push([lat, lng])
        };
        __proto.updatePath = function () {
            if (this._points.length == 0) return;
            var worldWidth = sig.worldWidth;
            var commands = [];
            var commandsRight = [];
            for (var j = 0; j < this._points.length; j++) {
                var point = this._points[j];
                var lat = point[0];
                var lng = point[1];
                var x = sig.getX(lat, lng);
                var y = sig.getY(lat, lng);
                commands.push(x + "," + y);
                if (sig.isWorldWide || sig.isOverAntiMeridian) commandsRight.push((x + worldWidth) + " " + y)
            }
            var d = commands.join("L") + this._closeCommand + (sig.isWorldWide ? "M" + commandsRight.join("L") + this._closeCommand : "");
            this.tag.setAttribute("d", d == "" ? "" : "M" + d);
            this.updateScale()
        };
        __proto.updateScale = function () {
            this.tag.setAttribute("stroke-width", 1 / sig.mapScale);
            if (this._dash_1 > 0) this.$tag.css("stroke-dasharray", (this._dash_1 / sig.mapScale) + "," + (this._dash_2 / sig.mapScale))
        };
        __proto.parseDash = function () {
            var dashes = this.$tag.css("stroke-dasharray").replace(/[^0-9\.,]/gi, "").split(",");
            if (dashes.length == 2) {
                this._dash_1 = Number(dashes[0]) || 6;
                this._dash_2 = Number(dashes[1]) || 2
            }
        };
        __proto._parse = function (def) {
            if (def == undefined || def == "") return;
            var points = def.split(";");
            for (var i = 0; i < points.length; i++) {
                var coords = points[i].split(",");
                this._points.push([Number(coords[0]), Number(coords[1])])
            }
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this.$tag = $(this.tag)
        };
        __package.__classPathElementIsInit = true
    };
    this._parse(definition);
    this._buildTag();
    this.updatePath()
};
sig.PathElement.INSTANCE = new sig.PathElement(false, null);
sig.rule.Anchor = function (lat, lng, isReal) {
    var __package = sig.rule;
    this.tag = null;
    this.target = [lat, lng];
    this.previous = null;
    this.next = null;
    this.isReal = isReal;
    this._x = 0;
    this._y = 0;
    this._scale = 0;
    if (!__package.__classAnchorIsInit) {
        var __class = __package.Anchor;
        var __proto = __class.prototype;
        __proto.setTarget = function (lat, lng) {
            this.target = [lat, lng]
        };
        __proto.setPosition = function (x, y) {
            this._x = x;
            this._y = y;
            this._scale = 1 / sig.mapScale;
            this._updateTag();
            this.target = [sig.getLat(x, y + __package.dy), sig.getLng(x, y + __package.dy)]
        };
        __proto.updatePosition = function () {
            var lat = this.target[0];
            var lng = this.target[1];
            this._x = sig.getX(lat, lng);
            this._y = sig.getY(lat, lng) - __package.dy;
            this._scale = 1 / sig.mapScale;
            this._updateTag()
        };
        __proto.swapPosition = function () {
            if (!sig.isWorldWide) return;
            var deltaX = sig.centerX - this._x * sig.mapScale;
            if (Math.abs(deltaX) > (sig.worldWidth / 2 * sig.mapScale)) {
                this._x += deltaX < 0 ? -sig.worldWidth : sig.worldWidth;
                this._updateTag()
            }
        };
        __proto.setNext = function (anchor) {
            this.next = anchor;
            anchor.previous = this
        };
        __proto.setReal = function (state) {
            this.isReal = state;
            this.tag.setAttribute("class", this.isReal ? "real" : "virtual")
        };
        __proto._build = function () {
            var that = this;
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("class", this.isReal ? "real" : "virtual");
            var cross = document.createElementNS("http://www.w3.org/2000/svg", "path");
            cross.setAttribute("d", µ.IS_TOUCHE_DEVICE ? "M-7 -50h14M0 0v-57" : "M-10 0h20M0-10v20");
            this.tag.appendChild(cross);
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", 0);
            circle.setAttribute("cy", 0);
            circle.setAttribute("r", µ.IS_TOUCHE_DEVICE ? 15 : 5);
            this.tag.appendChild(circle);
            $(this.tag).on("mousedown mouseup touchstart mouseover mouseout touchend dblclick", function (evt) {
                $(document).trigger(µ.events.RULE_ANCHOR_MOUSE_EVENT, {
                    "anchor": that,
                    "evt": evt
                })
            });
            $(document).trigger(µ.events.RULE_ANCHOR_CREATED, that)
        };
        __proto._updateTag = function () {
            this.tag.setAttribute("transform", "translate(" + this._x + " " + (this._y) + ") scale(" + this._scale + ")")
        };
        __package.__classAnchorIsInit = true
    };
    this._build()
};
sig.Boat = function (id, name, category, hulls, hullColors, trackColor) {
    var __package = sig;
    this.id = id;
    this.name = name;
    this.category = category;
    this.shortName = name;
    this.sailors = [];
    this.hulls = parseInt(hulls);
    this.tag = null;
    this.$tag = null;
    this.track = new sig.Track("trk_" + id, trackColor);
    this.trackSTM = new sig.Track("stm_" + id, trackColor);
    this.routing = new sig.Track("rtg_" + id, trackColor, 8, 3);
    this.routingAvailable = false;
    this.timecode = 0;
    this.lat = 0;
    this.lng = 0;
    this.x = 0;
    this.y = 0;
    this.heading = 0;
    this.timecodeHidden = Number.MAX_VALUE;
    this.hullColors = hullColors.replace(/#+/gi, "").split("|");
    this.hullColor = this.hullColors[0];
    this.trackColor = trackColor.replace(/#+/gi, "");
    this.lastMouseEvent = null;
    this._position = "";
    this._icon = null;
    this._text = null;
    this._isActive = false;
    this._visible = false;
    this._scale = 0.0;
    this._scaleRatio = 1;
    this._index = 0;
    this._displayable = true;
    if (!sig.__classBoatIsInit) {
        var __class = __package.Boat;
        var __proto = __class.prototype;
        var __SCALE_RATIOS = {
            off: 1.1,
            over: 1.2,
            on: 1.3
        };
        var __currentIndex = 0;
        var __maxIndex = 0;
        var __LEVEL_STEP = 0.00005;
        __proto.addSailor = function (fname, lname, nat, withPhoto) {
            this.sailors.push(new __package.Sailor(fname, lname, nat, withPhoto))
        };
        __proto.moveTo = function (timecode) {
            if (this.track.lastLocation == null) return;
            var location = this.track.updatePath(timecode);
            if (timecode > this.track.lastLocation.timecode && this.routingAvailable && this.routing.lastLocation != null) {
                location = this.routing.setPositionAt(timecode)
            }
            if (location) this.placeAt(location.timecode, location.lat, location.lng, location.heading);
            if (this._visible) {
                if (timecode >= this.timecodeHidden) this.hide()
            } else {
                if (timecode < this.timecodeHidden) this.display()
            }
            this.trackSTM.updatePath(timecode)
        };
        __proto.placeAt = function (timecode, lat, lng, heading) {
            this.timecode = timecode;
            this.lat = lat;
            this.lng = lng;
            this.heading = heading == null ? 0 : heading;
            this.updatePosition();
            this._updateIcon()
        };
        __proto.setHeading = function (heading) {
            this.heading = heading == null ? 0 : heading;
            this._updateIcon()
        };
        __proto.updatePosition = function () {
            this.x = sig.getX(this.lat, this.lng);
            this.y = sig.getY(this.lat, this.lng);
            this._position = "translate(" + this.x + " " + this.y + ")";
            this.updateScale()
        };
        __proto.swapPosition = function () {
            var deltaX = sig.centerX - this.x * sig.mapScale;
            if (Math.abs(deltaX) > (sig.worldWidth / 2 * sig.mapScale)) {
                this.x += deltaX < 0 ? -sig.worldWidth : sig.worldWidth;
                this._position = "translate(" + this.x + " " + this.y + ")";
                this._updateTag()
            }
        };
        __proto.updateScale = function (ratio) {
            this._scale = (1 / sig.mapScale * (ratio ? this._scaleRatio = ratio : this._scaleRatio));
            this._updateTag();
            this._updateIcon();
            this.track.updateScale();
            this.trackSTM.updateScale(3);
            this.routing.updateScale()
        };
        __proto.display = function (displayable) {
            if (displayable != undefined) this._displayable = displayable;
            if (!this._displayable) return;
            if (this._visible) {
                if (µ.TIMECODE >= this.timecodeHidden || !this._displayable) this.hide();
                return
            }
            if (µ.TIMECODE >= this.timecodeHidden) return;
            this.$tag.show();
            this.track.display();
            this.trackSTM.display();
            this._visible = true
        };
        __proto.hide = function (displayable) {
            if (displayable != undefined) this._displayable = displayable;
            if (!this._visible) return;
            this.$tag.hide();
            this.track.hide();
            this.trackSTM.hide();
            this._visible = false
        };
        __proto.focus = function () {
            if (!this._isActive) {
                this.updateScale(__SCALE_RATIOS.over);
                this.track.focus();
                this.trackSTM.focus();
                this.$tag.addClass("on")
            }
            this._putOnTop()
        };
        __proto.blur = function () {
            if (!this._isActive) {
                this.updateScale(__SCALE_RATIOS.off);
                this._putAtDefaultLevel();
                this.track.blur();
                this.trackSTM.blur();
                this.$tag.removeClass("on")
            }
            if (sig.activeBoat) sig.activeBoat.focus()
        };
        __proto.activate = function () {
            if (sig.activeBoat) sig.activeBoat.desactivate();
            this.updateScale(__SCALE_RATIOS.on);
            this.track.focus();
            this.trackSTM.focus();
            this._putOnTop();
            this.$tag.addClass("on");
            this._isActive = true;
            sig.activeBoat = this
        };
        __proto.desactivate = function () {
            this.updateScale(__SCALE_RATIOS.off);
            this.track.blur();
            this.trackSTM.blur();
            this._putAtDefaultLevel();
            this.$tag.removeClass("on");
            this._isActive = false
        };
        __proto.displayLabel = function (state) {
            if (this._text == null) this._buildTextTag(this.shortName);
            if (state) {
                this.tag.appendChild(this._text)
            } else {
                $(this._text).remove()
            }
        };
        __proto.updateLabel = function (text, filter) {
            if (!this._text) {
                this._buildTextTag(text)
            } else {
                this._text.textContent = text
            }
            if (filter != undefined && filter != "") {
                this._text.setAttribute("class", "on");
                this._text.setAttribute("filter", "url(#" + filter + ")")
            } else {
                this._text.removeAttribute("class");
                this._text.removeAttribute("filter")
            }
        };
        __proto.setSTMTrack = function (start, end) {
            var currentLoc = this.track.getLocationAt(start);
            if (currentLoc == null || currentLoc.next == null) return;
            while (currentLoc.timecode <= end) {
                this.trackSTM.addLocation(currentLoc.timecode, currentLoc.lat, currentLoc.lng);
                currentLoc = currentLoc.next
            }
            this.trackSTM.updatePath(this.timecode)
        };
        __proto.setDeepBind = function (eventName, func) {
            $(this._icon).off(eventName).on(eventName, func)
        };
        __proto._init = function () {
            this._index = ++__currentIndex;
            __maxIndex = Math.max(__maxIndex, __currentIndex + 1);
            this._buildTag()
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("id", "boat" + this.id);
            if (µ.IS_TOUCHE_DEVICE) {
                var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                this.tag.appendChild(circle);
                circle.setAttribute("cx", 0);
                circle.setAttribute("cy", 0);
                circle.setAttribute("r", 14)
            }
            var iconModelName = "boat_hull_" + this.hulls;
            this._icon = sig.getSvgModel(iconModelName + (this.hullColors.length > 1 ? "_colors" : ""), iconModelName);
            var paths = $(this._icon).find("path");
            for (var i = 0; i < paths.length; i++) {
                $(paths[i]).attr("fill", "#" + this.hullColors[i])
            }
            this.tag.appendChild(this._icon);
            this.$tag = $(this.tag);
            this.updateScale(__SCALE_RATIOS.off);
            this._setTagEvents()
        };
        __proto._setTagEvents = function () {
            var that = this;
            $(this._icon).on("mouseover", function (evt) {
                that.focus();
                $(document).trigger(µ.events.BOAT_OVER, that)
            }).on("mouseout", function (evt) {
                that.blur();
                $(document).trigger(µ.events.BOAT_OUT, that)
            }).on("click", function (evt) {
                that.activate();
                $(document).trigger(µ.events.BOAT_CLICK, that)
            });
            $(this.tag).on("touchstart", function (evt) {
                that.activate();
                $(document).trigger(µ.events.BOAT_TOUCH, that)
            })
        };
        __proto._updateTag = function () {
            this.tag.setAttribute("transform", this._position + " scale(" + this._scale + ")")
        };
        __proto._updateIcon = function (scale) {
            this._icon.setAttribute("transform", "rotate(" + this.heading + ") scale(" + this._scaleRatio + ")")
        };
        __proto._putOnTop = function () {
            this.$tag.parent().append(this.$tag)
        };
        __proto._putAtDefaultLevel = function () {};
        __proto._buildTextTag = function (content) {
            this._text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            this._text.textContent = content;
            this._text.setAttribute("x", this.hulls == 1 || this.hulls == 4 ? 9 : 15);
            this._text.setAttribute("y", this.hulls == 1 || this.hulls == 4 ? -7 : -15)
        };
        sig.__classBoatIsInit = true
    };
    this._init()
};
sig.Sailor = function (fname, lname, nat, withPhoto) {
    var __package = sig;
    this.fname = fname;
    this.lname = lname;
    this.shortName = fname.replace(/^(\w{1})[^\- ]*(?:-(\w{1})[^\- ]*)*/gi, "$1$2") + "." + lname;
    this.nationality = nat || "";
    this.withPhoto = withPhoto;
    if (!__package.__classSailorIsInit) {
        var __class = __package.Sailor;
        var __proto = __class.prototype;
        __package.__classSailorIsInit = true
    };
};
sig.Track = function (id, color, dash1, dash2) {
    var __package = sig;
    this.id = id;
    this.color = color;
    this.locations = [];
    this.firstLocation = null;
    this.lastLocation = null;
    this.currentLocation = null;
    this.tag = null;
    this.$tag = null;
    this._isActive = false;
    this._fullCoordinates = [];
    this._nbLocs = 0;
    this._commands = [];
    this._defaultOpacity = -1;
    this._path = null;
    this._path2 = null;
    this._path3 = null;
    this._pathLeft = null;
    this._pathLeft2 = null;
    this._pathLeft3 = null;
    this._pathRight = null;
    this._pathRight2 = null;
    this._pathRight3 = null;
    this._dash_1 = Number(dash1) || 0;
    this._dash_2 = Number(dash2) || 0;
    this._antiMeridianCrossingSide = 0;
    if (!sig.__classTrackIsInit) {
        var __class = __package.Track;
        var __proto = __class.prototype;
        var __slicer = parseInt($("#tracksLayer").css("font-size"));
        var __slicing = __slicer > 0;
        __proto.setColor = function (color) {
            this.color = color;
            this.tag.setAttribute("stroke", "#" + color)
        };
        __proto.reset = function () {
            this.locations = [];
            this.firstLocation = null;
            this.lastLocation = null;
            this.currentLocation = null
        };
        __proto.parseLocations = function (trackdata, coordsFactor, isRelative) {
            this._nbLocs = trackdata.length;
            var previousLoc = null;
            var timecode = 0;
            var locdata;
            var currentLoc;
            var currentDate;
            var currentSegment = [];
            for (var index = 0; index < this._nbLocs; index++) {
                locdata = trackdata[index];
                timecode = locdata[0] + (isRelative ? timecode : 0);
                var lat = locdata[1] / coordsFactor + (isRelative && previousLoc ? previousLoc.lat : 0);
                var lng = locdata[2] / coordsFactor + (isRelative && previousLoc ? previousLoc.lng : 0);
                currentLoc = new sig.Location(timecode, lat, lng);
                currentLoc.index = index;
                this.locations.push(currentLoc);
                this._fullCoordinates.push([currentLoc.lng, currentLoc.lat]);
                currentLoc.previous = previousLoc;
                if (previousLoc != null) previousLoc.setNext(currentLoc);
                previousLoc = currentLoc
            }
            this.firstLocation = this.locations[0];
            this.lastLocation = this.locations[this._nbLocs - 1];
            this.currentLocation = this.lastLocation;
            this.updateCommands()
        };
        __proto.addLocations = function (trackdata, coordsFactor, isRelative) {
            if (this.lastLocation == null) {
                this.parseLocations(trackdata, coordsFactor, isRelative);
                return
            }
            var nbLocs = trackdata.length;
            var previousLoc = this.lastLocation;
            var timecode = this.lastLocation.timecode;
            var locdata;
            var currentLoc;
            var currentDate;
            for (var i = 0; i < nbLocs; i++) {
                locdata = trackdata[i];
                timecode = locdata[0] + (isRelative ? timecode : 0);
                if (timecode > previousLoc.timecode) {
                    var lat = locdata[1] / coordsFactor + (isRelative && previousLoc ? previousLoc.lat : 0);
                    var lng = locdata[2] / coordsFactor + (isRelative && previousLoc ? previousLoc.lng : 0);
                    currentLoc = new sig.Location(timecode, lat, lng);
                    currentLoc.index = previousLoc.index + 1;
                    this.locations.push(currentLoc);
                    this._fullCoordinates.push([currentLoc.lng, currentLoc.lat]);
                    currentLoc.previous = previousLoc;
                    previousLoc.setNext(currentLoc);
                    previousLoc = currentLoc
                }
            }
            this._nbLocs = this.locations.length;
            this.lastLocation = this.locations[this._nbLocs - 1];
            this.currentLocation = this.lastLocation;
            this.updateCommands()
        };
        __proto.addLocation = function (timecode, lat, lng) {
            var previousLoc = this.lastLocation;
            var currentLoc = new sig.Location(timecode, lat, lng);
            currentLoc.index = previousLoc ? previousLoc.index + 1 : 0;
            this.locations.push(currentLoc);
            this._fullCoordinates.push([currentLoc.lng, currentLoc.lat]);
            currentLoc.previous = previousLoc;
            if (previousLoc) previousLoc.setNext(currentLoc);
            this._nbLocs = this.locations.length;
            this.firstLocation = this.locations[0];
            this.lastLocation = this.locations[this._nbLocs - 1];
            this.currentLocation = this.lastLocation;
            this.updateCommands();
            return currentLoc
        };
        __proto.getLocationAt = function (timecode) {
            return this._getLocationAt(timecode)
        };
        __proto.getPositionAt = function (timecode) {
            return this._getPositionAt(timecode, false)
        };
        __proto.setPositionAt = function (timecode) {
            return this._getPositionAt(timecode, true)
        };
        __proto.updateCommands = function () {
            this._commands = this.locations.map(function (location) {
                return location.setCommand()
            });
            this._getAntiMeridianSide();
            this.updatePaths()
        };
        __proto.updatePath = function (timecode) {
            if (this.currentLocation == null) return;
            var currentLoc = this._getPositionAt(timecode, true);
            if (currentLoc == null) return;
            var commands1 = this._commands.slice(0, currentLoc.index + 1).join("L");
            if (__slicing) {
                var commands2 = this._commands.slice(Math.max(0, currentLoc.index - __slicer * 3), currentLoc.index + 1).join("L");
                var commands3 = this._commands.slice(Math.max(0, currentLoc.index - __slicer), currentLoc.index + 1).join("L")
            }
            if (timecode > this.currentLocation.timecode) {
                var currentLocCommand = "L" + currentLoc.setCommand();
                commands1 += currentLocCommand;
                if (__slicing) {
                    commands2 += currentLocCommand;
                    commands3 += currentLocCommand
                }
            }
            if (this._isActive || !__slicing) this._path.setAttribute("d", "M" + commands1);
            if (__slicing) {
                this._path2.setAttribute("d", "M" + commands2);
                this._path3.setAttribute("d", "M" + commands3)
            }
            if (sig.isWorldWide) {
                if (this._isActive || !__slicing) {
                    this._pathLeft.setAttribute("d", "M" + commands1);
                    this._pathRight.setAttribute("d", "M" + commands1)
                }
                if (__slicing) {
                    this._pathLeft2.setAttribute("d", "M" + commands2);
                    this._pathRight2.setAttribute("d", "M" + commands2);
                    this._pathLeft3.setAttribute("d", "M" + commands3);
                    this._pathRight3.setAttribute("d", "M" + commands3)
                }
            }
            return currentLoc
        };
        __proto.updatePaths = function () {
            if (!sig.isWorldWide) return;
            var delta1 = this._antiMeridianCrossingSide == 1 ? -sig.worldWidth : sig.worldWidth;
            var delta2 = this._antiMeridianCrossingSide == 1 ? sig.worldWidth : sig.worldWidth * 2;
            this._pathLeft.setAttribute("transform", "translate(" + delta1 + " 0)");
            this._pathLeft2.setAttribute("transform", "translate(" + delta1 + " 0)");
            this._pathLeft3.setAttribute("transform", "translate(" + delta1 + " 0)");
            this._pathRight.setAttribute("transform", "translate(" + delta2 + " 0)");
            this._pathRight2.setAttribute("transform", "translate(" + delta2 + " 0)");
            this._pathRight3.setAttribute("transform", "translate(" + delta2 + " 0)")
        };
        __proto.updateScale = function (ratio) {
            if (this._dash_1 > 0) this.tag.setAttribute("stroke-dasharray", (this._dash_1 / sig.mapScale) + "," + (this._dash_2 / sig.mapScale));
            this.tag.setAttribute("stroke-width", (ratio || 1) / sig.mapScale)
        };
        __proto.activate = function () {
            this._isActive = true
        };
        __proto.display = function () {
            this.$tag.addClass("visible");
            if (this._defaultOpacity < 0) this._defaultOpacity = this.$tag.css("stroke-opacity")
        };
        __proto.hide = function () {
            this.$tag.removeClass("visible")
        };
        __proto.focus = function () {
            this._isActive = true;
            this.updatePath(µ.TIMECODE);
            this.$tag.addClass("on")
        };
        __proto.blur = function () {
            this._isActive = false;
            this.$tag.removeClass("on")
        };
        __proto._init = function () {
            var that = this;
            this._buildTag();
            if (sig.isWorldWide) this.updatePaths()
        };
        __proto._getLocationAt = function (timecode) {
            var currentLoc = this.currentLocation;
            var found = false;
            if (timecode == currentLoc.timecode) {} else if (timecode > currentLoc.timecode) {
                while (!found) {
                    currentLoc = currentLoc.next;
                    found = currentLoc == null || timecode <= currentLoc.timecode
                };
                if (currentLoc == null) currentLoc = this.lastLocation
            } else if (timecode < currentLoc.timecode) {
                while (!found) {
                    currentLoc = currentLoc.previous;
                    found = currentLoc == null || timecode >= currentLoc.timecode
                };
                if (currentLoc == null) currentLoc = this.firstLocation
            }
            return currentLoc
        };
        __proto._getPositionAt = function (timecode, setCurrent) {
            var currentLoc = this._getLocationAt(timecode);
            if (currentLoc == null) return null;
            if (timecode < currentLoc.timecode && currentLoc.previous !== null) currentLoc = currentLoc.previous;
            if (setCurrent) this.currentLocation = currentLoc;
            if (timecode > currentLoc.timecode) currentLoc = currentLoc.getLocationAt(timecode);
            return currentLoc
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("id", this.id);
            this._path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this._path.setAttribute("class", "n1");
            this._path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this._path2.setAttribute("class", "n2");
            this._path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this._path3.setAttribute("class", "n3");
            this.tag.appendChild(this._path);
            this.tag.appendChild(this._path2);
            this.tag.appendChild(this._path3);
            if (sig.isWorldWide) {
                this._pathLeft = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this._pathLeft.setAttribute("class", "n1");
                this._pathLeft2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this._pathLeft2.setAttribute("class", "n2");
                this._pathLeft3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this._pathLeft3.setAttribute("class", "n3");
                this.tag.appendChild(this._pathLeft);
                this.tag.appendChild(this._pathLeft2);
                this.tag.appendChild(this._pathLeft3);
                this._pathRight = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this._pathRight.setAttribute("class", "n1");
                this._pathRight2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this._pathRight2.setAttribute("class", "n2");
                this._pathRight3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                this._pathRight3.setAttribute("class", "n3");
                this.tag.appendChild(this._pathRight);
                this.tag.appendChild(this._pathRight2);
                this.tag.appendChild(this._pathRight3)
            }
            if (this.color) this.tag.setAttribute("stroke", "#" + this.color);
            this.$tag = $(this.tag)
        };
        __proto._getAntiMeridianSide = function () {
            if (!sig.isWorldWide) return;
            var previousLng = this.firstLocation ? this.firstLocation.lng : 0;
            var nbLocs = this.locations.length;
            var side = 1;
            for (var i = 0; i < nbLocs; i++) {
                var lng = this.locations[i].lng;
                if (Math.abs(previousLng - lng) > 300) {
                    side = previousLng < 0 ? -1 : 1;
                    break
                }
                previousLng = lng
            }
            this._antiMeridianCrossingSide = side
        };
        sig.__classTrackIsInit = true
    };
    this._init()
};
sig.Location = function (timecode, lat, lng) {
    var __package = sig;
    this.index = -1;
    this.previous = null;
    this.next = null;
    this.timecode = timecode;
    this.lat = lat;
    this.lng = lng;
    this.heading = 0;
    this.command = "";
    this.crossingAntimeridian = false;
    this.swapXSign = 0;
    this._dLat = 0;
    this._dLng = 0;
    this._speed = null;
    this.dt_a = 0;
    this.dt_b = 0;
    if (!sig.__classLocationIsInit) {
        var __class = __package.Location;
        var __proto = __class.prototype;
        __proto.setCommand = function () {
            var lat = this.lat;
            var lng = this.lng;
            var swapX = this.swapXSign != 0 ? this.swapXSign * sig.worldWidth : 0;
            return this.command = (sig.getX(lat, lng) + swapX) + " " + sig.getY(lat, lng)
        };
        __proto.setNext = function (nextLoc) {
            this.next = nextLoc;
            this._dLat = nextLoc.lat - this.lat;
            this._dLng = nextLoc.lng - this.lng;
            this.next.crossingAntimeridian = sig.isWorldWide && Math.abs(this._dLng) > 180;
            this.next.swapXSign = this.next.crossingAntimeridian ? (this.swapXSign != 0 ? 0 : (this._dLng > 0 ? -1 : 1)) : this.swapXSign;
            if (this._dLng > 180) this._dLng -= 360;
            if (this._dLng < -180) this._dLng += 360;
            this.dt_a = this.timecode == nextLoc.timecode ? 0 : 1 / (nextLoc.timecode - this.timecode);
            this.dt_b = this.timecode == nextLoc.timecode ? 0 : this.timecode / (this.timecode - nextLoc.timecode);
            this.heading = µ.geo.getHeading(this.lat, this.lng, nextLoc.lat, nextLoc.lng);
            this.next.heading = this.heading
        };
        __proto.getLocationAt = function (timecode) {
            var ratio = this.dt_a * timecode + this.dt_b;
            var loc = new sig.Location(ratio == 0 ? this.timecode : timecode, this.lat + this._dLat * ratio, this.lng + this._dLng * ratio);
            loc.heading = this.heading;
            loc.index = this.index;
            if (sig.isWorldWide) {
                var dLng = loc.lng - this.lng;
                loc.crossingAntimeridian = sig.isWorldWide && Math.abs(dLng) > 180;
                loc.swapXSign = loc.crossingAntimeridian ? (this.swapXSign != 0 ? 0 : (dLng > 0 ? -1 : 1)) : this.swapXSign
            }
            return loc
        };
        __proto.getSpeed = function () {
            if (this._speed == null && this.previous != null) {
                this._speed = µ.geo.getOrthodromy([this.lat, this.lng], [this.previous.lat, this.previous.lng]) / (this.timecode - this.previous.timecode) * 3600
            }
            return this._speed
        };
        sig.__classLocationIsInit = true
    };
    this.setCommand()
};
sig.RaceArea = function (id, isLive, definition) {
    var __package = sig;
    this.id = id;
    this.isLive = isLive;
    this._polygon = null;
    sig.PathElement.call(this, true, definition);
    if (!__package.__classRaceAreaIsInit) {
        var __class = __package.RaceArea;
        var __proto = __class.prototype;
        __proto.contains = function (lat, lng) {
            if (this._polygon == null) {
                var newPoints = [];
                for (var i = 0; i < this._points.length; i++) {
                    var point = this._points[i];
                    newPoints.push([point[1], point[0]])
                }
                this._polygon = new µ.geo.GeoPolygon(newPoints)
            }
            return this._polygon.contains(lat, lng)
        };
        __proto._buildTag = function () {
            var that = this;
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this.tag.setAttribute("id", this.id);
            $(this.tag).on("mouseover", function (evt) {
                var tip = $("#areaTip");
                tip.empty().append(tip.data("translations")[that.id]).show();
                that._updateTip(evt);
                $(that.tag).on("mousemove", function (evt) {
                    that._updateTip(evt)
                })
            }).on("mouseout", function () {
                $("#areaTip").empty().hide();
                $(that.tag).off("mousemove")
            })
        };
        __proto._updateTip = function (evt) {
            var sigPoint = sig.mapEventToSigPoint(evt);
            $("#areaTip").css({
                "left": (sigPoint.x + 10) + "px",
                "top": (sigPoint.y - 10) + "px"
            })
        };
        __package.__classRaceAreaIsInit = true
    };
};
sig.RaceArea.prototype = Object.create(sig.PathElement.prototype);
sig.RaceGate = function (id, definition) {
    var __package = sig;
    this.id = id;
    this.tag = null;
    this._pointA = [];
    this._pointB = [];
    this._xA = 0;
    this._xB = 0;
    this._circleA = null;
    this._circleB = null;
    this._path = null;
    if (!__package.__classRaceGateIsInit) {
        var __class = __package.RaceGate;
        var __proto = __class.prototype;
        __proto.updateTag = function () {
            var commands = "";
            var worldWidth = sig.worldWidth;
            var latA = this._pointA[0];
            var lngA = this._pointA[1];
            this._xA = sig.getX(latA, lngA);
            var yA = sig.getY(latA, lngA);
            var latB = this._pointB[0];
            var lngB = this._pointB[1];
            this._xB = sig.getX(latB, lngB);
            var yB = sig.getY(latB, lngB);
            var commands = "M" + this._xA + "," + yA + "L" + this._xB + "," + yB;
            if (sig.isWorldWide) commands += "M" + (this._xA + worldWidth) + "," + yA + "L" + (this._xB + worldWidth) + "," + yB;
            this._circleA.setAttribute("cx", this._xA);
            this._circleA.setAttribute("cy", yA);
            this._circleB.setAttribute("cx", this._xB);
            this._circleB.setAttribute("cy", yB);
            this._path.setAttribute("d", commands);
            this.updateScale()
        };
        __proto.updateScale = function () {
            this._path.setAttribute("stroke-width", 1 / sig.mapScale);
            this._circleA.setAttribute("r", 4 / sig.mapScale);
            this._circleB.setAttribute("r", 4 / sig.mapScale)
        };
        __proto.swapPositions = function () {
            var deltaX;
            deltaX = sig.centerX - this._xA * sig.mapScale;
            if (Math.abs(deltaX) > (sig.worldWidth / 2 * sig.mapScale)) {
                this._xA += deltaX < 0 ? -sig.worldWidth : sig.worldWidth;
                this._circleA.setAttribute("cx", this._xA)
            }
            deltaX = sig.centerX - this._xB * sig.mapScale;
            if (Math.abs(deltaX) > (sig.worldWidth / 2 * sig.mapScale)) {
                this._xB += deltaX < 0 ? -sig.worldWidth : sig.worldWidth;
                this._circleB.setAttribute("cx", this._xB)
            }
        };
        __proto._parse = function (def) {
            var points = def.split(";");
            var coordsA = points[0].split(",");
            var coordsB = points[1].split(",");
            this._pointA = [Number(coordsA[0]), Number(coordsA[1])];
            this._pointB = [Number(coordsB[0]), Number(coordsB[1])]
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("id", this.id);
            this._circleA = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            this._circleA.setAttribute("r", 4 / sig.mapScale);
            this.tag.appendChild(this._circleA);
            this._circleB = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            this._circleB.setAttribute("r", 4 / sig.mapScale);
            this.tag.appendChild(this._circleB);
            this._path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            this.tag.appendChild(this._path)
        };
        __package.__classRaceGateIsInit = true
    };
    this._parse(definition);
    this._buildTag();
    this.updateTag()
};
sig.RaceReference = function (id, name, trackdata) {
    var __package = sig;
    this.id = id;
    this.name = name;
    this.trackdata = trackdata;
    this.track = new sig.Track("ref_" + id);
    this.plots = [];
    this._currentPlot = null;
    if (!__package.__classRaceReferenceIsInit) {
        var __class = __package.RaceReference;
        var __proto = __class.prototype;
        var __dash_1 = -1;
        var __dash_2 = -2;
        var dashes = $("#referencesLayer").css("stroke-dasharray").replace(/\s/gi, "").split(",");
        if (dashes.length == 2) {
            __dash_1 = Number(dashes[0]) || 6;
            __dash_2 = Number(dashes[1]) || 2
        };
        __proto.updatePosition = function () {
            this.track.updateCommands();
            this.track.updatePath(this.track.lastLocation.timecode);
            $.each(this.plots, function (index, plot) {
                plot.updatePosition()
            })
        };
        __proto.updateScale = function () {
            if (__dash_1 > 0) this.track.tag.setAttribute("stroke-dasharray", (__dash_1 / sig.mapScale) + "," + (__dash_2 / sig.mapScale));
            $.each(this.plots, function (index, plot) {
                plot.updateScale()
            });
            this.track.updateScale()
        };
        __proto.swapPositions = function () {
            $.each(this.plots, function (index, plot) {
                plot.swapPosition()
            })
        };
        __proto.addCurrentPlot = function () {
            var that = this;
            this._currentPlot = new sig.RaceReferencePlot(name, 0, Number.MAX_VALUE, this.track.firstLocation.lat, this.track.firstLocation.lng, this.track.color, 1.5);
            $(this._currentPlot.tag).addClass("currentPosition");
            this.plots.push(this._currentPlot);
            $(document).on(µ.events.TIMELINE_CHANGE, function (evt, timecode) {
                var location = that.track.getPositionAt(timecode);
                that._currentPlot.lat = location.lat;
                that._currentPlot.lng = location.lng;
                that._currentPlot.updatePosition();
                that._currentPlot.swapPosition()
            }).on(µ.events.REFERENCE_PLOT_MOUSE_EVENT, function (evt, plot) {
                that._currentPlot.swapPosition()
            });
            return this._currentPlot
        };
        __proto._initTrack = function () {
            var that = this;
            this.track.parseLocations(trackdata, 100000, true);
            this.track.activate();
            this.track.updatePath(this.track.lastLocation.timecode);
            this.track.tag.setAttribute("id", "ref_" + id);
            this.track.setColor = function (color) {
                that.track.color = color;
                that.track.tag.setAttribute("stroke", "#" + color);
                $.grep(that.plots, function (plot, index) {
                    plot.setColor(color)
                })
            }
        };
        __proto._initPlots = function () {
            var currentTimecode = this.track.firstLocation.timecode;
            var endTimecode = this.track.lastLocation.timecode;
            var index = 1;
            while (currentTimecode <= endTimecode) {
                currentTimecode += 86400;
                var location = this.track.getPositionAt(currentTimecode);
                this.plots.push(new sig.RaceReferencePlot(name, index, 0, location.lat, location.lng, this.track.color, 1));
                index++
            }
        };
        __package.__classRaceReferenceIsInit = true
    };
    this._initTrack();
    this._initPlots()
};
sig.RaceReferencePlot = function (name, index, timecode, lat, lng, color, scaleFactor) {
    var __package = sig;
    sig.PointElement.call(this, lat, lng);
    this.name = name;
    this.index = index;
    this.timecode = timecode;
    this.$tag = null;
    this._scaleFactor = scaleFactor || 1;
    this._triggerVar = {
        "plot": this,
        "type": "",
        "name": name,
        "index": index
    };
    this._visible = true;
    if (!__package.__classRaceReferencePlotIsInit) {
        var __class = __package.RaceReferencePlot;
        var __proto = __class.prototype;
        __proto.setColor = function (color) {
            this.tag.setAttribute("fill", "#" + color)
        };
        __proto.setVisibilityAt = function (timecode) {
            if (this.timecode <= timecode) {
                if (!this._visible) {
                    this._visible = true;
                    $(this.tag).show()
                }
            } else {
                if (this._visible) {
                    this._visible = false;
                    $(this.tag).hide()
                }
            }
        };
        __proto._buildTag = function (color) {
            var that = this;
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", 0);
            circle.setAttribute("cy", 0);
            circle.setAttribute("r", 3);
            if (color) circle.setAttribute("style", "fill:#" + color);
            this.tag.appendChild(circle);
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", 0);
            circle.setAttribute("cy", 0);
            circle.setAttribute("r", µ.IS_TOUCHE_DEVICE ? 8 : 5);
            if (color) circle.setAttribute("style", "fill:#" + color);
            this.tag.appendChild(circle);
            var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", 7);
            text.setAttribute("y", -7);
            var nameParts = (this.name + (this.index > 0 ? "|" + $("#plotTip").attr("rel") + " " + this.index : "")).split("|");
            for (var i = 0; i < nameParts.length; i++) {
                var part = nameParts[i];
                var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan.textContent = part;
                tspan.setAttribute("x", 7);
                tspan.setAttribute("y", -7 - (nameParts.length - i - 1) * 15);
                text.appendChild(tspan)
            };
            this.tag.appendChild(text);
            this.$tag = $(this.tag).on("mouseover mouseout click touchend", function (evt) {
                that._triggerVar["type"] = evt.type;
                $(document).trigger(µ.events.REFERENCE_PLOT_MOUSE_EVENT, that._triggerVar)
            })
        };
        __package.__classRaceReferencePlotIsInit = true
    };
    this._buildTag(color);
    this.updatePosition()
};
sig.RaceReferencePlot.prototype = Object.create(sig.PointElement.prototype);
sig.PointOfInterestLayer = function (level, container) {
    var __package = sig;
    this.tag = null;
    this.level = level;
    this._points = [];
    this._container = container;
    if (!__package.__classPointOfInterestLayerIsInit) {
        var __class = __package.PointOfInterestLayer;
        var __proto = __class.prototype;
        __proto.addPoint = function (point) {
            if (point.layer != null) point.layer._points.splice(point.layer._points.indexOf(point), 1);
            this.tag.appendChild(point.tag);
            point.updatePosition();
            this._points.push(point);
            point.layer = this
        };
        __proto.removePoint = function (point) {
            this._points.splice(this._points.indexOf(point), 1);
            $(point.tag).remove();
            point.layer = null
        };
        __proto.updateScale = function () {
            if (this.level <= sig.mapScale * 100) {
                if (!this.tag.parentNode) this._container.prepend(this.tag);
                $.each(this._points, function (index, point) {
                    point.updateScale()
                })
            } else {
                if (this.tag.parentNode) this.tag.parentNode.removeChild(this.tag)
            }
        };
        __proto.updatePosition = function () {
            $.each(this._points, function (index, point) {
                point.updatePosition()
            })
        };
        __proto.swapPosition = function () {
            $.each(this._points, function (index, point) {
                point.swapPosition()
            })
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("rel", this.level)
        };
        __package.__classPointOfInterestLayerIsInit = true
    };
    this._buildTag()
};
sig.PointOfInterest = function (id, type, label, lat, lng, clock) {
    var __package = sig;
    sig.PointElement.call(this, lat, lng);
    this.id = id;
    this.tag = null;
    this.clock = clock;
    this.layer = null;
    this._label = label;
    this._type = type;
    this._text = null;
    this._isVirtual = false;
    this._isCentered = type == "area" || type == "ctry";
    if (!__package.__classPointOfInterestIsInit) {
        var __class = __package.PointOfInterest;
        var __proto = __class.prototype;
        var __clockX = [0, -1, 7, 10, 7, -1, 0, -1, -7, -10, -7, -1];
        var __clockY = [-9, -8, -5, 3, 11, 16, 17, 16, 11, 3, -5, -8];
        var __clockAlign = ["middle", "start", "start", "start", "start", "start", "middle", "end", "end", "end", "end", "end"];
        __proto.setClock = function (clockVal) {
            this.clock = clockVal % 12;
            this._text.setAttribute("x", this._isCentered ? 0 : __clockX[this.clock]);
            this._text.setAttribute("y", this._isCentered ? 3 : __clockY[this.clock]);
            this._text.setAttribute("text-anchor", this._isCentered ? "middle" : __clockAlign[this.clock])
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("id", this._type + "_" + this.id);
            this.tag.setAttribute("class", this._type);
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", 3);
            this.tag.appendChild(circle);
            var label = this._label;
            if (label.substr(0, 3) == "fr=") {
                var labelParts = label.split("|");
                var lang = $("body").attr("rel");
                label = "";
                for (var i = 0; i < labelParts.length; i++) {
                    var langLabelParts = labelParts[i].split("=");
                    label = langLabelParts[1];
                    if (langLabelParts[0] == lang) break
                }
            }
            this._text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            this._text.textContent = label;
            this.setClock(this.clock);
            this.tag.appendChild(this._text)
        };
        __package.__classPointOfInterestIsInit = true
    };
    this._buildTag()
};
sig.PointOfInterest.prototype = Object.create(sig.PointElement.prototype);
sig.GeoMedia = function (id, boatId, type, timecode, lat, lng, title, hat, content, credits) {
    var __package = sig;
    sig.PointElement.call(this, lat, lng);
    this.id = id;
    this.boatId = boatId;
    this.type = type;
    this.tag = null;
    this.timecode = timecode;
    this.title = title;
    this.hat = hat;
    this.content = content;
    this.credits = credits;
    this._inThePast = false;
    this._displayable = false;
    if (!__package.__classGeoMediaIsInit) {
        var __class = __package.GeoMedia;
        var __proto = __class.prototype;
        __proto.setVisibilityAt = function (timecode) {
            if (this.timecode <= timecode) {
                if (!this._inThePast) {
                    this._inThePast = true;
                    this._displayable ? this._showTag() : this._hideTag()
                }
            } else {
                if (this._inThePast) {
                    this._inThePast = false;
                    this._hideTag()
                }
            }
        };
        __proto.display = function () {
            if (this._inThePast) {
                this._showTag();
                this.swapPosition()
            }
            this._displayable = true
        };
        __proto.hide = function () {
            this._hideTag();
            this._displayable = false
        };
        __proto._buildTag = function () {
            var model = $(sig.getSvgModel("geomedia")).addClass("type" + this.type)[0];
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.appendChild(model);
            var that = this;
            $(this.tag).on("click touchend", function (evt) {
                $(document).trigger(µ.events.GEOMEDIA_CLICK, that)
            })
        };
        __proto._showTag = function () {
            $(this.tag).removeClass().addClass("visible")
        };
        __proto._hideTag = function () {
            $(this.tag).removeClass().addClass("hidden")
        };
        __package.__classGeoMediaIsInit = true
    };
    this._buildTag();
    this.updatePosition()
};
sig.GeoMedia.prototype = Object.create(sig.PointElement.prototype);
sig.Forecast = function (folder, timecode) {
    var __package = sig;
    this.timecode = timecode;
    this.isLoaded = false;
    this.isError = false;
    this.fileName = µ.toDate(timecode * 1000, "UTC:yyyymmdd'-'HHMMss'" + sig.Forecast.FILE_EXT + "'");
    this.longitudeMin;
    this.longitudeMax;
    this.latitudeMin;
    this.latitudeMax;
    this.area;
    this.width;
    this.height;
    this.stepWidth;
    this.stepHeight;
    this.values = {};
    this.speedsGrid = null;
    this.anglesGrid = null;
    this._headers = null;
    this._nbLines = -1;
    this._nbColumns = -1;
    this._url = folder + this.fileName + "?v=" + Math.round((new Date()).getTime() / 1000 / 60 / 10);
    if (!__package.__classForecastIsInit) {
        var __class = __package.Forecast;
        var __proto = __class.prototype;
        __proto.getHeaders = function () {
            return "-----------------------------------------------------\n" + this._url + "\n" + "timecode" + ":" + (µ.toDate(this.timecode * 1000, "UTC:yyyy/mm/dd HH:MM:ss'Z'")) + "\n" + "\n" + "latitudeMin" + ":" + this.latitudeMin + "\n" + "latitudeMax" + ":" + this.latitudeMax + "\n" + "\n" + "longitudeMin" + ":" + this.longitudeMin + "\n" + "longitudeMax" + ":" + this.longitudeMax + "\n" + "\n" + "width" + ":" + this.width + "\n" + "height" + ":" + this.height + "\n" + "\n" + "stepWidth" + ":" + this.stepWidth + "\n" + "stepHeight" + ":" + this.stepHeight + "\n" + "\n" + "nbColumns" + ":" + this._nbColumns + "\n" + "nbLines" + ":" + this._nbLines + "\n" + "-----------------------------------------------------\n" + "\n"
        };
        __proto.load = function (callback) {
            switch (sig.Forecast.FILE_EXT) {
            case ".png":
                this._loadPng(callback);
                break;
            case ".txt":
                this._loadTxt(callback);
                break;
            case ".gvw":
                this._loadGvw(callback)
            }
        };
        __proto.getValueAt = function (lat, lng) {
            var x = (lng - this.longitudeMin + (lng < this.longitudeMin ? 360 : 0)) / this.stepWidth;
            var y = (this.latitudeMax - lat) / this.stepHeight;
            var values = null;
            if (sig.Forecast.DEBUG) {
                values = {
                    speed: this.speedsGrid.getValAt(x, y),
                    origin: (this.anglesGrid.getValAt(x, y) + 360) % 360
                }
            } else {
                values = {
                    speed: this.speedsGrid.getSmoother(x, y, true),
                    origin: (this.anglesGrid.getSmoother(x, y) + 360) % 360
                }
            }
            return values
        };
        __proto.getIntersectionWith = function (geoArea) {
            var result = µ.geo.getArea(geoArea);
            if (result.left < (this.longitudeMin)) {
                result.width -= this.longitudeMin - result.left;
                result.left = this.longitudeMin
            }
            if ((result.left + result.width) > this.width + this.longitudeMin) {
                result.width = this.width + this.longitudeMin - result.left
            }
            if (result.top > (this.latitudeMin + this.height)) {
                result.height -= result.top - (this.latitudeMin + this.height);
                result.top = (this.latitudeMin + this.height)
            }
            if ((result.top - result.height) < this.latitudeMin) {
                result.height = result.top - this.latitudeMin
            }
            return result
        };
        __proto.getDataArea = function (geoArea) {
            return {
                i: (geoArea.left - this.longitudeMin) / this.stepWidth,
                j: (this.latitudeMin + this.height - geoArea.top) / this.stepHeight,
                width: geoArea.width / this.stepWidth,
                height: geoArea.height / this.stepHeight
            }
        };
        __proto._onLoaded = function () {
            if (sig.Forecast.DEBUG) console.log(this.getHeaders())
        };
        __proto._loadPng = function (callback) {
            var that = this;
            var img = new Image();
            img.src = this._url;
            img.onload = function () {
                that._onLoadedPng(img);
                that._onLoaded();
                if (typeof (callback) != 'undefined') callback()
            };
            img.onerror = function () {
                that.isError = true;
                if (typeof (callback) != 'undefined') callback()
            }
        };
        __proto._onLoadedPng = function (img) {
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var context = canvas.getContext('2d');
            context.imageSmoothingEnabled = context.webkitImageSmoothingEnabled = context.mozImageSmoothingEnabled = false;
            context.drawImage(img, 0, 0, img.width, img.height);
            var rgbaValues = canvas.getContext('2d').getImageData(0, 0, img.width, img.height).data;
            var dataIndex = 0;
            var readInt = function () {
                var value = (rgbaValues[dataIndex] << 16) + (rgbaValues[dataIndex + 1] << 8) + (rgbaValues[dataIndex + 2]);
                dataIndex += 4;
                return ((value > Math.pow(2, 23)) ? value - Math.pow(2, 24) : value)
            };
            var timecode = readInt();
            this.latitudeMax = readInt();
            this.longitudeMin = readInt();
            this.width = readInt();
            this.height = readInt();
            this._nbColumns = readInt();
            this._nbLines = readInt();
            this.latitudeMin = this.latitudeMax - this.height;
            this.longitudeMax = this.longitudeMin + this.width;
            this.stepWidth = this.width / (this._nbColumns - 1);
            this.stepHeight = this.height / (this._nbLines - 1);
            this.area = µ.geo.getArea(this.latitudeMax, this.latitudeMin, this.longitudeMin, this.longitudeMax);
            var dataWidth = img.width;
            var dataHeight = img.height - 1;
            var nbValues = dataWidth * dataHeight;
            var speeds = new Uint16Array(nbValues);
            var angles = new Uint16Array(nbValues);
            var offset = img.width * 4;
            for (var i = 0; i < nbValues; i++) {
                speeds[i] = (rgbaValues[offset + i * 4] << 4) + (rgbaValues[offset + i * 4 + 1] >> 4);
                angles[i] = ((rgbaValues[offset + i * 4 + 1] & 0x0F) << 8) + (rgbaValues[offset + i * 4 + 2])
            }
            this.speedsGrid = new µ.GridData(dataWidth, dataHeight, speeds, false, 0.1 * 1.852);
            this.anglesGrid = new µ.GridData(dataWidth, dataHeight, angles, true, 1);
            this._extendData(dataWidth, dataHeight);
            this.isLoaded = true
        };
        __proto._loadTxt = function (callback) {
            var that = this;
            $.get({
                url: this._url,
                data: "",
                success: function (data) {
                    that._onLoadedTxt(eval("(" + data + ")").wind);
                    that._onLoaded();
                    if (typeof (callback) != 'undefined') callback()
                }
            })
        };
        __proto._onLoadedTxt = function (wind) {
            var tt = new µ.Timer();
            var width = wind.count_x;
            var height = wind.count_y;
            this.speedsGrid = new µ.GridData(width, height, wind.speeds, false);
            this.anglesGrid = new µ.GridData(width, height, wind.angles, true);
            this._nbColumns = width;
            this._nbLines = height;
            this.longitudeMin = wind.cover_lon_min;
            this.longitudeMax = wind.cover_lon_max;
            this.latitudeMin = wind.cover_lat_min;
            this.latitudeMax = wind.cover_lat_max;
            this.width = this.longitudeMax - this.longitudeMin;
            this.height = this.latitudeMax - this.latitudeMin;
            this.stepWidth = this.width / (this._nbColumns - 1);
            this.stepHeight = this.height / (this._nbLines - 1);
            this.area = µ.geo.getArea(this.latitudeMax, this.latitudeMin, this.longitudeMin, this.longitudeMax);
            this._extendData();
            this.isLoaded = true
        };
        __proto._loadGvw = function (callback) {
            var that = this;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", this._url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function (e) {
                if (this.status == 200 && this.response != null) {
                    that._onLoadedGvw(new Uint8Array(this.response));
                    that._onLoaded();
                    if (typeof (callback) != 'undefined') callback()
                }
            };
            xhr.send()
        };
        __proto._onLoadedGvw = function (data) {
            this.isLoaded = true;
            var dataIndex = 0;
            var getString = function (nbChar) {
                var s = "";
                for (var i = 0; i < nbChar; i++) {
                    s += String.fromCharCode(data[dataIndex++])
                }
                return (s)
            };
            var getUint8 = function () {
                return data[dataIndex++]
            };
            var getInt32 = function () {
                var i = (data[dataIndex + 3] << 24) | (data[dataIndex + 2] << 16) | (data[dataIndex + 1] << 8) | data[dataIndex + 0];
                dataIndex += 4;
                return i
            };
            var getUint32 = function () {
                var i = ((data[dataIndex + 3] << 24) | (data[dataIndex + 2] << 16) | (data[dataIndex + 1] << 8) | data[dataIndex + 0]) >>> 0;
                dataIndex += 4;
                return i
            };
            var format = getString(3);
            this.timecode = getUint32();
            this.longitudeMin = getInt32();
            this.latitudeMax = getInt32();
            this.width = getInt32();
            this.height = getInt32();
            this._nbLines = getInt32();
            this._nbColumns = getInt32();
            this.latitudeMin = this.latitudeMax - this.height;
            this.longitudeMax = this.longitudeMin + this.width;
            this.stepWidth = this.width / (this._nbColumns - 1);
            this.stepHeight = this.height / (this._nbLines - 1);
            this.area = µ.geo.getArea(this.latitudeMax, this.latitudeMin, this.longitudeMin, this.longitudeMax);
            var arrayWidth = this._nbColumns;
            var arrayHeight = this._nbLines;
            var speeds = new Uint16Array(arrayWidth * arrayHeight);
            var angles = new Uint16Array(arrayWidth * arrayHeight);
            for (var j = arrayHeight - 1; j >= 0; j--) {
                for (var i = 0; i < arrayWidth; i++) {
                    var value = getUint8();
                    var force = (value >> 1);
                    var direction = (value & 0x1) * 0xFF + getUint8();
                    speeds[j * arrayWidth + i] = force;
                    angles[j * arrayWidth + i] = direction
                }
            }
            this.speedsGrid = new µ.GridData(arrayWidth, arrayHeight, speeds, false, (27 / 127) * 1.852);
            this.anglesGrid = new µ.GridData(arrayWidth, arrayHeight, angles, true, 1);
            this._extendData();
            this.isLoaded = true
        };
        __proto._extendData = function (dataWidth, dataHeight) {
            var isWorldWide = (this.longitudeMin == -180) && (this.longitudeMax == 180);
            if (isWorldWide) {
                this._nbColumns *= 2;
                this.longitudeMax += 360;
                this.width += 360;
                this.area.width = 720;
                this.area.right = 540;
                var newSpeeds = [];
                var newAngles = [];
                var arrayWidth = this.speedsGrid.width;
                for (var j = 0; j < dataHeight; j++) {
                    for (var i = 0; i < dataWidth; i++) {
                        var index1 = j * dataWidth + i;
                        var index2 = j * dataWidth * 2 + i;
                        newSpeeds[index2] = newSpeeds[index2 + arrayWidth] = this.speedsGrid.data[index1];
                        newAngles[index2] = newAngles[index2 + arrayWidth] = this.anglesGrid.data[index1]
                    }
                }
                this.speedsGrid.width *= 2;
                this.speedsGrid.data = newSpeeds;
                this.anglesGrid.width *= 2;
                this.anglesGrid.data = newAngles
            }
        };
        __package.__classForecastIsInit = true
    };
};
sig.Forecast.FILE_EXT = ".png";
sig.Forecast.DEBUG = false;
sig.Streamlines = function (vectorField, nbParticles, canvas, colors) {
    var __package = sig;
    this.vectorField = vectorField;
    this.speed = 0.1;
    this.ageing = 1.5;
    this.fading = 0.08;
    this.lineWidth = 0.5;
    this.color = '#FFFFFF';
    this._canvas = canvas;
    this._timeout = null;
    this._nbParticles = nbParticles;
    this._geoArea = null;
    this._factorX = 0;
    this._factorY = 0;
    this._factorLat = 0;
    this._factorLng = 0;
    if (!__package.__classStreamLinesisInIt) {
        var __class = __package.Streamlines;
        var __proto = __class.prototype;
        __proto.run = function (dataArea, geoArea) {
            var that = this;
            this._particles = [];
            this._geoArea = geoArea;
            this._factorX = this._canvas.width / this.vectorField.width;
            this._factorY = this._canvas.height / this.vectorField.height;
            this._factorLng = geoArea.width / this.vectorField.width;
            this._factorLat = geoArea.height / this.vectorField.height;
            this.vectorField.resample(dataArea.i, dataArea.j, dataArea.width, dataArea.height);
            for (var i = 0; i < this._nbParticles; i++) {
                this._particles.push(this._makeParticle())
            }
            window.clearTimeout(this._timeout);
            var refresh = function () {
                var start = new Date();
                that._animate();
                var time = new Date() - start;
                that._timeout = setTimeout(refresh, Math.max(10, 50 - time));
            };
            refresh()
        };
        __proto.stop = function () {
            var wasRunning = this._timeout != null;
            if (!wasRunning) return false;
            window.clearTimeout(this._timeout);
            this._canvas.getContext('2d').clearRect(0, 0, this._canvas.width, this._canvas.height);
            this._timeout = null;
            return true
        };
        __proto._makeParticle = function () {
            return {
                ix: (this.vectorField.width - 1) * Math.random(),
                jy: (this.vectorField.height - 1) * Math.random(),
                age: 1 + 254 * Math.random(),
                x: 0,
                y: 0,
                xPrev: -1,
                yPrev: -1,
                isnew: true
            }
        };
        __proto._animate = function () {
            var ctx = this._canvas.getContext('2d');
            ctx.lineWidth = this.lineWidth;
            ctx.strokeStyle = this.color;
            var dx = this._canvas.left;
            var dy = this._canvas.top;
            var latMax = this._geoArea.top;
            var lngMin = this._geoArea.left;
            var fLng = this._factorLng;
            var fLat = this._factorLat;
            for (var i = 0; i < this._nbParticles; i++) {
                var particle = this._particles[i];
                var vector = this.vectorField.get(particle.ix, particle.jy);
                particle.ix += this.speed * vector.x * 0.01 / this._factorX;
                particle.jy += this.speed * vector.y * 0.01 / this._factorY;
                particle.age -= this.ageing * this.speed * 10;
                if (particle.age < 0 || !this.vectorField.contains(particle.ix, particle.jy)) {
                    particle = this._particles[i] = this._makeParticle()
                }
                var longitude = lngMin + particle.ix * fLng;
                var latitude = latMax - particle.jy * fLat;
                particle.x = sig.getX(latitude, longitude) * sig.mapScale - dx;
                particle.y = sig.getY(latitude, longitude) * sig.mapScale - dy;
                if (particle.xPrev != -1) {
                    ctx.lineWidth = this.lineWidth * 2;
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(particle.xPrev, particle.yPrev);
                    ctx.stroke()
                }
                particle.xPrev = particle.x;
                particle.yPrev = particle.y
            }
            ctx.save();
            ctx.globalAlpha = this.fading;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, this.vectorField.width * this._factorX, this.vectorField.height * this._factorY);
            ctx.restore()
        };
        __package.__classStreamLinesisInIt = true
    };
};
sig._projections.Mercator = function () {
    var __package = sig._projections;
    this.worldWidth = 0;
    this._lngLeft = 0;
    this._lngRight = 0;
    this._xLeft = 0;
    this._xRight = 0;
    this._pixelsRate = 1;
    this._mercatorTop = 0;
    this._yEquator = 0;
    this._isOverAntiMeridian = false;
    if (!__package.__classMercatorIsInit) {
        var __class = __package.Mercator;
        var __proto = __class.prototype;
        __proto.update = function (area, size) {
            var renderHeight = Math.abs(this._getNormalizedY(area.top - area.height) - this._getNormalizedY(area.top));
            var ratioWHsize = size.width / size.height;
            var ratioWHarea = area.width / renderHeight;
            this._lngLeft = area.left;
            this._lngRight = area.left + area.width;
            this._isOverAntiMeridian = area.width < 350 && this._lngRight > 180;
            this._xRight = size.width;
            this._pixelsRate = ratioWHarea > ratioWHsize ? size.height / renderHeight : size.width / area.width;
            this._mercatorTop = this._getNormalizedY(area.top);
            this._yEquator = this.getY(0, 0);
            this.worldWidth = this.getX(0, 180) - this.getX(0, -180, true)
        };
        __proto.getX = function (latitude, longitude, noModulo) {
            return ((longitude + (this._isOverAntiMeridian && longitude < 0 && !noModulo ? 360 : 0)) - this._lngLeft) * this._pixelsRate
        };
        __proto.getY = function (latitude, longitude) {
            return (this._mercatorTop - this._getNormalizedY(latitude)) * this._pixelsRate
        };
        __proto.getLng = function (x, y, noModulo) {
            var lng = (x / this._pixelsRate + this._lngLeft);
            return noModulo ? lng : (lng > 180 ? lng - 360 : lng < -180 ? 360 + lng : lng)
        };
        __proto.getLat = function (x, y) {
            return this._getLatitudeFromNormalizedY((this._yEquator - y) / this._pixelsRate)
        };
        __proto._getNormalizedY = function (latitude) {
            if (latitude > 90) latitude = 90;
            if (latitude < -90) latitude = -90;
            return Math.log(Math.tan(Math.PI / 4 + (latitude / 180 * Math.PI) / 2)) * 180 / Math.PI
        };
        __proto._getLatitudeFromNormalizedY = function (y) {
            return Math.atan(Math.exp(y / 180 * Math.PI)) * (360 / Math.PI) - 90
        };
        __package.__classMercatorIsInit = true
    };
};
sig._projections.Equirectangular = function () {
    var __package = sig._projections;
    this.worldWidth = 0;
    this._lngLeft = 0;
    this._lngRight = 0;
    this._latTop = 0;
    this._latBottom = 0;
    this._xLeft = 0;
    this._yTop = 0;
    this._aX = 0;
    this._aY = 0;
    this._pixelsRate = 1;
    this._isOverAntiMeridian = false;
    if (!__package.__classEquirectangularIsInit) {
        var __class = __package.Equirectangular;
        var __proto = __class.prototype;
        __proto.update = function (area, size) {
            var areaLargerThanWindow = area.width / area.height > size.width / size.height;
            var renderingwidth = areaLargerThanWindow ? area.width / area.height * size.height : size.width;
            var renderingHeight = areaLargerThanWindow ? size.height : area.height / area.width * size.width;
            this._lngLeft = area.left;
            this._lngRight = area.left + area.width;
            this._latTop = area.top;
            this._latBottom = area.top - area.height;
            this._aX = (this._lngRight - this._lngLeft) / renderingwidth;
            this._aY = (this._latBottom - this._latTop) / renderingHeight;
            this._isOverAntiMeridian = area.width < 350 && this._lngRight > 180;
            this.worldWidth = this.getX(0, 180) - this.getX(0, -180, true)
        };
        __proto.getX = function (latitude, longitude, noModulo) {
            return (1 / this._aX * (longitude - this._lngLeft) + this._xLeft)
        };
        __proto.getY = function (latitude, longitude) {
            return (1 / this._aY * (latitude - this._latTop) + this._yTop)
        };
        __proto.getLng = function (x, y, noModulo) {
            var lng = (this._aX * (x - this._xLeft) + this._lngLeft);
            return noModulo ? lng : (lng > 180 ? lng - 360 : lng < -180 ? 360 + lng : lng)
        };
        __proto.getLat = function (x, y) {
            return (this._aY * (y - this._yTop) + this._latTop)
        };
        __package.__classEquirectangularIsInit = true
    };
};
sig._projections.Orthographic = function () {
    var __package = sig._projections;
    this._radius = 300;
    this._longitude = 0;
    this._latitude = 0;
    this._cosinusLat = 1;
    this._sinusLat = 0;
    this._latitudeRAD = 0;
    this._longitudeRAD = 0;
    this.worldWidth = 0;
    this._lngLeft = 0;
    this._lngRight = 0;
    this._xLeft = 0;
    this._xRight = 0;
    this._pixelsRate = 1;
    this._mercatorTop = 0;
    this._yEquator = 0;
    this._isOverAntiMeridian = false;
    if (!__package.__classOrthographicIsInit) {
        var __class = __package.Orthographic;
        var __proto = __class.prototype;
        __proto.update = function (area, size) {
            this._radius = Math.min(size.width, size.height) / 2
        };
        __proto.getX = function (lat, lng, noModulo) {
            return Math.sin((lng - this._longitude) / 180 * Math.PI) * Math.cos(lat / 180 * Math.PI) * this._radius + this._radius
        };
        __proto.getY = function (lat, lng) {
            var latRAD = lat / 180 * Math.PI;
            var lngRAD = lng / 180 * Math.PI;
            return -(this._cosinusLat * Math.sin(latRAD) - this._sinusLat * Math.cos(latRAD) * Math.cos(lngRAD - this._longitudeRAD)) * this._radius + this._radius;
        };
        __proto.getLng = function (x, y, noModulo) {
            var p = Math.sqrt(x * x + y * y);
            if (p == 0) p = 10e-18;
            var c = Math.asin(p / this._radius);
            return this._longitude + (Math.atan(x * Math.sin(c) / (p * this._cosinusLat * Math.cos(c) + y * this._sinusLat * Math.sin(c)))) / Math.PI * 180
        };
        __proto.getLat = function (x, y) {
            var p = Math.sqrt(x * x + y * y);
            if (p == 0) p = 10e-18;
            var c = Math.asin(p / this._radius);
            return (Math.asin(Math.cos(c) * this._sinusLat - (y * Math.sin(c) * this._cosinusLat) / p)) / Math.PI * 180
        };
        __package.__classOrthographicIsInit = true
    };
};