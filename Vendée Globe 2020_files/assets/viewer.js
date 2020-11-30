µ.events.BOATCLASS_CHANGE = "boatclass_change";
µ.events.REPORT_CHANGE = "report_change";
µ.events.REPORTROW_CLICK = "reportrow_click";
µ.events.REPORTROW_OVER = "reportrow_over";
µ.events.REPORTROW_OUT = "reportrow_out";
µ.events.ICON_BUTTON_DOWN = "iconbutton_down";
µ.events.ICON_BUTTON_UP = "iconbutton_up";
µ.events.ICON_BUTTON_CLICK = "iconbutton_click";
µ.events.TRACKER_IS_INIT = "tracker_is_init";
µ.events.TRACKER_CONFIG_LOADED = "tracker_config_loaded";
µ.events.TRACKER_LIVE_LOADED = "tracker_live_loaded";
µ.events.TRACKER_TRACKS_LOADED = "tracker_tracks_loaded";
µ.events.TRACKER_REPORTS_LOADED = "tracker_reports_loaded";
µ.events.DETAILS_OPEN_STATE_CHANGE = "details_open_state_change";
var tracker = {
    isStatic: false,
    isRace: false,
    isRecord: false,
    isTracking: false,
    isGame: false,
    challenger: null,
    holder: null,
    activeBoatClass: null,
    currentReport: null,
    legNum: 1,
    nblegs: 1,
    resourcesVersions: null,
    statusRacing: {},
    timecodeOfficialStart: 0,
    timecodeOfficialEnd: 0,
    __classReportIsInit: false,
    __classReportRowIsInit: false,
    __classStatusDefinitionIsInit: false,
    __classTimelineIsInit: false,
    __classBoatClassIsInit: false,
    __classRunIsInit: false,
    __classIconButtonIsInit: false,
    __classGraphVariableIsInit: false,
    _params: null,
    defaultBoatId: 0,
    _statusVisibility: {},
    _runsByIds: {},
    _runsStartsGeoPoints: [],
    _runsArrivalsGeoPoints: [],
    _boatsByIds: {},
    _boatClassesByIds: {},
    _boats: [],
    _report: null,
    _reportList: null,
    _reportListRowsByIds: {},
    _activeReportRow: null,
    _dateTime: null,
    _dateTimeFormat: "",
    _minTimecode: new Date(2050, 1, 1).getTime() / 1000,
    _maxTimecode: 0,
    _timecodeFuture: 0,
    _currentTimecode: 0,
    _prerace: 0,
    _dateTimeChronoContainer: null,
    _dateTimeChronoInterval: null,
    _routingsActive: false,
    _routingsVisible: false,
    _reports: [],
    _nbReports: 0,
    _reportDate: null,
    _reportDateFormat: "",
    _reportListTimer: null,
    _openDetailsButton: null,
    _progressLineBoat: null,
    _latIndicator: null,
    _lngIndicator: null,
    _buttonsById: {},
    _buttonZoomFleetActive: false,
    _buttonZoomFleetLevel: 0,
    _buttonZoom3Active: false,
    _buttonZoom3Level: 0,
    _refreshInSeconds: 0,
    _refreshInterval: 0,
    _currentRefreshCount: 0,
    _STATE_STANDBY: "STANDBY",
    _STATE_PRERACE: "PRERACE",
    _STATE_STARTED: "STARTED",
    _STATE_RUNNING: "RUNNING",
    _STATE_FINISH: "FINISH",
    _STATES: ["STANDBY", "PRERACE", "STARTED", "RUNNING", "FINISH"],
    _raceState: this._STATE_STANDBY,
    _timelineChangeTimeout: null,
    _coordsInDecimal: false,
    init: function (params) {
        var that = this;
        µ.LANG = $("body").attr("rel") || "fr";
        this._params = params;
        this.isRace = params.trackertype == "RACE";
        this.isRecord = params.trackertype == "RECORD";
        this.isTracking = params.trackertype == "TRACKING";
        this.legNum = params.numleg;
        $("body").addClass("LEG" + this.legNum);
        $("#main").attr("rel", "LEG" + this.legNum);
        this.nbLegs = params.nblegs;
        µ.MONTH_NAMES = params.months;
        µ.DAY_NAMES = params.days;
        tracker.ReportRow.PHOTO_URL = params.photourl;
        tracker.ReportRow.PHOTO_VERSION = params.photoversion;
        if (this._params.boatId == 0) this._params.boatId = this.defaultBoatId;
        if (params.weatherurl) sig.weather.setLocalUrl(params.weatherurl);
        if (!params.frameok && !(window == top)) {
            this._openNewWindow();
            return
        }
        var version = "v=" + (new Date()).getTime();
        var url = params.versionsurl != "" ? params.versionsurl + "?" + version : µ.WEBROOT + "resources/versions/leg" + this.legNum + "/" + version;
        $.get({
            url: url,
            data: ""
        }).done(function (data) {
            that._init(data)
        }).fail(function (err) {
            that._init(err.responseText)
        })
    },
    isInReducedMode: function () {
        return $("#inReducedMode").is(":visible")
    },
    _init: function (data) {
        this.resourcesVersions = eval("(" + data + ")");
        this._initProperties();
        this._initOpenDetails();
        this._initButtons();
        sig.loadShapes();
        this._loadConfigData();
        this._startListeners();
        this.progressLine.init(this._params.trackertype);
        this.weatherPlayer.init(this._params.weather);
        this.zoomControls.init();
        this.timeline.init();
        if (this.isRecord) this.dashboard.init();
        $(document).trigger(µ.events.TRACKER_IS_INIT, null)
    },
    _openNewWindow: function () {
        $("body>*").remove();
        var url = window.location.href.split("/").slice(0, -1).join("/") + "/" + (window.location.search == "" ? "" : "?" + window.location.search);
        $("body").append("<a href='" + url + "' target='_blank'>" + url + "</a>");
        window.open(url);
        return
    },
    _initProperties: function () {
        var that = this;
        this._report = $("#report");
        this._reportList = $("#reportList");
        this._openDetailsButton = $("#openDetails");
        this._dateTime = $("#datetime");
        this._dateTimeFormat = $("#datetime").attr("rel");
        this._dateTimeChronoContainer = $("#time #chrono>span");
        this._dateTimeChronoDef = ($("#time #chrono").attr("rel") || ".;:;:;").split(";");
        this._reportDate = $("#reportDate>span");
        this._reportDateFormat = $("#reportDate").attr("rel");
        this._latIndicator = $("#coords .lat");
        this._lngIndicator = $("#coords .lng")
    },
    _initOpenDetails: function () {
        var that = this;
        this._openDetailsButton.on("click", function (evt) {
            that._openDetails()
        })
    },
    _openDetails: function (state) {
        if (!this.isInReducedMode()) return;
        var that = this;
        var openIt = state == undefined ? this._openDetailsButton.hasClass("closed") : state;
        if (this.isRecord) {
            tracker.dashboard.display(openIt, !openIt);
            that._openDetailsButton.removeClass().addClass(openIt ? "open" : "closed")
        } else {
            if (openIt) {
                this._openDetailsButton.removeClass().addClass("transition");
                this._report.css("height", document.getElementById("sig").getBoundingClientRect().height + document.getElementById("report").getBoundingClientRect().height);
                window.setTimeout(function () {
                    that._report.css("height", "auto").removeClass("closed").addClass("open");
                    that._openDetailsButton.removeClass().addClass("open")
                }, 400)
            } else {
                this._report.css("height", this._report.css("min-height")).removeClass("open").addClass("closed");
                this._openDetailsButton.removeClass().addClass("closed");
                this._activateReportRow(this._activeReportRow, false)
            }
        }
        $(document).trigger(µ.events.DETAILS_OPEN_STATE_CHANGE, openIt)
    },
    _initButtons: function () {
        var that = this;
        $(".iconbutton").each(function () {
            var button = new tracker.IconButton($(this));
            button.isDefault = (that._params.activebuttons.indexOf(button.id) >= 0);
            that._buttonsById[button.id] = button
        });
        var geoblogButton = this._buttonsById["geoblog"];
        if (geoblogButton) {
            if (this._params.withgeoblog) {
                this.geoblog.init(this._getRessourceUrl("geoblog"))
            } else {
                geoblogButton.enable(false)
            }
        }
        var graphicsButton = this._buttonsById["graphics"];
        if (graphicsButton) graphicsButton.enable(false)
    },
    _startListeners: function () {
        var that = this;
        $(document).on(µ.events.BOAT_CLICK, function (evt, boat) {
            that._onBoatClick(evt.type, boat)
        }).on(µ.events.BOAT_TOUCH, function (evt, boat) {
            that._onBoatClick(evt.type, boat)
        }).on(µ.events.BOAT_OVER, function (evt, boat) {
            that._onBoatOver(boat)
        }).on(µ.events.BOAT_OUT, function (evt, boat) {
            that._onBoatOut(boat)
        }).on(µ.events.REPORTROW_CLICK, function (evt, reportRow) {
            that._onReportRowClick(reportRow)
        }).on(µ.events.REPORTROW_OVER, function (evt, reportRow) {
            that._onReportRowOver(evt, reportRow)
        }).on(µ.events.REPORTROW_OUT, function (evt, reportRow) {
            that._onReportRowOut(reportRow)
        }).on(µ.events.TIMELINE_CHANGE, function (evt, timecode) {
            that._onTimelineChange(timecode)
        }).on(µ.events.MAP_ZOOM_CHANGED, function (evt, level) {
            that._onMapZoomChanged(level)
        }).on(µ.events.MAP_ZOOM_CHANGED_MANUALLY, function (evt, level) {
            that._onMapZoomChangedManually(level)
        }).on(µ.events.MAP_MOVE, function (evt) {
            that._onMapMove()
        }).on(µ.events.SIG_MOUSE_MOVE, function (evt, coords) {
            that._onMapMouseMove(coords)
        }).on(µ.events.ICON_BUTTON_DOWN, function (evt, button) {
            that._onIconButtonDown(button)
        }).on(µ.events.ICON_BUTTON_UP, function (evt, button) {
            that._onIconButtonUp(button)
        }).on(µ.events.ICON_BUTTON_CLICK, function (evt, button) {
            that._onIconButtonClick(button)
        }).on(µ.events.REFERENCE_PLOT_MOUSE_EVENT, function (evt, plot) {
            that._onReferencePlotMouseEvent(plot)
        }).on("fullscreenchange", function () {
            that._onFullscreenChange()
        }).on("keypress", function (evt) {
            that._onKeyPressed(evt)
        });
        $("#coords").on("click", function () {
            that._coordsInDecimal = !that._coordsInDecimal;
            that._onMapMouseMove()
        })
    },
    _getRessourceUrl: function (fileType, nocache) {
        var isStaticRequest = this._params.resourcesurl != "";
        var legPrefix = this._params.nblegs > 1 ? ("leg" + this._params.numleg + (isStaticRequest ? "." : "/")) : "";
        var url = isStaticRequest ? this._params.resourcesurl + legPrefix + "tracker_" + fileType + ".hwx?v=" : µ.WEBROOT + "tracker/resources/" + legPrefix + fileType + "/v";
        var version = (nocache ? (new Date().getTime()) : this.resourcesVersions[fileType]);
        return url + version
    },
    _loadConfigData: function () {
        var that = this;
        var url = this._getRessourceUrl("config");
        µ.loadHwxFile(url, "xml", function (data) {
            that._onConfigDataLoaded(data)
        })
    },
    _onConfigDataLoaded: function (xml) {
        this._setRefresh(xml);
        this._updateTimecodes(xml);
        this._initStatus(xml);
        this._treatRuns(xml);
        this._treatBoatClasses(xml);
        this._treatRaceLayers(xml);
        this._treatPointsOfInterest(xml);
        $(document).trigger(µ.events.TRACKER_CONFIG_LOADED, null);
        this._loadLiveData(false)
    },
    _setRefresh: function (xml) {
        var refresh = parseInt(xml.find("tracker>updates").attr("refresh"));
        if (isNaN(refresh) || refresh == 0) refresh = Number(window.location.search.replace(/\?refresh=(\d+)/gi, "$1"));
        if (!isNaN(refresh) && refresh > 0) this._refreshInSeconds = Math.max(10, refresh)
    },
    _updateTimecodes: function (xml) {
        var root = $(xml.contents()[0]).parent();
        var date = new Date(root.attr("date"));
        this.timecodeOfficialStart = date.getTime() / 1000;
        var date = new Date(root.attr("end"));
        this.timecodeOfficialEnd = date.getTime() / 1000
    },
    _initStatus: function (xml) {
        var that = this;
        var status = xml.find("status");
        $.each(status.find("visible").text().split(","), function () {
            that._statusVisibility[this] = true
        });
        that._statusVisibility["STMOUT"] = true;
        $.each(status.find("hidden").text().split(","), function () {
            that._statusVisibility[this] = false
        });
        $.each(status.find("racing").text().split(","), function () {
            that.statusRacing[this] = true
        })
    },
    _treatRaceLayers: function (xml) {
        sig.addRaceArea("", false, "");
        var that = this;
        sig.route.init(xml.find("route").text());
        xml.find("racearea").each(function () {
            var area = $(this);
            sig.addRaceArea(area.attr("sid"), area.attr("live") == "1", area.text())
        });
        xml.find("gate").each(function () {
            var gate = $(this);
            sig.addRaceGate(gate.attr("name"), gate.text())
        });
        xml.find("reference").each(function () {
            var refConfig = $(this);
            var boatId = refConfig.attr("boatid");
            var reference = sig.addRaceReference(refConfig.attr("boatid"), refConfig.attr("name"), eval(refConfig.text()), !that.isRecord);
            var boat = sig.getBoat(boatId);
            if (boat != null) reference.track.setColor(boat.trackColor)
        })
    },
    _treatRuns: function (xml) {
        var that = this;
        var runNodes = xml.find("run");
        for (var i = 0; i < runNodes.length; i++) {
            var runDefinition = $(runNodes[i]);
            var run = new tracker.Run(runDefinition.attr("id"), new Date(runDefinition.find("start").attr("date")), Number(runDefinition.attr("length")), Number(runDefinition.find("start").attr("lat")), Number(runDefinition.find("start").attr("lng")), Number(runDefinition.find("arrival").attr("lat")), Number(runDefinition.find("arrival").attr("lng")));
            this._runsByIds[run.id] = run;
            this._runsStartsGeoPoints.push([run.startLat, run.startLng]);
            this._runsArrivalsGeoPoints.push([run.endLat, run.endLng])
        }
    },
    _treatBoatClasses: function (xml) {
        var that = this;
        var boatClassNodes = xml.find("boatclass");
        var nbClasses = boatClassNodes.length;
        var boatClassList = $("#boatclassesList");
        var boatClassSelect = $("#boatclassesList>select");
        var defaultBoatclassId = 0;
        for (var i = 0; i < nbClasses; i++) {
            var classDefinition = $(boatClassNodes[i]);
            var boatClass = this._createBoatClass(classDefinition);
            var boatsNodes = classDefinition.find("boat");
            if (defaultBoatclassId == 0) defaultBoatclassId = boatClass.id;
            boatClassSelect.append("<option value='" + boatClass.id + "'>" + boatClass.name + "</option>");
            for (var j = 0; j < boatsNodes.length; j++) {
                var boatDefinition = $(boatsNodes[j]);
                var boat = this._createBoat(boatDefinition);
                if (boat.id == this._params.boatId) defaultBoatclassId = boatClass.id;
                this._createreportRow(boat, boatClass, boatDefinition);
                boatClass.addBoat(boat)
            }
        }
        $("#boatClassSelect option[value='" + defaultBoatclassId + "']").prop("selected", true).addClass("on");
        var photos = [];
        var zindex = 303;
        var multiPhotos = false;
        $("#reportList .row .identity").each(function (i, tag) {
            var rowPhotos = $(tag).find("img");
            if (rowPhotos.length > 1) {
                photos.push($(rowPhotos[0]))
            }
        });
        if (photos.length > 0) {
            window.setInterval(function () {
                for (var i = 0; i < photos.length; i++) {
                    photos[i].css("z-index", zindex)
                };
                zindex = zindex == 303 ? 300 : 303
            }, 3000)
        }
        if (this.isRecord) {
            this.challenger = this._boatClassesByIds[1].boats[0];
            this.holder = this._boatClassesByIds[2] == undefined ? null : this._boatClassesByIds[2].boats[0];
            this.activeBoatClass = this._boatClassesByIds[1];
        } else {
            boatClassSelect.on("mousedown", function () {
                boatClassList.removeClass("open").addClass("open")
            }).on("change", function () {
                boatClassList.removeClass("open");
                var newBoatClassId = $(this).val();
                that._onBoatClassChanged(newBoatClassId)
            });
            this.activeBoatClass = this._boatClassesByIds[defaultBoatclassId]
        }
    },
    _treatPointsOfInterest: function (xml) {
        var poiLayersNodes = xml.find("layer");
        $.each(poiLayersNodes, function (index, layerNode) {
            var layer = $(layerNode);
            var zoom = layer.attr("zoom");
            sig.addPoiLayer(zoom);
            var poiNodes = layer.find("point");
            $.each(poiNodes, function (index, poiNode) {
                var poi = $(poiNode);
                sig.addPoi(poi.attr("id"), zoom, poi.attr("type"), poi.attr("name"), Number(poi.attr("lat")), Number(poi.attr("lng")), Number(poi.attr("clock")))
            })
        })
    },
    _createBoatClass: function (classDefinition) {
        var boatClass = new tracker.BoatClass(classDefinition.attr("id"), classDefinition.attr("name"), this._runsByIds[classDefinition.attr("runid")]);
        this._boatClassesByIds[boatClass.id] = boatClass;
        return boatClass
    },
    _createBoat: function (boatDefinition) {
        var boat = sig.addBoat(boatDefinition.attr("id"), boatDefinition.attr("name"), "race", boatDefinition.attr("nbhulls"), boatDefinition.attr("hullcolors"), boatDefinition.attr("trackcolor"));
        boatDefinition.find("navigator").each(function (index, sailorDef) {
            var sailor = $(sailorDef);
            var nat = sailor.attr("nat") || "no";
            var withPhoto = sailor.attr("photo") == undefined ? undefined : sailor.attr("photo") == "1";
            boat.addSailor(sailor.attr("fname"), sailor.attr("lname"), nat, withPhoto)
        });
        $("<style>" + "#progressline .boat" + boat.id + ":before{border-bottom-color:#" + boat.hullColor + ";}" + "#progressline .boat" + boat.id + ":after{border-top-color:#" + boat.hullColor + ";}" + "#progressline .boat" + boat.id + ":before{border-bottom-color:#" + boat.hullColor + ";}" + "#progressline .boat" + boat.id + ":after{border-top-color:#" + boat.hullColor + ";}" + "</style>").appendTo('head');
        this._boats.push(boat);
        this._boatsByIds[boat.id] = boat;
        return boat
    },
    _createreportRow: function (boat, boatClass, boatDefinition) {
        var reportRow = new tracker.ReportRow(boat, boatClass);
        var commentClass = boatDefinition.attr("comment").toLowerCase().replace(/\s+/gi, "_");
        if (commentClass != "") reportRow.tag.addClass(commentClass);
        this._reportList.append(reportRow.tag);
        this._reportListRowsByIds[boat.id] = reportRow
    },
    _loadLiveData: function (isReload) {
        var that = this;
        µ.loadHwxFile(this._getRessourceUrl("live", true), "json", function (data) {
            tracker.Report.COLUMNS = data.reports.columns;
            that._onLiveDataLoaded(data.reports, isReload)
        })
    },
    _onLiveDataLoaded: function (reportsData, isReload) {
        this._setRaceStatus(reportsData.state);
        var currentReport = this._getReport(reportsData.history[0]);
        var minTimecode = new Date(2050, 1, 1).getTime() / 1000;
        var maxTimecode = new Date(1971, 1, 1).getTime() / 1000;
        var isFirstLoad = !isReload;
        var isPreRace = this._raceState == this._STATE_PRERACE;
        var isStarted = this._raceState == this._STATE_STARTED;
        var isRunning = this._raceState == this._STATE_RUNNING;
        var addLocToTrack = isPreRace || isStarted || isReload;
        $.each(currentReport.lines, function (index, line) {
            var boatId = line["boat"];
            var boat = sig.getBoat(boatId);
            var trackData = line["track"];
            var firstLocation = trackData[0];
            var lastLocation = trackData[trackData.length - 1];
            if (firstLocation != null) {
                minTimecode = Math.min(minTimecode, firstLocation[0])
            }
            if (lastLocation != null) {
                maxTimecode = Math.max(maxTimecode, lastLocation[0]);
                if (addLocToTrack) boat.track.addLocations(trackData, 1, false);
                var reportHeading = line["heading"];
                var heading = isReload ? boat.track.lastLocation.heading : reportHeading;
                boat.placeAt(lastLocation[0], lastLocation[1], lastLocation[2], heading)
            }
        });
        if (this._minTimecode > minTimecode) this._minTimecode = minTimecode;
        if (this._maxTimecode < maxTimecode) this._maxTimecode = maxTimecode;
        µ.TIMECODE = this._currentTimecode = isRunning ? currentReport.timecode : this._maxTimecode;
        this._maxTimecode = Math.max(µ.TIMECODE, this._maxTimecode);
        this._getArrivals(reportsData.arrivals);
        this._getHiddenBoats(reportsData.hidden);
        this._updateDateTime(currentReport.timecode);
        if (isFirstLoad) {
            this.timeline.activate();
            this.timeline.setBounds(this._minTimecode, this._maxTimecode, this._maxTimecode);
            this.timeline.moveTo(this._maxTimecode);
            this._updateReportList(currentReport);
            if (this.isRecord) this._updateDashboard();
            this._onBoatClassChanged(this.activeBoatClass.id);
            this._report.removeClass("off");
            this._scrollToActivereportRow();
            this._startRefresh();
            this.weatherPlayer.setInitialTimecode(this._currentTimecode);
            this._activateDefaultButtons(1);
            this.chrono.start();
            sig.daynight.update(reportsData.daynight);
            this._applyZoom();
            this._openDetails(false);
            $(document).trigger(µ.events.TRACKER_LIVE_LOADED, null);
            this._loadTracksData(currentReport)
        } else {
            this._addLiveReport(currentReport);
            this.timeline.setBounds(this._minTimecode, this._maxTimecode, this._maxTimecode);
            this.timeline.moveTo(this._maxTimecode);
            this._scrollToActivereportRow();
            this._applyZoom();
            this._startRefresh()
        }
    },
    _getReport: function (data) {
        return new tracker.Report(data.id, (new Date(data.date)) / 1000, data.offset, data.lines)
    },
    _addLiveReport: function (newReport) {
        var lastReport = this._reports[this._reports.length - 1];
        if (newReport.timecode > lastReport.timecode) {
            this._reports.push(newReport);
            this._nbReports = this._reports.length;
            newReport.previous = lastReport;
            lastReport.next = newReport
        }
    },
    _getArrivals: function (arrivals) {
        var that = this;
        $.each(arrivals, function (index, arrival) {
            var boatId = arrival[0];
            var boat = sig.getBoat(boatId);
            boat["arrival"] = {
                "date": new Date(arrival[1]),
                "racetime": arrival[2],
                "gapToFirst": arrival[3],
                "gapToPrevious": arrival[4],
                "orthoDistance": arrival[5],
                "orthoSpeed": arrival[6],
                "overgroundDistance": arrival[7],
                "overgroundSpeed": arrival[8]
            }
        })
    },
    _getHiddenBoats: function (hiddenBoats) {
        var that = this;
        $.each(hiddenBoats, function (index, hiddenBoat) {
            var boatId = hiddenBoat[0];
            var boat = sig.getBoat(boatId);
            boat.timecodeHidden = Math.round(new Date(hiddenBoat[1]) / 1000)
        })
    },
    _startRefresh: function () {
        if (this._refreshInSeconds == 0) return;
        var that = this;
        $("body").addClass("autoupdate");
        $("#refresh").addClass("on");
        if (this._refreshInterval) window.clearInterval(this._refreshInterval);
        this._refreshInterval = window.setInterval(function () {
            that._updateRefresh()
        }, 100)
    },
    _updateRefresh: function () {
        this._currentRefreshCount++;
        if (this._currentRefreshCount == this._refreshInSeconds * 10) {
            this._loadLiveData(true);
            this._currentRefreshCount = 0
        }
        var percent = Math.round((this._currentRefreshCount / this._refreshInSeconds / 10 * 100));
        document.getElementById("time").setAttribute("rel", percent);
        $("#refresh circle").css("stroke-dasharray", percent + " 100")
    },
    _stopRefresh: function () {
        if (this._refreshInterval) window.clearInterval(this._refreshInterval)
    },
    _setRaceStatus: function (state) {
        $("body").removeClass(this._STATES.join(" ")).addClass(state);
        this._raceState = state
    },
    _applyZoom: function () {
        switch (this._params.zoomlevel) {
        case "route":
            sig.zoomToRoute();
            break;
        case "fleet":
            this._zoomOnBoats(-1);
            break;
        case "fleetstart":
            this._zoomOnBoats(-1, undefined, this._runsStartsGeoPoints);
            break;
        case "fleetarrival":
            this._zoomOnBoats(-1, undefined, this._runsArrivalsGeoPoints);
            break;
        case "fleet2point":
            this._zoomOnBoats(-1, undefined, [this._params.zoomextrapoint]);
            break;
        case "first3":
            this._zoomOnBoats(this.isRecord ? 1 : 3);
            break;
        case "first3start":
            this._zoomOnBoats(this.isRecord ? 1 : 3, undefined, this._runsStartsGeoPoints);
            break;
        case "first3arrival":
            this._zoomOnBoats(this.isRecord ? 1 : 3, undefined, this._runsArrivalsGeoPoints);
            break;
        case "first32point":
            this._zoomOnBoats(this.isRecord ? 1 : 3, undefined, [this._params.zoomextrapoint]);
            break;
        case "firstracing":
            this._zoomOnBoats(this.isRecord ? 1 : 1);
            break;
        case "firstracingstart":
            this._zoomOnBoats(this.isRecord ? 1 : 1, undefined, this._runsStartsGeoPoints);
            break;
        case "firstracingarrival":
            this._zoomOnBoats(this.isRecord ? 1 : 1, undefined, this._runsArrivalsGeoPoints);
            break;
        case "firstracing2point":
            this._zoomOnBoats(this.isRecord ? 1 : 1, undefined, [this._params.zoomextrapoint]);
            break;
        case "active2head":
            this._zoomOnBoats(this.isRecord ? 1 : this._activeReportRow.rank + 3);
            break;
        case "active2start":
            this._zoomOnBoats(this.isRecord ? 1 : this._activeReportRow.rank + 3, undefined, this._runsStartsGeoPoints);
            break;
        case "active2arrival":
            this._zoomOnBoats(this.isRecord ? 1 : this._activeReportRow.rank + 3, undefined, this._runsArrivalsGeoPoints);
            break;
        case "active2point":
            this._zoomOnBoats(this.isRecord ? 1 : this._activeReportRow.rank + 3, undefined, [this._params.zoomextrapoint]);
            break;
        default:
            sig.centerOnActiveBoat();
            break
        }
    },
    _loadTracksData: function (liveReport) {
        var that = this;
        µ.loadHwxFile(this._getRessourceUrl("tracks"), "json", function (data) {
            that._onTracksDataLoaded(data.tracks, liveReport)
        })
    },
    _onTracksDataLoaded: function (tracks, liveReport) {
        var that = this;
        var minTimecode = this._minTimecode;
        var maxTimecode = this._maxTimecode;
        var timecodeFuture = 0;
        $.each(tracks, function (index, track) {
            if (track.id == 0) {
                sig.daynight.setHistory(track.loc)
            } else {
                var boat = sig.getBoat(track.id);
                if (boat) {
                    boat.track.parseLocations(track.loc, 100000, true);
                    minTimecode = Math.min(minTimecode, boat.track.firstLocation.timecode);
                    maxTimecode = Math.max(maxTimecode, boat.track.lastLocation.timecode);
                    if (track.pred && track.pred.length > 0 && track.pred[0].length > 0) {
                        boat.routing.parseLocations(track.pred, 100000, true);
                        boat.routing.updatePath(5000000000);
                        timecodeFuture = Math.max(timecodeFuture, boat.routing.lastLocation.timecode)
                    }
                }
            }
        });
        if (liveReport != null) {
            $.each(liveReport.lines, function (index, line) {
                var boat = sig.getBoat(line["boat"]);
                if (!that.isRecord || boat.id == that.challenger.id) {
                    var trackData = line["track"];
                    boat.track.addLocations(trackData, 1, false);
                    if (boat.track.lastLocation) maxTimecode = Math.max(maxTimecode, boat.track.lastLocation.timecode)
                }
            })
        }
        if (this.isRecord) {
            $.each(this._boats, function (index, boat) {
                var reference = sig.getReference(boat.id);
                if (reference != null) {
                    boat.track.parseLocations(reference.trackdata, 100000, true);
                    reference.track.setColor(boat.trackColor)
                }
            });
            sig.addPlotsToBoatTrack(this.challenger)
        }
        this._minTimecode = Math.min(this._minTimecode, minTimecode);
        this._maxTimecode = this._currentTimecode = Math.max(this._maxTimecode, maxTimecode);
        this._timecodeFuture = Math.max(timecodeFuture, this._maxTimecode);
        this.timeline.setBounds(this._minTimecode, this._maxTimecode, this._currentTimecode);
        this.timeline.moveTo(this._maxTimecode);
        this.replay.init();
        this._activateDefaultButtons(2);
        $(document).trigger(µ.events.TRACKER_TRACKS_LOADED, null);
        this._loadReportsData()
    },
    _loadReportsData: function () {
        var that = this;
        µ.loadHwxFile(this._getRessourceUrl("reports"), "json", function (data) {
            that._onReportsDataLoaded(data.reports.history)
        })
    },
    _onReportsDataLoaded: function (history) {
        var that = this;
        var nbReports = this._nbReports = history.length;
        var previousReport = null;
        for (var i = 0; i < nbReports; i++) {
            var reportData = history[i];
            var currentReport = this._getReport(reportData);
            this._reports.push(currentReport);
            currentReport.previous = previousReport;
            if (previousReport != null) previousReport.next = currentReport;
            previousReport = currentReport
        }
        var noSTMBoats = {};
        $.each(currentReport.lines, function (index, line) {
            if (line.racestatus != "STM") noSTMBoats[line.boat] = {
                start: null,
                end: null
            }
        });
        while (previousReport != null) {
            $.each(previousReport.lines, function (index, line) {
                var boatConfig = noSTMBoats[line.boat];
                if (line.racestatus == "STM" && boatConfig != undefined) {
                    line.racestatus = "STMOUT";
                    if (boatConfig.end == null) boatConfig.end = previousReport.timecode;
                    boatConfig.start = previousReport.timecode
                }
            });
            previousReport = previousReport.previous
        }
        $.each(noSTMBoats, function (boatId, boatConfig) {
            if (boatConfig.start != null) {
                var boat = sig.getBoat(boatId);
                if (boat && boat.track && boat.track.locations.length > 0) {
                    boat.setSTMTrack(boatConfig.start, boatConfig.end)
                }
            }
        });
        this.currentReport = currentReport;
        this._updateReportList(currentReport);
        if (this.isRecord) this._updateDashboard();
        this._activateDefaultButtons(3);
        this._displayMessageTags();
        var graphicsButton = this._buttonsById["graphics"];
        if (graphicsButton) graphicsButton.enable(true);
        $(document).trigger(µ.events.TRACKER_REPORTS_LOADED, null)
    },
    _updateReportList: function (report) {
        var that = this;
        if (report == undefined) {
            if (this._nbReports == 0) return;
            var report = this.currentReport;
            var found = false;
            if (this._currentTimecode == report.timecode) {} else if (this._currentTimecode > report.timecode) {
                while (!found) {
                    report = report.next;
                    found = report == null || this._currentTimecode <= report.timecode
                };
                if (report == null) report = this._reports[this._nbReports - 1]
            } else if (this._currentTimecode < report.timecode) {
                while (!found) {
                    report = report.previous;
                    found = report == null || this._currentTimecode >= report.timecode
                };
                if (report == null) report = this._reports[0]
            }
        }
        if (this._currentTimecode < report.timecode && report.previous !== null) report = report.previous;
        if (this.currentReport != null && this.currentReport.id == report.id) return;
        var reportListTag = this._reportList[0];
        var isFirstNotArrived = true;
        var minusDtf = Number.MAX_VALUE;
        var reportRowToActivate = null;
        var fisrtReportRow = null;
        $.each(report.lines, function (index, line) {
            var boatId = line["boat"];
            var rank = line["rank"];
            var progress = line["progress"];
            var dtf = line["dtf"];
            var dtl = line["dtl"];
            var realStatus = line["racestatus"];
            var isArrived = realStatus == "ARV";
            var reportRow = that._reportListRowsByIds[boatId];
            var isRacing = that.statusRacing[realStatus];
            var boat = sig.getBoat(boatId);
            var status = realStatus + (realStatus == "RAC" ? (isFirstNotArrived ? "_1" : "_N") : "");
            if (!that.isRecord && isRacing && !isArrived) {
                var isInFront = dtf < minusDtf;
                if (isInFront) minusDtf = dtf;
                if (reportRowToActivate == null || isInFront) reportRowToActivate = reportRow
            }
            reportRow.line = line;
            reportRow.setRank(isRacing, rank, progress, dtf);
            reportRow.setValues(status);
            if (that.isRecord && index == 0) {
                reportRow.boatClass.setMinDtf(dtl >= 0 ? dtf : dtf + dtl);
                reportRow.boatClass.setMaxDtf(dtl < 0 ? dtf : dtf + dtl)
            } else {
                if (index == 0) reportRow.boatClass.setMinDtf(dtf);
                if (isRacing) reportRow.boatClass.setMaxDtf(dtf)
            }
            that._statusVisibility[realStatus] ? boat.display(true) : boat.hide(false);
            boat.tag.setAttribute("rel", realStatus);
            reportListTag.appendChild(reportRow.tag[0]);
            if (!isArrived) isFirstNotArrived = false;
            if (fisrtReportRow == null) fisrtReportRow = reportRow
        });
        this.currentReport = report;
        if (reportRowToActivate == null) reportRowToActivate = fisrtReportRow;
        this._updateActiveReportRow(reportRowToActivate);
        var needDate = !this.isRecord || this._raceState == this._STATE_RUNNING || this._raceState == this._STATE_FINISH;
        this._reportDate.empty().append(needDate ? µ.toDate(this.currentReport.timecode * 1000, this._reportDateFormat) : "<em>Standby</em>");
        $(document).trigger(µ.events.REPORT_CHANGE, this.currentReport, this._activeReportRow)
    },
    _updateActiveReportRow: function (headReportRow) {
        var reportRow = this._activeReportRow;
        if (reportRow == null) {
            var boatId = Number(this._params.boatId);
            if (boatId < 0) {
                reportRow = headReportRow != null ? headReportRow : $("#reportList>div.RAC_1:visible").first().data("obj")
            } else if (boatId > 0) {
                reportRow = this._reportListRowsByIds[boatId]
            } else {
                reportRow = headReportRow != null ? headReportRow : $("#reportList>div:visible").first().data("obj")
            }
        }
        if (reportRow != null) this.activeBoatClass = reportRow.boatClass;
        this._activateReportRow(reportRow, false)
    },
    _getLastReportTimecode: function () {
        var lastReport = this._reports[this._reports.length - 1];
        return lastReport.timecode + lastReport.offset * 60
    },
    _displayMessageTags: function () {
        $(".msgNew").each(function (i, tag) {
            var date = Date.parse($(tag).attr("rel"));
            if (date > (new Date().getTime())) $(tag).show()
        })
    },
    _onBoatClassChanged: function (boatclassId) {
        $("#reportList>div").addClass("ghost");
        var boatClass = this.activeBoatClass = this._boatClassesByIds[boatclassId];
        var activeBoatClassReportRows = $("#reportList>div[alt='class" + boatClass.id + "']").removeClass("ghost");
        var defaultBoat = this._activeReportRow != null && this._activeReportRow.boatClass.id == boatClass.id ? this._activeReportRow.boat : null;
        if (defaultBoat == null) defaultBoat = boatClass.getBoat(this._params.boatId);
        if (defaultBoat == null) defaultBoat = this._boatsByIds[activeBoatClassReportRows.first().data("obj").boat.id];
        if (defaultBoat != null) {
            var reportRow = this._reportListRowsByIds[defaultBoat.id];
            this._activateReportRow(reportRow, false);
            sig.centerOnActiveBoat(true)
        }
        $("#boatsLayer>g").addClass("ghost");
        $("#tracksLayer>g").addClass("ghost");
        $.each(boatClass.boats, function (i, boat) {
            boat.$tag.removeClass("ghost");
            boat.track.$tag.removeClass("ghost")
        });
        $("#boatclassesList").attr("rel", "class" + boatclassId);
        $("#openDetails").attr("rel", "class" + boatclassId);
        $("#boatclassesList .name").html(boatClass.name);
        $("#boatclassesList>select option").removeClass("on").prop("selected", false);
        $("#boatclassesList>select option[value='" + boatclassId + "']").addClass("on").prop("selected", true)
    },
    _onBoatClick: function (evtType, boat) {
        if (boat.category != "race") return;
        if (this._routingsActive && this._routingsVisible) return;
        var needTochangeClass = this._activeReportRow.boatClass.getBoat(boat.id) == null;
        var reportRow = this._reportListRowsByIds[boat.id];
        this._activateReportRow(reportRow, false);
        if (needTochangeClass) this._onBoatClassChanged(reportRow.boatClass.id);
        if (evtType == µ.events.BOAT_TOUCH) {
            if (this.boatcard.visible && boat.id == this.boatcard.target.boat.id) {
                this.boatcard.hide()
            } else {
                this._displayBoatCard(boat, reportRow, true)
            }
        } else if (this.boatcard.displayOnClick) {
            if (this.boatcard.isLocked && boat.id == this.boatcard.target.boat.id) {
                this.boatcard.hide()
            } else {
                this._displayBoatCard(boat, reportRow, true)
            }
        }
    },
    _onBoatOver: function (boat) {
        if (this._routingsActive && this._routingsVisible) return;
        var displayBoatCard = (!this.boatcard.displayOnClick) || (this.boatcard.displayOnClick && !this.boatcard.visible && !this.boatcard.isLocked);
        if (displayBoatCard) this._displayBoatCard(boat, null, false);
        if (this.boatcard.displayOnClick && !this.boatcard.visible && this.boatcard.isLocked) this.boatcard.isLocked = false
    },
    _onBoatOut: function (boat) {
        var hideBoatCard = this.boatcard.visible && !this.boatcard.isLocked;
        if (hideBoatCard) this.boatcard.hide()
    },
    _onReportRowOver: function (reportRow) {},
    _onReportRowOut: function (reportRow) {},
    _onReportRowClick: function (reportRow) {
        this._activateReportRow(reportRow, true);
        this._openDetails(false)
    },
    _activateReportRow: function (reportRow, isClick) {
        if (reportRow == null) return;
        if (this._activeReportRow) this._activeReportRow.desactivate();
        this._activeReportRow = reportRow;
        if (isClick) {
            if (this.boatcard.visible) this._displayBoatCard(null, reportRow, true)
        } else {
            this._activeReportRow.activate()
        }
        this._scrollToActivereportRow();
        this._updateProgressLine();
        this.geoblog.change(reportRow.getIdentity());
        sig.keepActiveBoatInFrame()
    },
    _scrollToActivereportRow: function () {
        if (this._activeReportRow != null) {
            var top = this._activeReportRow.tag.position().top;
            var reportListHeight = this._reportList.height();
            var rowHeight = this._activeReportRow.tag.outerHeight(true);
            var bottom = top + rowHeight;
            if (top < 0) {
                this._reportList.scrollTop(this._reportList.scrollTop() + top)
            };
            if (bottom > reportListHeight) {
                var nbLinesVisible = reportListHeight / rowHeight;
                var delta = Math.max(0, nbLinesVisible - 3) * rowHeight;
                this._reportList.scrollTop(this._reportList.scrollTop() + bottom + delta - reportListHeight)
            }
        }
    },
    _onMapZoomChanged: function (level) {
        this.geoblog.updateArrow()
    },
    _onMapZoomChangedManually: function (level) {
        if (this._buttonZoomFleetActive) {
            this._buttonZoomFleetLevel = level;
            this._buttonsById["zoomfleet"].reduce()
        } else if (this._buttonZoom3Active) {
            this._buttonZoom3Level = level;
            this._buttonsById["zoomtop3"].reduce()
        }
    },
    _onMapMove: function () {
        this.geoblog.updateArrow()
    },
    _onMapMouseMove: function (coords) {
        if (coords == undefined) {
            coords = {
                lat: this._latIndicator.latValue,
                lng: this._lngIndicator.lngValue
            }
        }
        this._lngIndicator.latValue = coords.lat;
        this._lngIndicator.lngValue = coords.lng;
        if (this._coordsInDecimal) {
            this._latIndicator.text(µ.toNumber(coords.lat, "¤5¤."));
            this._lngIndicator.text(µ.toNumber(coords.lng, "¤5¤."))
        } else {
            this._latIndicator.text(µ.toCoordinate(coords.lat, "LAT"));
            this._lngIndicator.text(µ.toCoordinate(coords.lng, "LNG"))
        }
    },
    _onReferencePlotMouseEvent: function (plotEvent) {
        var timecode = -1;
        var isMovingPlot = plotEvent.plot.index == 0;
        switch (plotEvent.type) {
        case "mouseover":
            plotEvent.plot.$tag.addClass("on");
            break;
        case "mouseout":
            plotEvent.plot.$tag.removeClass("on");
            break;
        case "click":
        case "touchend":
            timecode = isMovingPlot ? -1 : Math.max(this._minTimecode, Math.min(this._maxTimecode, this._minTimecode + plotEvent.plot.index * 24 * 3600));
            if (plotEvent.type == "touchend") {
                var wasOn = plotEvent.plot.$tag.hasClass("on");
                $("#referencesLayer>g").removeClass("on");
                if (!wasOn) plotEvent.plot.$tag.addClass("on")
            }
            break
        }
        if (timecode > 0) this.timeline.moveTo(timecode)
    },
    _onFullscreenChange: function () {
        var state = (screenfull && screenfull.enabled && screenfull.isFullscreen);
        this._buttonsById["fullscreen"].setState(state);
        if (this.isInReducedMode()) {
            this._report.css("height", this._report.css("min-height")).removeClass("open").addClass("closed");
            this._openDetailsButton.removeClass().addClass("closed");
            this._activateReportRow(this._activeReportRow, false)
        } else {
            this._report.css("height", "auto")
        }
    },
    _innerFullscreen: function (state) {},
    _onKeyPressed: function (evt) {},
    _onIconButtonDown: function (button) {
        var that = this;
        switch (button.id) {
        case "zoomplus":
            tracker.zoomControls.startZoom(1);
            break;
        case "zoomminus":
            tracker.zoomControls.startZoom(-1);
            break
        }
    },
    _onIconButtonUp: function (button) {
        var that = this;
        switch (button.id) {
        case "zoomplus":
        case "zoomminus":
            tracker.zoomControls.stopZoom();
            break
        }
    },
    _onIconButtonClick: function (button) {
        var that = this;
        switch (button.id) {
        case "fullscreen":
            if (screenfull) {
                if (screenfull.enabled) {
                    var onRequest = function () {
                        screenfull.off("change", onRequest);
                        sig.resize()
                    };
                    var onExit = function () {
                        screenfull.off("change", onExit);
                        sig.resize()
                    };
                    if (screenfull.isFullscreen) {
                        screenfull.on("change", onExit);
                        screenfull.exit()
                    } else {
                        screenfull.on("change", onRequest);
                        screenfull.request()
                    }
                }
            } else {
                this._innerFullscreen(button.isActive);
                sig.resize()
            }
            break;
        case "home":
            sig.zoomHome();
            if (this._buttonZoomFleetActive) {
                this._buttonZoomFleetLevel = 1;
                this._reduceButton("zoomfleet")
            } else if (this._buttonZoom3Active) {
                this._buttonZoom3Level = 1;
                this._reduceButton("zoomtop3")
            }
            break;
        case "zoomfleet":
            this._buttonZoomFleetActive = button.isActive;
            if (button.isActive) {
                this._setButtonState("zoomtop3", false);
                this._buttonZoom3Active = false;
                this._buttonZoomFleetLevel = 0;
                this._buttonZoom3Level = 0;
                this._updateSigView()
            } else {
                this._buttonZoomFleetLevel = 0;
                sig.keepActiveBoatInFrame()
            }
            break;
        case "zoomtop3":
            this._buttonZoom3Active = button.isActive;
            if (button.isActive) {
                this._setButtonState("zoomfleet", false);
                this._buttonZoomFleetActive = false;
                this._buttonZoomFleetLevel = 0;
                this._buttonZoom3Level = 0;
                this._updateSigView()
            } else {
                this._buttonZoom3Level = 0;
                sig.keepActiveBoatInFrame()
            }
            break;
        case "weather":
            button.isActive ? this.weatherPlayer.display(this._currentTimecode) : this.weatherPlayer.hide();
            break;
        case "route":
            button.isActive ? sig.displayOrthodromy() : sig.hideOrthodromy();
            break;
        case "references":
            button.isActive ? sig.displayReferences() : sig.hideReferences();
            break;
        case "daynight":
            button.isActive ? sig.displayDaynight() : sig.hideDaynight();
            break;
        case "distance":
            button.isActive ? sig.rule.display(true) : sig.rule.hide();
            break;
        case "geoblog":
            if (button.isActive) {
                this.geoblog.change(this._activeReportRow.getIdentity());
                this.geoblog.activate()
            } else {
                this.geoblog.desactivate()
            }
            break;
        case "gridlines":
            button.isActive ? sig.gridlines.display(true) : sig.gridlines.hide();
            break;
        case "labels":
            $.each(this._boats, function (i, boat) {
                boat.displayLabel(button.isActive)
            });
            break;
        case "classes":
            button.isActive ? $("#layout").removeClass("noclass") : $("#layout").addClass("noclass");
            break;
        case "tiledmap":
            if (button.isActive) {
                sig.tiledmap.display()
            } else {
                sig.tiledmap.hide()
            }
            break;
        case "predpos":
            if (button.isActive) {
                this._displayRoutings()
            } else {
                this._hideRoutings()
            }
            break;
        case "graphics":
            if (button.isActive) {
                if (this.isRecord) {
                    this.graphics.record.display()
                } else {
                    this.graphics.race.display()
                }
            } else {
                if (this.isRecord) {
                    this.graphics.record.hide()
                } else {
                    this.graphics.race.hide()
                }
            }
            break;
        case "game":
            if (button.isActive) {
                this._displayGame()
            } else {
                this._hideGame()
            }
            break
        }
    },
    _setButtonState: function (buttonId, state) {
        if (this._buttonsById[buttonId]) this._buttonsById[buttonId].setState(state)
    },
    _activateButton: function (buttonId) {
        if (this._buttonsById[buttonId]) {
            this._buttonsById[buttonId].setState(true);
            this._onIconButtonClick(this._buttonsById[buttonId])
        }
    },
    _reduceButton: function (buttonId) {
        if (this._buttonsById[buttonId]) this._buttonsById[buttonId].reduce()
    },
    _activateDefaultButtons: function (level) {
        $.each(this._buttonsById, function (index, button) {
            if (button.isDefault && button.activationlevel == level) button.click()
        })
    },
    _onTimelineChange: function (timecode) {
        var hoursFromStart = (this._currentTimecode - this._minTimecode) / 3600;
        var hoursClass = hoursFromStart >= 24 ? "OVER24H" : hoursFromStart >= 4 ? "OVER4H" : "";
        $("body").removeClass("OVER24H OVER4H").addClass(hoursClass);
        this._currentTimecode = timecode;
        this._updateDateTime(timecode);
        this._updateSigView();
        this._updateDateTimeChrono();
        this._updateRoutings();
        if (this._currentTimecode == this._maxTimecode) {
            this._startRefresh()
        } else {
            this._stopRefresh()
        }
        if (this._timelineChangeTimeout == null) {
            var that = this;
            this._timelineChangeTimeout = window.setTimeout(function () {
                that._onTimelineChangeTimeout(timecode)
            }, 100)
        }
    },
    _onTimelineChangeTimeout: function (timecode) {
        if (!this.isGame) {
            this._updateReportList();
            this._updateWeather()
        }
        if (this.isRecord) {
            this._updateDashboard();
            this.graphics.record.onTimelineChange()
        }
        this._updateProgressLine();
        this.geoblog.updateTimeState(timecode);
        window.clearTimeout(this._timelineChangeTimeout);
        this._timelineChangeTimeout = null
    },
    _updateDateTime: function (timecode) {
        this._dateTime.html(µ.toDate(timecode * 1000, this._dateTimeFormat))
    },
    _updateProgressLine: function () {
        if (this.isRecord) {
            var line = this.currentReport.lines[0];
            var boatClass = this._boatClassesByIds[1];
            this.progressLine.updateBoat(this.challenger.id, line.dtf, boatClass.run.length, this.challenger.hullColor);
            if (this.holder) this.progressLine.updateHolder(this.holder.id, line.dtf + line.dtl, boatClass.run.length, this.holder.hullColor)
        } else {
            var line = this._activeReportRow;
            this.progressLine.updateBoat(line.boat.id, line.dtf, line.boatClass.run.length, line.boat.hullColor);
            this.progressLine.updateClass(line.boatClass.minDtf, line.boatClass.maxDtf, line.boatClass.run.length)
        }
    },
    _updateSigView: function () {
        if (this.isGame) return;
        if (this._buttonZoomFleetActive) {
            this._zoomOnBoats(-1, this._buttonZoomFleetLevel)
        } else if (this._buttonZoom3Active) {
            this._zoomOnBoats(3, this._buttonZoom3Level)
        } else {
            sig.keepActiveBoatInFrame()
        }
    },
    _updateWeather: function () {
        if (this.weatherPlayer.isActive) {
            this.weatherPlayer.displayForecastAt(this._currentTimecode)
        }
    },
    _updateDashboard: function () {
        this.dashboard.update({
            run: this.activeBoatClass.run,
            boat: this.challenger,
            line: this.currentReport.lines[0]
        })
    },
    _updateDateTimeChrono: function () {
        var that = this;
        var isRunning = this._currentTimecode == this._maxTimecode && this._raceState != this._STATE_FINISH;
        var nowTimecode = Date.now() / 1000;
        var seconds = isRunning ? nowTimecode - this.timecodeOfficialStart : this._currentTimecode - this.timecodeOfficialStart;
        var sign = seconds >= 0 ? 1 : -1;
        seconds = Math.abs(seconds);
        var days = Math.floor(seconds / 3600 / 24);
        var hours = Math.floor((seconds -= days * 3600 * 24) / 3600);
        var minutes = Math.floor((seconds -= hours * 3600) / 60);
        seconds = Math.round(seconds - minutes * 60);
        var abrevs = this._dateTimeChronoDef;
        var daysStr = (sign >= 0 ? "<b>+</b>" : "-") + ((days < 10 ? "0" : "") + days);
        var hoursStr = (hours < 10 ? "0" : "") + hours;
        var minutesStr = (minutes < 10 ? "0" : "") + minutes;
        var secondsStr = (seconds < 10 ? "0" : "") + seconds;
        this._dateTimeChronoContainer.html("<s><u>" + daysStr + "</u><i>" + abrevs[0] + "</i></s>" + "<s><u>" + hoursStr + "</u><i>" + abrevs[1] + "</i></s>" + "<s><u>" + minutesStr + "</u><i>" + abrevs[2] + "</i></s>" + "<s><u>" + secondsStr + "</u><i>" + abrevs[3] + "</i></s>");
        if (isRunning) {
            if (this._dateTimeChronoInterval == null) {
                this._dateTimeChronoInterval = setInterval(function () {
                    that._updateDateTimeChrono()
                }, 1000)
            }
        } else {
            if (this._dateTimeChronoInterval != null) {
                clearInterval(this._dateTimeChronoInterval);
                this._dateTimeChronoInterval = null
            }
        }
        if (sign == 1) {
            $(".chronorecall").each(function (i, tag) {
                var recall = $(tag);
                var text = recall.attr("rel").replace("#D#", days + 1);
                recall.empty().text(text)
            })
        }
    },
    _updateRoutings: function () {
        if (!this._routingsActive) return;
        if (this._currentTimecode < this._maxTimecode) {
            if (this._routingsVisible) {
                $("#routingsLayer g").hide();
                this._routingsVisible = false
            }
        } else {
            if (!this._routingsVisible) {
                $("#routingsLayer g").show();
                this._routingsVisible = true
            }
        }
    },
    _displayRoutings: function () {
        $("#routingsLayer g").show();
        this._routingsActive = true;
        this._routingsVisible = true;
        $.each(this._boats, function (index, boat) {
            boat.routingAvailable = true
        });
        this.timeline.setBounds(this._minTimecode, this._timecodeFuture, this._maxTimecode)
    },
    _hideRoutings: function () {
        $("#routingsLayer g").hide();
        this._routingsActive = false;
        this._routingsVisible = false;
        $.each(this._boats, function (index, boat) {
            boat.routingAvailable = false
        });
        this.timeline.setBounds(this._minTimecode, this._maxTimecode, this._currentTimecode < this._maxTimecode ? this._currentTimecode : this._maxTimecode)
    },
    _displayGame: function () {
        if (game == undefined) return;
        this.isGame = true;
        $("body").addClass("GAME");
        game.display();
        this._stopRefresh();
        if (this.isInReducedMode) sig.resize()
    },
    _hideGame: function () {
        if (game == undefined) return;
        this.isGame = false;
        game.hide();
        $("body").removeClass("GAME");
        this._startRefresh();
        if (this.isInReducedMode) sig.resize()
    },
    _zoomOnBoats: function (nbBoats, defaultLevel, extraGeopoints) {
        var rect = this._getBoatsRect(nbBoats);
        if (extraGeopoints != undefined && extraGeopoints.length > 0) {
            for (var i = 0; i < extraGeopoints.length; i++) {
                var geopoint = extraGeopoints[i];
                if (geopoint.length != 2) continue;
                var x = sig.getX(geopoint[0], geopoint[1]);
                var y = sig.getY(geopoint[0], geopoint[1]);
                rect.xMin = Math.min(rect.xMin, x);
                rect.xMax = Math.max(rect.xMax, x);
                rect.yMin = Math.min(rect.yMin, y);
                rect.yMax = Math.max(rect.yMax, y)
            }
        }
        sig.zoomToRect(rect.xMin, rect.xMax, rect.yMin, rect.yMax, defaultLevel)
    },
    _getBoatsRect: function (nbBoats) {
        var that = this;
        var yMin = Number.MAX_VALUE;
        var yMax = Number.MIN_VALUE;
        var firstBoat = that._reportListRowsByIds[this.currentReport.lines[0]["boat"]].boat;
        var lngMin = firstBoat.lng + ((sig.isOverAntiMeridian && firstBoat.lng < 0) ? 360 : 0);
        var lngMax = lngMin;
        var previousLng = lngMin;
        var swapLng = 0;
        var count = 0;
        $.each(this.currentReport.lines, function (index, line) {
            var reportRow = that._reportListRowsByIds[line["boat"]];
            if (!that.isRecord && reportRow.boatClass.id != that.activeBoatClass.id) return true;
            if (that.isRecord || reportRow.isRacing) {
                var lng = reportRow.boat.lng;
                if (sig.isWorldWide) {
                    if (Math.abs(lng - previousLng) > 300) swapLng = swapLng != 0 ? 0 : previousLng > lng ? 360 : -360
                } else if (sig.isOverAntiMeridian) {
                    if (lng < 0) lng += 360
                }
                lng += swapLng;
                yMin = Math.min(yMin, reportRow.boat.y);
                yMax = Math.max(yMax, reportRow.boat.y);
                lngMin = Math.min(lngMin, lng);
                lngMax = Math.max(lngMax, lng);
                previousLng = reportRow.boat.lng;
                count++
            }
            if (count == nbBoats) return false
        });
        var xMin = sig.getX(0, lngMin, true);
        var xMax = sig.getX(0, lngMax, true);
        return {
            "xMin": xMin,
            "xMax": xMax,
            "yMin": yMin,
            "yMax": yMax
        }
    },
    _displayBoatCard: function (boat, reportRow, locked) {
        if (boat == null && reportRow == null) return;
        if (boat == null) boat = reportRow.boat;
        if (reportRow == null) reportRow = this._reportListRowsByIds[boat.id];
        var target = {
            "boat": boat,
            "data": null,
            "getStatusDef": null
        };
        if (boat.category == "race") {
            target.data = reportRow;
            target.getStatusDef = function () {
                return this.data.getStatusDef()
            }
        } else if (boat.category == "game") {
            target.data = boat.data;
            target.getStatusDef = function () {
                return this.boat.getStatusDef()
            }
        }
        this.boatcard.display(target, locked)
    }
};
tracker.chrono = {
    _seconds: 0,
    _dateStart: null,
    _tags: null,
    start: function () {
        this._tags = $(".chrono");
        if (this._tags.length == 0) return;
        var that = this;
        var nowTimecode = new Date() / 1000;
        var isStarted = tracker.timecodeOfficialStart < nowTimecode;
        var isFinished = !isNaN(tracker.timecodeOfficialEnd);
        this._seconds = isStarted ? isFinished ? tracker.timecodeOfficialEnd - tracker.timecodeOfficialStart : nowTimecode - tracker.timecodeOfficialStart : 0;
        this._count();
        if (isStarted && !isFinished) setInterval(function () {
            that._count()
        }, 1000)
    },
    _display: function (values) {
        this._tags.each(function (index, chrono) {
            var elements = $(chrono).find("*");
            for (var i = 3; i >= 0; i--) {
                var val = values.length >= i ? Number(values[i]) : 0;
                $(elements[i]).empty().append((val < 10 ? "0" : "") + val)
            }
        })
    },
    _count: function () {
        var seconds = this._seconds;
        var days = Math.floor(seconds / 3600 / 24);
        var hours = Math.floor((seconds -= days * 3600 * 24) / 3600);
        var minutes = Math.floor((seconds -= hours * 3600) / 60);
        seconds = Math.round(seconds - minutes * 60);
        this._display([days, hours, minutes, seconds]);
        this._seconds++
    }
};
tracker.timeline = {
    _timeStart: 0,
    _timecode: 0,
    _timeEnd: 0,
    _tag: null,
    _bar: null,
    _axis: null,
    _cursor: null,
    _timeout: null,
    _delay: 1,
    _percent: 0,
    init: function () {
        this._tag = $("#timeline");
        this._axis = $("#timeline .axis");
        this._bar = $("#timeline .bar");
        this._cursor = $("#timeline .button");
        document.getElementById("reportList").addEventListener("touchmove", function (event) {
            event.stopPropagation()
        })
    },
    setBounds: function (timecodeStart, timecodeEnd, currentTimecode) {
        if (currentTimecode != null) this._timecode = currentTimecode;
        this._timeStart = timecodeStart;
        this._timeEnd = timecodeEnd;
        this.moveTo(this._timecode)
    },
    setMax: function (timecodeEnd) {
        this._timeEnd = timecodeEnd;
        this.moveTo(this._timecode)
    },
    activate: function () {
        var that = this;
        this._axis.on("mousedown touchstart", function (evt) {
            that._onCatch(evt)
        });
        this._tag.removeClass("off")
    },
    moveTo: function (timecode) {
        var percent = (this._timeEnd == this._timeStart) ? 1 : (timecode - this._timeStart) / (this._timeEnd - this._timeStart);
        this._moveToPercent(percent)
    },
    moveRelative: function (dPercent) {
        this._moveToPercent(this._percent + dPercent)
    },
    addSeconds: function (seconds, loop) {
        var percent = (this._timeEnd == this._timeStart) ? 1 : (this._timecode + seconds - this._timeStart) / (this._timeEnd - this._timeStart);
        var extremityReached = !loop && (percent < 0 || percent > 1);
        if (loop) {
            if (percent < 0) percent = 1;
            if (percent > 1) percent = 0
        }
        this._moveToPercent(percent);
        return extremityReached
    },
    _onCatch: function (evt) {
        var that = this;
        $(document).trigger(µ.events.TIMELINE_CATCHED, this._timecode);
        switch (evt.type) {
        case "touchstart":
            $(document).on("touchmove.timeline", function (evt2) {
                that._onMove(evt2)
            });
            $(document).on("touchend.timeline", function (evt2) {
                that._onRelease(evt2)
            });
            break;
        case "mousedown":
            $(document).on("mousemove.timeline", function (evt2) {
                that._onMove(evt2)
            });
            $(document).on("mouseup.timeline", function (evt2) {
                that._onRelease(evt2)
            });
            break
        }
        this._onMove(evt);
        evt.preventDefault();
        evt.stopPropagation()
    },
    _onMove: function (evt) {
        var x = 0;
        switch (evt.type) {
        case "touchstart":
        case "touchmove":
            x = parseInt(evt.originalEvent.touches[0].pageX);
            break;
        case "mousedown":
        case "mousemove":
            x = parseInt(evt.originalEvent.pageX);
            break
        };
        var percent = (x - this._axis.offset().left) / this._axis.width();
        this._moveToPercent(percent);
        evt.preventDefault();
        evt.stopPropagation()
    },
    _onRelease: function (evt) {
        $(document).off("touchmove.timeline touchend.timeline mousemove.timeline mouseup.timeline");
        $(document).trigger(µ.events.TIMELINE_RELEASED, this._timecode)
    },
    _dispatchChange: function () {
        $(document).trigger(µ.events.TIMELINE_CHANGE, this._timecode)
    },
    _moveToPercent: function (percent) {
        this._percent = Math.min(1, Math.max(0, percent));
        this._timecode = Math.round(this._timeStart + (this._timeEnd - this._timeStart) * this._percent);
        this._cursor.css("left", (this._percent * 100) + "%");
        this._bar.css("width", (this._percent * 100) + "%");
        this._dispatchChange()
    }
};
tracker.replay = {
    _tag: null,
    _buttons: null,
    _isPlaying: false,
    _playTag: null,
    _pauseTag: null,
    _slowTag: null,
    _fastTag: null,
    _speedTag: null,
    _speeds: [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 1 * 60, 2 * 60, 3 * 60, 4 * 60, 5 * 60, 6 * 60, 10 * 60, 12 * 60, 15 * 60, 20 * 60, 30 * 60, 1 * 3600, 2 * 3600, 3 * 3600, 4 * 3600, 6 * 3600, 8 * 3600, 12 * 3600, 18 * 3600],
    _speedIndex: 17,
    _speed: 0,
    _speedDivisor: [24 * 3600, 3600, 60, 1],
    _speedlabel: [],
    _interval: null,
    init: function () {
        var that = this;
        this._tag = $("#replay");
        this._buttons = $("#replay .buttons").on("click", function (evt) {
            that._isPlaying ? that._stop() : that._start()
        });
        this._playTag = $("#replay .play");
        this._pauseTag = $("#replay .pause");
        this._slowTag = $("#replay .slow").on("click", function (evt) {
            that._updateSpeed(-1, $(this))
        });
        this._fastTag = $("#replay .fast").on("click", function (evt) {
            that._updateSpeed(+1, $(this))
        });
        this._speedTag = $("#replay .text");
        this._speedlabel = this._speedTag.attr("rel").split(";");
        this._speed = this._speeds[this._speedIndex];
        this._updateSpeed(0, null);
        this._tag.show()
    },
    _start: function () {
        var that = this;
        this._isPlaying = true;
        this._playTag.hide();
        this._pauseTag.show();
        this._tag.removeClass("off on").addClass("on");
        if (this._interval) window.clearInterval(this._interval);
        this._interval = window.setInterval(function () {
            var stop = tracker.timeline.addSeconds(that._speed / 50, false);
            if (stop) that._stop()
        }, 1000 / 50)
    },
    _stop: function () {
        this._isPlaying = false;
        this._playTag.show();
        this._pauseTag.hide();
        this._tag.removeClass("off on").addClass("off");
        if (this._interval) window.clearInterval(this._interval)
    },
    _updateSpeed: function (direction, tag) {
        this._speedIndex = Math.max(0, this._speedIndex + direction);
        this._speed = this._speedIndex >= this._speeds.length ? (this._speedIndex - this._speeds.length + 1) * 24 * 3600 : this._speeds[this._speedIndex];
        var labelIndex = this._speed < 60 ? 3 : this._speed < 3600 ? 2 : this._speed < 24 * 3600 ? 1 : 0;
        this._speedTag.html(this._speed / this._speedDivisor[labelIndex] + this._speedlabel[labelIndex] + "/s");
        if (tag != null) {
            tag.addClass("active");
            window.setTimeout(function () {
                tag.removeClass("active")
            }, 100)
        }
    }
};
tracker.progressLine = {
    _boat: null,
    _followers: null,
    init: function (trackerType) {
        this._boat = $("#progressline .activeboat");
        this._followers = $("#progressline .extend");
        switch (trackerType.toUpperCase()) {
        case "RACE":
            this._followers.addClass("fleet");
            break;
        case "RECORD":
            this._followers.addClass("boat");
            break
        }
    },
    updateBoat: function (id, dtf, length, color) {
        this._boat.css({
            "left": ((length - dtf) / length * 100) + "%",
            "background-color": "#" + color
        }).removeClass().addClass("activeboat boat" + id)
    },
    updateHolder: function (id, dtf, length, color) {
        this._followers.css({
            "left": ((length - dtf) / length * 100) + "%",
            "background-color": "#" + color
        }).removeClass().addClass("boat boat" + id)
    },
    updateClass: function (minDtf, maxDtf, length, color) {
        this._followers.css({
            "left": Math.max(0, ((length - maxDtf) / length * 100)) + "%",
            "right": (minDtf / length * 100) + "%"
        });
        if (color) {
            this._followers.css({
                "background-color": "#" + color
            })
        }
    }
};
tracker.boatcard = {
    visible: false,
    displayOnClick: false,
    isLocked: false,
    target: null,
    _rankTag: null,
    _rankValTag: null,
    _isInit: false,
    _container: null,
    _card: null,
    _identityDef: {},
    _rankDef: {},
    _infosDef: {},
    _interval: null,
    display: function (target, locked) {
        if (!this._isInit) this._init();
        this.target = target;
        this.isLocked = locked;
        this._container.show().css("visibility", "hidden").removeClass("nophoto");
        if (tracker.ReportRow.PHOTO_VERSION < 0) this._container.addClass("nophoto");
        this._update();
        this._move();
        if (locked) {
            var that = this;
            $(document).on(µ.events.MAP_MOVE + ".boatcard " + µ.events.MAP_ZOOM_CHANGED + ".boatcard " + µ.events.TIMELINE_CHANGE + ".boatcard ", function (evt, timecode) {
                that._update();
                that._move()
            })
        }
        this._container.css("visibility", "visible");
        this.visible = true
    },
    hide: function () {
        window.clearInterval(this._interval);
        $(document).off(µ.events.MAP_MOVE + ".boatcard " + µ.events.MAP_ZOOM_CHANGED + ".boatcard " + µ.events.TIMELINE_CHANGE + ".boatcard ");
        if (this._container) this._container.hide();
        this.visible = false
    },
    _init: function () {
        this._isInit = true;
        this._initProperties();
        this._initIdentityDef();
        this._initRankDef();
        this._initSatusDef();
        this._initRankDef()
    },
    _initProperties: function () {
        this._container = $("#boatcard");
        this._card = $("#boatcard article");
        this._rankTag = this._card.find(".rank")[0];
        this._rankValTag = this._card.find(".rank .val")[0];
        var that = this;
        this._container.on("click", function () {
            that.hide()
        })
    },
    _initIdentityDef: function () {
        var that = this;
        this._card.find(">.identity").remove().each(function () {
            var tag = $(this);
            $.each(tag.attr("rel").split(","), function (index, type) {
                var html = tag.clone().removeAttr("rel").addClass(type).wrapAll('<div>').parent().html();
                that._identityDef[type] = new µ.HtmlDefinition(html)
            })
        })
    },
    _initRankDef: function () {
        var that = this;
        this._card.find(">.rank").remove().each(function () {
            var tag = $(this);
            $.each(tag.attr("rel").split(","), function (index, status) {
                var html = tag.clone().wrapAll('<div>').parent().html();
                that._rankDef[status] = new µ.HtmlDefinition(html)
            })
        })
    },
    _initSatusDef: function () {
        var that = this;
        this._card.find(">.infos").remove().each(function () {
            var tag = $(this);
            $.each(tag.attr("rel").split(","), function (index, status) {
                var html = tag.clone().removeAttr("rel").addClass(status).wrapAll('<div>').parent().html();
                that._infosDef[status] = new µ.HtmlDefinition(html)
            })
        })
    },
    _update: function () {
        console.log(this.target.boat.name);
        var identityDef = this._identityDef[this.target.boat.category];
        var rankDef = this._rankDef[this.target.boat.category];
        var statusDef = this.target.getStatusDef();
        var infoDef = this._infosDef[statusDef.join("")];
        this._card.find(">.identity").remove();
        this._card.find(">.rank").remove();
        this._card.find(">.infos").remove();
        this._card.append(identityDef.update(this.target));
        this._card.append(rankDef.update(this.target));
        this._card.append(infoDef.update(this.target));
        this._container.removeClass().addClass(statusDef[0])
    },
    _move: function () {
        var parentOffset = this._container.parent().offset();
        var left = sig.mapBounds.absLeft - parentOffset.left;
        var right = sig.sigBounds.absRight;
        var top = sig.mapBounds.absTop - parentOffset.top;
        var bottom = sig.sigBounds.bottom;
        var x = left + this.target.boat.x * sig.mapScale;
        var y = top + this.target.boat.y * sig.mapScale;
        if (((x + 20) < left || (x - 20) > right || (y + 20) < top || (y - 20) > bottom)) {
            this.hide();
            return
        }
        var cardBounds = {
            "width": this._card.outerWidth(),
            "height": this._card.outerHeight()
        };
        var onLeft = (x - cardBounds.width) >= 20;
        var onRight = (x + cardBounds.width) <= (sig.sigBounds.width - 20);
        var onTop = (y - cardBounds.height) >= 20;
        var onBottom = (y + cardBounds.height) <= (sig.sigBounds.height - 20);
        var norLeftNorRight = !(onRight || onLeft);
        var norTopNorBottom = !(onTop || onBottom);
        var quadran = norTopNorBottom ? onRight ? 6 : 5 : (norLeftNorRight ? (onTop ? 7 : 8) : (onRight ? (onTop ? 1 : 2) : (onTop ? 4 : 3)));
        this._card.removeClass().addClass("qd" + quadran).css("left", "");
        this._container.css({
            "left": x + "px",
            "top": y + "px"
        })
    }
};
tracker.weatherPlayer = {
    isActive: false,
    _tag: null,
    _select: null,
    _btnFirst: null,
    _btnLast: null,
    _btnPrev: null,
    _buttonNext: null,
    _legend: null,
    _date: null,
    _delta: -1,
    _step: 3,
    _amplitude: 72,
    _startTimecode: 0,
    _endTimecode: 0,
    _initialTimecode: 0,
    _currentTimecode: -1,
    _buttonsAreActive: false,
    _windtip: null,
    _windtipUnit: "",
    init: function (params) {
        this._initProperties();
        this._setParams(params);
        this._setInteractivity();
        this._startListeners()
    },
    setInitialTimecode: function (timecode) {
        this._select.empty();
        var startTimecode = timecode - timecode % (this._step * 3600);
        var endTimecode = timecode + this._amplitude * 3600;
        endTimecode -= endTimecode % (this._step * 3600);
        var currentTimecode = startTimecode;
        var index = 0;
        do {
            this._select.append("<option value='" + currentTimecode + "'>" + this._getDateText(index, currentTimecode) + "</option>");
            currentTimecode += this._step * 3600;
            index += this._step
        } while (currentTimecode <= endTimecode);
        this._initialTimecode = startTimecode;
        this._select.find("option:first").addClass("on").prop("selected", true);
        this._buttonsAreActive = true
    },
    display: function (timecode) {
        $("#main").addClass("WEATHER");
        this._tag.show();
        this._windtip.show();
        this.isActive = true;
        this.displayForecastAt(timecode)
    },
    hide: function () {
        $("#main").removeClass("WEATHER");
        this._tag.hide();
        this._windtip.hide();
        sig.weather.hide();
        this.isActive = false;
        this._currentTimecode = null
    },
    loadForecasts: function (fromTimecode, toTimecode, callback) {
        var startTimecode = fromTimecode - fromTimecode % (this._step * 3600);
        var endTimecode = toTimecode - toTimecode % (this._step * 3600);
        var currentTimecode = startTimecode;
        var forecasts = [];
        var testLoad = function () {
            var allLoaded = true;
            for (var i = 0; i < forecasts.length; i++) {
                var forecast = forecasts[i];
                if (!(forecast.isLoaded || forecast.isError)) {
                    allLoaded = false;
                    break
                }
            }
            if (allLoaded && callback) callback(forecasts)
        };
        while (currentTimecode <= endTimecode) {
            forecasts.push(sig.weather.getForecast(currentTimecode));
            currentTimecode += this._step * 3600
        }
        for (var i = 0; i < forecasts.length; i++) {
            var forecast = forecasts[i];
            forecast.load(testLoad)
        }
    },
    displayForecastAt: function (timecode) {
        if (this._currentTimecode == timecode) return;
        this._currentTimecode = timecode - timecode % (this._step * 3600);
        this._delta = (this._currentTimecode - this._initialTimecode) / 3600;
        this._buttonsAreActive = this._delta >= 0;
        this._tag.removeClass("waiting past").addClass(this._buttonsAreActive ? "waiting" : "waiting past");
        if (!this._buttonsAreActive) $("#weather option").removeClass().prop("selected", false);
        sig.weather.displayForecast(this._currentTimecode)
    },
    _initProperties: function () {
        this._tag = $("#weather");
        this._select = $("#weather select");
        this._date = $("#weather .date");
        this._btnFirst = $("#weather .first");
        this._btnPrev = $("#weather .prev");
        this._btnNext = $("#weather .next");
        this._btnLast = $("#weather .last");
        this._legend = $("#weather legend");
        this._windtip = $("#windTip");
        this._windtipUnit = this._windtip.attr("rel")
    },
    _setParams: function (params) {
        var palette = sig.weather.setColors(params.palette);
        var width = 100 / palette.length - 0.1;
        for (var i = 0; i < palette.length; i++) {
            var color = palette[i];
            this._legend.append("<div style='width:" + width + "%;'><sup><sub style='background-color:rgba(" + color.r + "," + color.g + "," + color.b + "," + (color.a / 255 * 3) + ");'></sub></sup>" + (i * 5) + "</div>")
        };
        $("#weather legend sup").css("background-color", $("#sig").css("background-color"));
        if (params && params.step) this._step = params.step;
        if (params && params.amplitude) this._amplitude = params.amplitude
    },
    _setInteractivity: function () {
        var that = this;
        this._select.on("mousedown", function () {
            $(this).parent().addClass("open")
        }).on("change", function () {
            this.blur();
            $(this).parent().removeClass("open");
            that._activateOption($("option:selected", this))
        });
        this._btnFirst.on("click", function () {
            if (that._buttonsAreActive) {
                that._activateOption(that._select.find("option:first"))
            }
        });
        this._btnPrev.on("click", function () {
            if (that._buttonsAreActive) {
                var option = that._select.find("option:selected").prev();
                if (option.length > 0) that._activateOption(option)
            }
        });
        this._btnNext.on("click", function () {
            if (that._buttonsAreActive) {
                var option = that._select.find("option:selected").next();
                if (option.length == 0) option = that._select.find("option:first");
                if (option.length > 0) that._activateOption(option)
            }
        });
        this._btnLast.on("click", function () {
            if (that._buttonsAreActive) {
                that._activateOption(that._select.find("option:last"))
            }
        })
    },
    _startListeners: function () {
        var that = this;
        $(document).on(µ.events.FORECAST_DISPLAYED, function (evt, timecode) {
            that._onForecastDisplayed(timecode)
        });
        $(document).on(µ.events.FORECAST_WIND_VALUE, function (evt, windPos) {
            that._onWindValue(windPos)
        })
    },
    _activateOption: function (option) {
        $("#weather option").removeClass();
        option.addClass("on").prop("selected", true);
        this.displayForecastAt(option.attr("value"))
    },
    _updateDate: function (text) {},
    _getDateText: function (delta, timecode) {
        return (delta < 0 ? "" : ("+" + ("00" + delta).substr(-2) + "h : ")) + (µ.toDate(timecode * 1000, "UTC:dd/mm HH'h UTC'"))
    },
    _onForecastDisplayed: function (timecode) {
        this._tag.removeClass("waiting");
        this._date.empty().text(this._getDateText(this._delta, this._currentTimecode))
    },
    _onWindValue: function (windPos) {
        this._windtip.empty().append(Math.round(windPos.origin) + "° • " + (Math.round(windPos.speed * 10) / 10) + " " + this._windtipUnit).css({
            "left": (windPos.x + 10) + "px",
            "top": (windPos.y + 10) + "px"
        })
    }
};
tracker.zoomControls = {
    _btPlus: null,
    _btMinus: null,
    _direction: 0,
    _interval: null,
    _text: null,
    _axis: null,
    _cursor: null,
    _zoomFc: null,
    _sliderFc: null,
    init: function () {
        var that = this;
        this._cursor = $("#zoom .bar .button");
        this._text = $("#zoom .text");
        this._btPlus = $("#zoom .button.plus").on("mousedown touchstart", function () {
            that._onMouseDown($(this), 1)
        }).on("mouseup touchend", function () {
            that._onMouseUp($(this))
        });
        this._btMinus = $("#zoom .button.minus").on("mousedown touchstart", function () {
            that._onMouseDown($(this), -1)
        }).on("mouseup touchend", function () {
            that._onMouseUp($(this))
        });
        this._axis = $("#zoom .axis").on("mousedown touchstart", function (evt) {
            that._onCatch(evt)
        });
        $(document).on(µ.events.MAP_ZOOM_CHANGED, function (evt, level) {
            that._updateLevel(level)
        });
        this._zoomFc = µ.math.getLinearFc(0, 1, 1, sig.zoomMax);
        this._sliderFc = µ.math.getLinearFc(1, 0, sig.zoomMax, 1)
    },
    startZoom: function (direction) {
        var that = this;
        this._direction = direction;
        window.clearInterval(this._interval);
        this._interval = setInterval(function () {
            that._zoomRelative()
        }, 25)
    },
    stopZoom: function () {
        window.clearInterval(this._interval)
    },
    _onMouseDown: function (button, direction) {
        var that = this;
        this._direction = direction;
        button.removeClass('on').addClass('on');
        window.clearInterval(this._interval);
        this._interval = setInterval(function () {
            that._zoomRelative()
        }, 25)
    },
    _onMouseUp: function (button) {
        button.removeClass('on');
        window.clearInterval(this._interval)
    },
    _onCatch: function (evt) {
        var that = this;
        switch (evt.type) {
        case "touchstart":
            $(document).on("touchmove.zoomslider", function (evt2) {
                that._onMove(evt2)
            });
            $(document).on("touchend.zoomslider", function () {
                $(document).off("touchmove.zoomslider touchend.zoomslider")
            });
            break;
        case "mousedown":
            $(document).on("mousemove.zoomslider", function (evt2) {
                that._onMove(evt2)
            });
            $(document).on("mouseup.zoomslider", function (evt2) {
                $(document).off("mousemove.zoomslider mouseup.zoomslider")
            });
            break
        }
        this._onMove(evt);
        evt.preventDefault();
        evt.stopPropagation()
    },
    _onMove: function (evt) {
        var x = 0;
        switch (evt.type) {
        case "touchstart":
        case "touchmove":
            x = parseInt(evt.originalEvent.touches[0].pageY);
            break;
        case "mousedown":
        case "mousemove":
            x = parseInt(evt.originalEvent.pageY);
            break
        };
        var height = this._axis.height();
        var percent = (x - this._axis.offset().top) / this._axis.height();
        var level = this._zoomFc(Math.pow(1 - percent, 3));
        sig.zoomTo(level);
        this._updateLevel(level);
        evt.preventDefault();
        evt.stopPropagation()
    },
    _zoomRelative: function () {
        var newLevel = Math.pow(sig.mapScale + 0.1 * this._direction, (1 + 0.015 * this._direction));
        sig.zoomTo(newLevel);
        this._updateLevel(sig.mapScale);
        $(document).trigger(µ.events.MAP_ZOOM_CHANGE_PLEASE, this._direction);
        $(document).trigger(µ.events.MAP_ZOOM_CHANGED_MANUALLY, sig.mapScale)
    },
    _updateLevel: function (level) {
        this._text.html(Math.round(level * 100) + "%");
        var top = 100 - Math.max(0, Math.min(100, Math.pow(this._sliderFc(level), 1 / 3) * 100));
        this._cursor.css("top", "calc(" + top + "% - 3px)")
    }
};
tracker.dashboard = {
    _main: null,
    _summary: null,
    _variables: null,
    _isUpdated: false,
    init: function () {
        var that = this;
        this._main = $("#dashboard");
        this._summary = $("#dashboardsummary");
        this._variables = [];
        $("#dashboard .def").each(function (i, variable) {
            var $variable = $(variable);
            $variable.def = new µ.HtmlDefinition($variable.html());
            that._variables.push($variable)
        });
        $("#dashboardsummary .def").each(function (i, variable) {
            var $variable = $(variable);
            $variable.def = new µ.HtmlDefinition($variable.html());
            that._variables.push($variable)
        })
    },
    update: function (target) {
        if (this._variables != null && this._variables.length > 0) {
            $.each(this._variables, function (i, variable) {
                variable.empty().append($(variable.def.update(target)))
            })
        }
        if (!this._isUpdated) {
            this._isUpdated = true;
            $("#dashboard").css("visibility", "visible");
            $("#dashboardsummary").css("visibility", "visible")
        }
    },
    display: function (main, summary) {
        main ? this._main.show() : this._main.hide();
        summary ? this._summary.show() : this._summary.hide()
    }
};
tracker.geoblog = {
    _isInit: false,
    _window: null,
    _header: null,
    _title: null,
    _hat: null,
    _credits: null,
    _patience: null,
    _cross: null,
    _arrow: null,
    _arrowPath: null,
    _url: "",
    _dataLoaded: false,
    _contentByMediaId: {},
    _currentMedia: null,
    _active: false,
    _opened: false,
    init: function (url) {
        var that = this;
        this._window = $("#geoblog");
        this._arrow = $("#geoblog .arrow");
        this._arrowPath = $("#geoblog .arrow path");
        this._header = $("#geoblog header");
        this._cross = $("#geoblog .cross svg");
        this._position = $("#geoblog .position");
        this._title = $("#geoblog .title");
        this._hat = $("#geoblog .hat");
        this._article = $("#geoblog article");
        this._patience = $("#geoblog .wait");
        this._credits = $("#geoblog footer");
        this._url = url;
        this._cross.on("click", function () {
            that._hideWindow()
        });
        this._header.on("mousedown touchstart", function (evt) {
            var xMouse = evt.originalEvent.pageX;
            var yMouse = evt.originalEvent.pageY;
            var posInit = that._window.addClass("moving").position();
            $(document).on("mousemove.geoblog touchmove.geoblog", function (evt2) {
                that._window.css({
                    "left": posInit.left + (evt2.originalEvent.pageX - xMouse),
                    "top": posInit.top + (evt2.originalEvent.pageY - yMouse)
                });
                that.updateArrow()
            }).on("mouseup.geoblog touchend.geoblog", function () {
                that._window.removeClass("moving");
                $(document).off("mousemove.geoblog touchmove.geoblog mouseup.geoblog touchend.geoblog")
            });
        });
        this._isInit = true
    },
    activate: function () {
        if (!this._dataLoaded) {
            this._loadData(function () {
                sig.displayGeoMedia()
            })
        } else {
            sig.displayGeoMedia()
        }
        this._active = true
    },
    desactivate: function () {
        this._hideWindow();
        sig.hideGeoMedia();
        this._active = false
    },
    change: function (identity) {
        if (!this._isInit) return;
        if (this._active) {
            this._hideWindow();
            sig.displayGeoMedia()
        }
        this._header.find(".identity").remove();
        this._header.prepend(identity)
    },
    updateArrow: function () {
        if (!this._opened) return;
        var x = sig.mapBounds.left + this._currentMedia.x * sig.mapScale;
        var y = sig.mapBounds.top + this._currentMedia.y * sig.mapScale;
        var position = this._window.position();
        var size = {
            "width": this._window.width(),
            "height": this._header.height()
        };
        var center = {
            "x": position.left + size.width / 2,
            "y": position.top + size.height / 2
        };
        var dist = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2));
        var angle = Math.atan2(x - center.x, center.y - y) / Math.PI * 180;
        this._arrowPath.attr("d", "M" + (center.x - 10) + " " + (center.y) + "h20L" + center.x + " " + (center.y - dist) + "z").attr("transform", "rotate(" + angle + " " + center.x + " " + center.y + ")");
        this._arrow.css("left", -position.left).css("top", -position.top).attr("width", dist + center.x).attr("height", dist + center.y).show()
    },
    updateTimeState: function (timecode) {
        if (!this._active) return;
        if (!this._opened) return;
        if (this._currentMedia == null) return;
        if (this._currentMedia.timecode > timecode) this._hideWindow()
    },
    _loadData: function (callback) {
        if (this._url == "") return;
        var that = this;
        µ.loadHwxFile(this._url, "xml", function (data) {
            that._onDataLoaded(data);
            callback();
            $(document).on(µ.events.GEOMEDIA_CLICK, function (evt, media) {
                that._onGeomediaClick(media)
            })
        })
    },
    _onDataLoaded: function (xml) {
        var mediaNodes = xml.find("m");
        $.each(mediaNodes, function (i, mediaNode) {
            var $mediaNode = $(mediaNode);
            var lang = $mediaNode.attr("l");
            if (lang == µ.LANG || lang == "") {
                var boatId = $mediaNode.attr("b");
                var mediaId = $mediaNode.attr("i");
                var type = $mediaNode.attr("t");
                var timecode = Date.parse($mediaNode.attr("d")) / 1000;
                var title = $mediaNode.find("t").html().replace("<!--[CDATA[", "").replace("]]-->", "");
                var hat = $mediaNode.find("h").html().replace("<!--[CDATA[", "").replace("]]-->", "");
                var body = $mediaNode.find("b").html().replace("<!--[CDATA[", "").replace("]]-->", "").split("|");
                var credits = $mediaNode.find("c").html().replace("<!--[CDATA[", "").replace("]]-->", "");
                sig.addGeoMedia(boatId, mediaId, type, timecode, title, hat, body, credits)
            }
        });
        this._dataLoaded = true
    },
    _onGeomediaClick: function (media) {
        var that = this;
        this._currentMedia = media;
        this._reset();
        this._displayWindow();
        this._displayMedia(media);
        this.updateArrow()
    },
    _reset: function () {
        this._title.empty();
        this._hat.empty();
        this._credits.empty();
        this._article.empty()
    },
    _displayWindow: function () {
        this._window.show();
        this._article.empty().addClass("waiting").append(this._patience);
        this._opened = true
    },
    _hideWindow: function () {
        this._window.hide();
        this._arrow.hide();
        this._reset();
        this._opened = false
    },
    _displayMedia: function (media) {
        this._position.empty().append(µ.toDate(media.timecode * 1000, this._position.attr("rel")) + " • " + µ.toCoordinate(media.lat) + " • " + µ.toCoordinate(media.lng));
        this._title.empty().append(media.title);
        this._hat.empty().append(media.hat);
        this._credits.empty().append(media.credits);
        var contentContainer = $("<div class='content'></div>");
        switch (media.type) {
        case "0":
            contentContainer.append(media.content.join("<br />"));
            break;
        case "1":
            contentContainer.attr("id", "mediaPhoto").addClass("class", "mediaPhoto" + (media.content.length > 1 ? "s" : ""));
            $.each(media.content, function (i, src) {
                contentContainer.append("<img src='" + src + "' />")
            });
            break;
        case "2":
            contentContainer.attr("id", "mediaVideo");
            var src = this._article.attr("rel").replace("#id#", media.content[0]);
            contentContainer.append("<iframe src='" + src + "' frameborder='0' allowfullscreen='1'></iframe>");
            break;
        case "4":
            contentContainer.attr("id", "mediaPage");
            var src = media.content[0];
            contentContainer.append("<iframe src='" + src + "' frameborder='0' allowfullscreen='1'></iframe>");
            break
        }
        this._article.empty().removeClass().addClass("type" + media.type).append(contentContainer)
    }
};
tracker.graphics = {
    GRID_VAL_SUBDIVISIONS: [1, 2, 5, 10, 20, 25, 50, 100, 125, 150, 200, 250, 500, 750, 1000, 1250, 1500, 2000, 2500, 5000, 10000, 12500, 15000, 20000, 25000, 50000]
};
tracker.graphics.race = {
    _isInit: false,
    _variables: {},
    _data: {},
    _start: Number.MAX_VALUE,
    _end: 0,
    _container: null,
    _drawing: null,
    _legend: null,
    _svg: null,
    _svgWidth: 0,
    _svgHeight: 0,
    _yMargin: 5,
    _variablesChkBox: null,
    _reportRows: null,
    _currentVariable: null,
    display: function () {
        if (!this._isInit) this._init();
        this._container.show();
        this._boatsCheckboxes.show();
        this._startListeners();
        this._redraw()
    },
    hide: function () {
        if (!this._isInit) this._init();
        this._container.hide();
        this._boatsCheckboxes.hide();
        this._stopListeners()
    },
    _init: function () {
        var that = this;
        this._container = $("#graphics");
        this._drawing = $("#graphics .drawing");
        this._drawing.append("<svg xmlns='http://www.w3.org/2000/svg' x='0' y='0' xmlns:xlink='http://www.w3.org/1999/xlink'></svg>");
        this._svg = $("#graphics .drawing>svg")[0];
        this._varChekboxes = $("#graphics .variables input");
        this._legend = $("#graphics .legend");
        this._reportRows = $("#reportList .row");
        this._initBoats();
        this._initVariables();
        this._initData();
        this._resetAll();
        this._isInit = true
    },
    _initBoats: function () {
        var that = this;
        var nbTocheck = 1;
        var nbToCheckConfig = this._container.attr("rel");
        switch (nbToCheckConfig) {
        case "first":
            nbTocheck = 1;
            break;
        case "3first":
            nbTocheck = 3;
            break;
        case "all":
            nbTocheck = 10000;
            break
        }
        this._reportRows.each(function () {
            var boatId = $(this).closest("div").attr("id").replace(/[^0-9]/gi, "");
            var input = $("<input type='checkbox' name='graph' value='" + boatId + "' " + (nbTocheck-- > 0 ? "checked='1'" : "") + " />");
            $(this).append(input);
            that._data[boatId] = {}
        });
        this._boatsCheckboxes = $("#reportList div input");
        this._boatsCheckboxes.on("mouseover", function (evt) {
            that._container.find("path.boat").removeClass("off over");
            evt.stopPropagation()
        }).on("click", function (evt) {
            that._resetAll();
            that._activateGraph(that._currentVariable);
            evt.stopPropagation()
        })
    },
    _initVariables: function () {
        var that = this;
        $.each(this._varChekboxes, function (index, input) {
            var varName = $(input).attr("value");
            var variable = that._getVariable(varName);
            var isChecked = $(input).prop("checked");
            if (variable != null) {
                that._variables[varName] = variable;
                that._svg.appendChild(variable.tag);
                for (var boatId in that._data) {
                    var boat = sig.getBoat(boatId);
                    that._data[boatId][varName] = {
                        "max": 0,
                        "val": []
                    };
                    var boatGraphic = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    boatGraphic.setAttribute("class", "boat boat" + boatId);
                    boatGraphic.setAttribute("stroke", "#" + boat.hullColor);
                    variable.tag.appendChild(boatGraphic)
                };
                $(input).on("click", function () {
                    that._resetAll();
                    that._activateGraph(variable)
                });
                if (that._currentVariable == null && isChecked) that._currentVariable = variable
            }
        })
    },
    _initData: function (varName) {
        var prevGraphTimecode = 0;
        var currentReport = tracker.currentReport;
        while (currentReport.previous != null) {
            currentReport = currentReport.previous
        };
        while (currentReport.next != null) {
            if ((currentReport.timecode - prevGraphTimecode) > 60 * 6) {
                prevGraphTimecode = currentReport.timecode;
                this._addReportData(currentReport)
            }
            currentReport = currentReport.next
        }
        this._addReportData(currentReport)
    },
    _addReportData: function (report) {
        if (this._end > 0 && report.timecode < this._end) return;
        if (this._start > report.timecode) this._start = report.timecode;
        if (this._end < report.timecode) this._end = report.timecode;
        for (var i = 0; i < report.lines.length; i++) {
            var line = report.lines[i];
            var lineOffset = line["offset"];
            var boatData = this._data[line.boat];
            if (boatData != null) {
                $.each(this._variables, function (i, variable) {
                    if (boatData[variable.name] != null) {
                        var status = line["racestatus"];
                        if (variable.statuses[status]) {
                            var val = line[variable.name];
                            if (val != null && !isNaN(val) && val != variable.invalidValue) {
                                if (variable.globalMax < val) variable.globalMax = val;
                                boatData[variable.name]["val"].push([report.timecode, val]);
                                if (boatData[variable.name]["max"] < val) boatData[variable.name]["max"] = val
                            }
                        }
                    }
                })
            }
        }
    },
    _getVariable: function (varName) {
        switch (varName) {
        case "rank":
            return new tracker.GraphVariable("rank", "", 0, false, true, ["STA", "RAC", "ARV"], function (rank) {
                return rank - 1
            }, function (y) {
                return y + 1
            });
        case "dtl":
            return new tracker.GraphVariable("dtl", "nm", 99999, false, false, ["STA", "RAC"]);
        case "dist24h":
            return new tracker.GraphVariable("dist24h", "kts", 0, true, false, ["STA", "RAC"], function (dist) {
                return dist / 24
            });
        case "tws":
            return new tracker.GraphVariable("tws", "kts", 0, true, false, ["STA", "RAC"])
        }
        return null
    },
    _resetAll: function () {
        $("#graphics g path").each(function () {
            this.setAttribute("d", "")
        });
        $("#graphics g").each(function () {
            $(this).removeClass()
        });
        this._svgWidth = $(this._svg).width();
        this._svgHeight = $(this._svg).height()
    },
    _activateGraph: function (variable) {
        if (variable == null) return;
        this._currentVariable = variable;
        var that = this;
        var max = 0;
        var end = 0;
        this._boatsCheckboxes.each(function () {
            if ($(this).prop("checked")) {
                var boatData = that._data[$(this).val()][variable.name];
                max = Math.max(max, boatData.max);
                if (boatData && boatData.val && boatData.val.length > 0) {
                    end = Math.max(end, boatData.val[boatData.val.length - 1][0])
                }
            }
        });
        if (variable.useGlobalMax) max = variable.globalMax;
        this._boatsCheckboxes.each(function () {
            var boatId = $(this).val();
            if ($(this).prop("checked")) {
                that._drawBoat(boatId, variable.name, max, end)
            }
            if ($(this).parent().hasClass("on")) that._container.find("path.boat" + boatId).addClass("on")
        });
        this._drawGrid(0, max);
        $(variable.tag).addClass("on")
    },
    _startListeners: function () {
        var that = this;
        $(document).on(µ.events.REPORTROW_CLICK + ".graphics", function (evt, reportRow) {
            that._onReportRowClick(reportRow)
        }).on(µ.events.REPORTROW_OVER + ".graphics", function (evt, reportRow) {
            that._onReportRowOver(reportRow)
        }).on(µ.events.REPORTROW_OUT + ".graphics", function (evt, reportRow) {
            that._onReportRowOut(reportRow)
        }).on(µ.events.SIG_IS_RESIZED + ".graphics", function (evt) {
            that._redraw()
        })
    },
    _stopListeners: function () {
        $(document).off(µ.events.REPORTROW_CLICK + ".graphics").off(µ.events.REPORTROW_OVER + ".graphics").off(µ.events.REPORTROW_OUT + ".graphics").off(µ.events.SIG_IS_RESIZED + ".graphics")
    },
    _drawBoat: function (boatId, varName, max, end) {
        var variable = this._variables[varName];
        var values = this._data[boatId][variable.name].val;
        if (values.length == 0) return;
        var graphic = $(variable.tag);
        var boat = sig.getBoat(boatId);
        var boatGraphic = graphic.find("path.boat" + boatId)[0];
        var min = 0;
        var max = variable.toY(max);
        var toY = µ.math.getLinearFc(max, variable.ascending ? this._yMargin : this._svgHeight - this._yMargin, min, variable.ascending ? this._svgHeight - this._yMargin : this._yMargin);
        var toX = µ.math.getLinearFc(this._start, 0, end, this._svgWidth);
        var def = [];
        var prevX = -1;
        var prevY = -1;
        for (var i = 0; i < values.length; i++) {
            var x = Math.round(toX(values[i][0]));
            var y = Math.round(toY(variable.toY(values[i][1])));
            if (x != prevX || y != prevY) def.push(x + " " + y);
            prevX = x;
            prevY = y
        }
        boatGraphic.setAttribute("d", "M" + def.join("L"))
    },
    _drawGrid: function (min, max) {
        var maxx = this._currentVariable.toY(max);
        var stepY = this._svgHeight / maxx;
        var index = -1;
        var stepV = 1;
        var toY = µ.math.getLinearFc(min, this._currentVariable.ascending ? this._svgHeight - this._yMargin : this._yMargin, maxx, this._currentVariable.ascending ? this._yMargin : this._svgHeight - this._yMargin);
        var commands = [];
        do {
            stepV = tracker.graphics.GRID_VAL_SUBDIVISIONS[++index]
        } while (Math.abs(stepY * stepV) < 20);
        this._legend.empty();
        for (var v = 0; v <= maxx + stepV; v += stepV) {
            var y = Math.round(toY(v));
            var sup = $("<sup>" + this._currentVariable.toVal(v) + "</sup>").css("top", y);
            this._legend.append(sup);
            commands.push("M0 " + y + "h" + this._svgWidth)
        }
        this._currentVariable.gridTag.setAttribute("d", commands.join(""));
        this._container.attr("data-unit", this._currentVariable.unit)
    },
    _redraw: function () {
        this._resetAll();
        this._activateGraph(this._currentVariable)
    },
    _onReportRowOver: function (reportRow) {
        var boatId = reportRow.boat.id;
        this._container.find("path.boat").addClass("off");
        this._container.find("path.boat" + boatId).addClass("over")
    },
    _onReportRowOut: function (reportRow) {
        this._container.find("path.boat").removeClass("off over")
    },
    _onReportRowClick: function (reportRow) {
        var boatId = reportRow.boat.id;
        if (this._currentBoatId != boatId) {
            this._container.find("path.boat").removeClass("over on");
            this._container.find("path.boat" + boatId).addClass("on")
        }
    }
};
tracker.graphics.record = {
    _isInit: false,
    _isVisible: false,
    _container: null,
    _drawing: null,
    _legend: null,
    _timeValues: [],
    _advance: {
        max: 0,
        values: []
    },
    _speed: {
        max: 0,
        values: []
    },
    display: function () {
        if (!this._isInit) this._init();
        this._isVisible = true;
        this._container.show();
        this._startListeners();
        this._redraw()
    },
    hide: function () {
        if (!this._isInit) this._init();
        this._stopListeners();
        this._container.hide();
        this._isVisible = false
    },
    onTimelineChange: function () {
        if (!this._isVisible) return;
        this._redraw()
    },
    _init: function () {
        var that = this;
        this._container = $("#graphics");
        this._drawing = $("#graphics .drawing");
        this._varChekboxes = $("#graphics .variables input");
        this._legend = $("#graphics .legend");
        this._initVariables();
        this._isInit = true
    },
    _initVariables: function () {
        var that = this;
        $.each(this._varChekboxes, function (index, input) {
            var varName = $(input).attr("value");
            $(input).on("click", function () {
                that._redraw(varName)
            })
        })
    },
    _startListeners: function () {
        var that = this;
        $(document).on(µ.events.SIG_IS_RESIZED + ".graphicsRecord", function (evt) {
            that._redraw()
        })
    },
    _stopListeners: function () {
        $(document).off(µ.events.SIG_IS_RESIZED + ".graphicsRecord")
    },
    _redraw: function (varName) {
        if (varName == undefined || varName == "") varName = $("#graphics .variables input:checked").attr("value");
        this._drawing.empty();
        this._legend.empty();
        this._resetData();
        switch (varName) {
        case "advance":
            this._redrawAdvance();
            break;
        case "speed":
            this._redrawSpeed();
            break
        }
    },
    _resetData: function () {
        var endReport = tracker.currentReport;
        var firstReport = endReport;
        while (firstReport.previous != null) {
            firstReport = firstReport.previous
        };
        var startTimecode = firstReport.timecode;
        var currentReport = firstReport;
        this._timeValues = [];
        this._advance.values = [];
        this._advance.max = 0;
        this._speed.values = [];
        this._speed.max = 0;
        while (currentReport != endReport) {
            this._timeValues.push(currentReport.timecode - startTimecode);
            var dtl = currentReport.lines[0].dtl;
            this._advance.values.push(dtl);
            if (dtl > this._advance.max) this._advance.max = dtl;
            if (-dtl > this._advance.max) this._advance.max = -dtl;
            var speed = currentReport.lines[0].dist24h / 24;
            this._speed.values.push(speed);
            if (speed > this._speed.max) this._speed.max = speed;
            currentReport = currentReport.next
        }
    },
    _redrawAdvance: function () {
        var tt = µ.getTimer();
        if (this._advance.max == 0) return;
        var w = this._drawing.outerWidth();
        var h = this._drawing.outerHeight();
        if (h == 0) return;
        var hHalf = Math.round(h / 2);
        var dataWidth = this._timeValues[this._timeValues.length - 1];
        var dataHeight = this._advance.max * 2;
        var factorX = w / dataWidth;
        var factorY = h / dataHeight;
        var stepY = h / this._advance.max;
        var index = -1;
        var stepV = 1;
        do {
            stepV = tracker.graphics.GRID_VAL_SUBDIVISIONS[++index]
        } while (index < tracker.graphics.GRID_VAL_SUBDIVISIONS.length && ((Math.abs(stepY * stepV) < 50) || ((stepV % 10) != 0))) var graphCommands = [];
        var gridCommands = [];
        for (var i = 0; i < this._advance.values.length; i++) {
            graphCommands.push("L" + Math.round(this._timeValues[i] * factorX) + " " + Math.round((this._advance.max - this._advance.values[i]) * factorY))
        }
        var path = "<path d='M" + w + " " + (h / 2 + 2) + "L0 " + (h / 2 + 2) + graphCommands.join("") + "' />";
        var svgPos = "<svg id='graphAdvancePos' width='" + w + "' height='" + hHalf + "' viewBox='0 0 " + w + " " + hHalf + "' xmlns='http://www.w3.org/2000/svg' version='1.1' >" + path + "</svg>";
        var path = "<path d='M" + w + " " + (h / 2 - 2) + "L0 " + (h / 2 - 2) + graphCommands.join("") + "' />";
        var svgNeg = "<svg id='graphAdvanceNeg' width='" + w + "' height='" + hHalf + "' viewBox='0 " + hHalf + " " + w + " " + hHalf + "' xmlns='http://www.w3.org/2000/svg' version='1.1' >" + path + "</svg>";
        this._drawing.append(svgPos + svgNeg);
        for (var v = 0; v <= dataHeight / 2; v += stepV) {
            var y = Math.round((this._advance.max - v) * factorY);
            gridCommands.push("M0 " + y + "h" + w);
            this._legend.append($("<sup>" + v + "</sup>").css("top", y))
        }
        for (var v = 0; v >= -dataHeight / 2; v -= stepV) {
            var y = Math.round((this._advance.max - v) * factorY);
            gridCommands.push("M0 " + y + "h" + w);
            this._legend.append($("<sup>" + v + "</sup>").css("top", y))
        }
        var pathLines = "<path d='" + gridCommands.join("") + "' />";
        var svg = "<svg class='grid' viewbox='0 0 " + w + " " + h + "' height='" + h + "' width='" + w + "' xmlns='http://www.w3.org/2000/svg' version='1.1'>" + pathLines + "</svg>";
        this._drawing.append(svg);
        this._container.attr("data-unit", "nm")
    },
    _redrawSpeed: function () {
        var container = $("#performances article>div");
        var w = this._drawing.outerWidth();
        var h = this._drawing.outerHeight();
        var dataWidth = this._timeValues[this._timeValues.length - 1];
        var dataHeight = this._speed.max;
        var factorX = w / dataWidth;
        var factorY = h / dataHeight;
        var stepY = h / this._speed.max;
        var index = -1;
        var stepV = 1;
        do {
            stepV = tracker.graphics.GRID_VAL_SUBDIVISIONS[++index]
        } while (Math.abs(stepY * stepV) < 20) var graphCommands = [];
        var gridCommands = [];
        var x;
        var y;
        for (var i = 0; i < this._speed.values.length; i++) {
            x = Math.round(this._timeValues[i] * factorX);
            y = Math.round(h - this._speed.values[i] * factorY);
            graphCommands.push((i == 0 ? "M" : "L") + x + " " + y)
        }
        var svg = $("<svg id='graph24h' width='" + w + "' height='" + h + "' viewBox='0 0 " + w + " " + h + "' xmlns='http://www.w3.org/2000/svg' version='1.1' ><path d='" + graphCommands.join(" ") + "' /></svg>");
        this._drawing.append(svg);
        for (var v = 0; v <= dataHeight; v += stepV) {
            var y = Math.round(h - v * factorY);
            gridCommands.push("M0 " + y + "h" + w);
            this._legend.append($("<sup>" + v + "</sup>").css("top", y))
        }
        var pathLines = "<path d='" + gridCommands.join("") + "' />";
        var svg = "<svg class='grid' viewbox='0 0 " + w + " " + h + "' height='" + h + "' width='" + w + "' xmlns='http://www.w3.org/2000/svg' version='1.1'>" + pathLines + "</svg>";
        this._drawing.append(svg);
        this._container.attr("data-unit", "kts")
    }
};
tracker.IconButton = function (tag) {
    var __package = tracker;
    this.id = tag.attr("id").replace("bt_", "");
    this.isActive = false;
    this.isDefault = false;
    this.activationlevel = parseInt(tag.attr("data").substr(2, 1));
    this.tag = tag;
    this._isToogle = tag.attr("data").substr(0, 1) == "1";
    this._isReduced = false;
    if (!__package.__classIconButtonIsInit) {
        var __class = __package.IconButton;
        var __proto = __class.prototype;
        __proto.click = function () {
            this.tag.click()
        };
        __proto.setState = function (state) {
            if (this._isToogle) this._toggle(state);
            this._isActive = state;
            this._isReduced = false
        };
        __proto.reduce = function () {
            if (this._isToogle) {
                this._isReduced = true;
                this.tag.addClass("alt")
            }
        };
        __proto.enable = function (state) {
            this.tag.removeClass("disabled");
            if (!state) this.tag.addClass("disabled")
        };
        __proto._bindEvents = function () {
            var that = this;
            this.tag.addClass("off").on("mouseover", function () {
                that._onMouseOver()
            }).on("mouseout", function () {
                that._onMouseOut()
            }).on("mousedown", function () {
                that._onMouseDown()
            }).on("mouseup", function () {
                that._onMouseUp()
            }).on("click", function () {
                try {
                    that._onClick()
                } catch (err) {
                    console.log(err)
                }
                return false
            })
        };
        __proto._isEnabled = function () {
            return this.tag.css("cursor") != "default"
        };
        __proto._toggle = function (state) {
            this.tag.removeClass("off over on").addClass(state ? "on" : "off");
            this.isActive = state
        };
        __proto._onMouseOver = function () {
            if (!this.isActive && this._isEnabled()) this.tag.removeClass("off over on").addClass("over")
        };
        __proto._onMouseOut = function () {
            if (!this.isActive && this._isEnabled()) this.tag.removeClass("off over on").addClass("off")
        };
        __proto._onMouseDown = function () {
            if (!this._isEnabled()) return;
            if (!this.isActive) this.tag.removeClass("off over on").addClass("on");
            $(document).trigger(µ.events.ICON_BUTTON_DOWN, this)
        };
        __proto._onMouseUp = function () {
            if (!this._isEnabled()) return;
            if (!this.isActive) this.tag.removeClass("off over on").addClass("over");
            $(document).trigger(µ.events.ICON_BUTTON_UP, this)
        };
        __proto._onClick = function () {
            if (!this._isEnabled()) return;
            if (this._isToogle) {
                if (this._isReduced) {
                    this._toggle(true);
                    this._isReduced = false
                } else {
                    this._toggle(!this.isActive)
                }
            } else {
                var that = this;
                window.setTimeout(function () {
                    that.tag.removeClass("off over on").addClass("off")
                }, 200);
            }
            $(document).trigger(µ.events.ICON_BUTTON_CLICK, this)
        };
        __package.__classIconButtonIsInit = true
    };
    this._bindEvents()
};
tracker.Run = function (id, date, length, startLat, startLng, endLat, endLng) {
    var __package = tracker;
    this.id = id;
    this.date = date;
    this.length = length;
    this.startLat = startLat;
    this.startLng = startLng;
    this.endLat = endLat;
    this.endLng = endLng;
    if (!__package.__classRunIsInit) {
        var __class = __package.Run;
        var __proto = __class.prototype;
        __package.__classRunIsInit = true
    };
};
tracker.BoatClass = function (id, name, run) {
    var __package = tracker;
    this.id = id;
    this.name = name;
    this.run = run;
    this.minDtf = 0;
    this.maxDtf = 0;
    this.boats = [];
    if (!__package.__classBoatClassIsInit) {
        var __class = __package.BoatClass;
        var __proto = __class.prototype;
        __proto.setMinDtf = function (minDtf) {
            this.minDtf = minDtf
        };
        __proto.setMaxDtf = function (mxDtf) {
            this.maxDtf = mxDtf
        };
        __proto.addBoat = function (boat) {
            this.boats.push(boat)
        };
        __proto.getBoat = function (boatId) {
            return $.grep(this.boats, function (boat, index) {
                return boat.id == boatId
            }).pop()
        };
        __package.__classBoatClassIsInit = true
    };
};
tracker.Report = function (id, timecode, offset, lines, columns) {
    var __package = tracker;
    this.id = id;
    this.timecode = timecode;
    this.offset = offset;
    this.lines = [];
    this.previous = null;
    this.next = null;
    if (!__package.__classReportIsInit) {
        var __class = __package.Report;
        var __proto = __class.prototype;
        __proto._treatLines = function (linesData) {
            var that = this;
            $.each(linesData, function (i, lineData) {
                var line = new Object();
                $.each(__class.COLUMNS, function (j, col) {
                    line[col] = lineData[j]
                });
                line["report"] = that;
                var timecode = that.timecode + line["offset"] * 60;
                line["timecode"] = timecode;
                line["date"] = µ.getDate(timecode);
                line["retard"] = line["offset"] - that.offset;
                if (line["speed"] && line["vmg"]) line["vmgpercent"] = line["speed"] == 0 ? 0 : line["vmg"] / line["speed"] * 100;
                that.lines.push(line)
            })
        };
        __package.__classReportIsInit = true
    };
    this._treatLines(lines)
};
tracker.Report.COLUMNS = [];
tracker.ReportRow = function (boat, boatClass) {
    var __package = tracker;
    this.boat = boat;
    this.boatClass = boatClass;
    this.rank = 0;
    this.tag = null;
    this.dtf = 0;
    this.date = null;
    this.isRacing = true;
    this.line = null;
    this.timecode = 0;
    this._rankTag = null;
    this._rankValTag = null;
    this._infosTag = null;
    this._identity = null;
    this._isActive = false;
    if (!__package.__classReportRowIsInit) {
        var __class = __package.ReportRow;
        var __proto = __class.prototype;
        var __allSatuses = [];
        var __reportRowModel = $("#reportList .row");
        var __reportRowStatusDef = {};
        __reportRowModel.find(".infos").remove().each(function () {
            var tag = $(this);
            $.each(tag.attr("rel").split(","), function (index, status) {
                var html = tag.clone().removeAttr("rel").addClass(status).wrapAll('<div>').parent().html();
                __reportRowStatusDef[status] = new µ.HtmlDefinition(html);
                __allSatuses.push(status)
            })
        });
        __reportRowModel.remove();
        __allSatuses = __allSatuses.join(" ");
        __proto.setRank = function (isRacing, rank, progress, dtf) {
            this.rank = rank;
            this.isRacing = isRacing;
            this.dtf = dtf;
            if (this._rankTag) {
                this._rankTag.setAttribute("class", "rank " + (progress == undefined || progress == 0 ? "eq" : progress > 0 ? "up" : "down"));
                this._rankValTag.innerHTML = rank
            }
        };
        __proto.setValues = function (status) {
            var definition = __reportRowStatusDef[status];
            if (definition == null) return;
            if (this._infosTag) this._infosTag.remove();
            this._infosTag = $(definition.update(this));
            this.tag.append(this._infosTag);
            this.tag.removeClass(__allSatuses).addClass(status)
        };
        __proto.focus = function () {
            if (!this._isActive) this.boat.focus()
        };
        __proto.blur = function () {
            if (!this._isActive) this.boat.blur()
        };
        __proto.activate = function () {
            this.tag.removeClass("on").addClass("on");
            this.boat.activate();
            this._isActive = true
        };
        __proto.desactivate = function () {
            this.tag.removeClass("on");
            this._isActive = false
        };
        __proto.getIdentity = function () {
            return this._identity.clone().addClass("card" + this.boat.id)
        };
        __proto.getStatusDef = function () {
            var isLivePosition = sig.pointIsOnLiveArea(this.boat.lat, this.boat.lng);
            var isLiveArrivalPosition = sig.pointIsOnArrivalArea(this.boat.lat, this.boat.lng);
            var status = this.line.racestatus;
            var result = [status];
            result.push(status == "RAC" ? (this.line.rank == 1 ? "_1" : "_N") + (isLivePosition ? "_LIVE" : "") + (isLiveArrivalPosition ? "_ARRIVAL" : "") : "");
            return result
        };
        __proto.getSailorsHtml = function (format) {
            var result = [];
            for (var i = 0; i < this.boat.sailors.length; i++) {
                var sailor = this.boat.sailors[i];
                result.push(format.replace("#nationality#", sailor.nationality).replace("#fname#", sailor.fname).replace("#lname#", sailor.lname))
            }
            return result.join()
        };
        __proto.getPhotosHtml = function (format) {
            var result = [];
            var photoFolder = __class.PHOTO_URL == "" ? "data/photos/" : __class.PHOTO_URL;
            var withPhoto = __class.PHOTO_VERSION > 0 && this.boat.sailors.length > 0;
            if (!withPhoto) return "";
            for (var i = 0; i < this.boat.sailors.length; i++) {
                var sailorWithPhoto = this.boat.sailors[i].withPhoto == undefined ? withPhoto : this.boat.sailors[i].withPhoto;
                if (sailorWithPhoto) {
                    var img = "<img src='" + µ.WEBROOT + photoFolder + "sk" + this.boat.id + "" + (i + 1) + ".jpg?v=" + __class.PHOTO_VERSION + "' />";
                    result.push(img)
                }
            }
            return result
        };
        __proto._buildTag = function () {
            var that = this;
            this.tag = __reportRowModel.clone();
            this.tag.attr({
                "id": "line" + this.boat.id,
                "alt": "class" + this.boatClass.id
            });
            var identityTag = this.tag.find(".identity");
            var identityDef = new µ.HtmlDefinition(identityTag.clone().wrapAll('<div>').parent().html());
            identityTag.replaceWith(identityDef.update(this));
            this._rankTag = this.tag.find(".rank")[0];
            this._rankValTag = this.tag.find(".rank .val")[0];
            if (!µ.IS_TOUCHE_DEVICE) {
                this.tag.on("mouseover", function (evt) {
                    that.focus();
                    $(document).trigger(µ.events.REPORTROW_OVER, that)
                }).on("mouseout", function (evt) {
                    that.blur();
                    $(document).trigger(µ.events.REPORTROW_OUT, that)
                })
            }
            this.tag.on("click", function (evt) {
                that.activate();
                $(document).trigger(µ.events.REPORTROW_CLICK, that)
            }).data("obj", this);
            this._identity = this.tag.find(".identity")
        };
        __package.__classReportRowIsInit = true
    };
    this._buildTag()
};
tracker.ReportRow.PHOTO_URL = "";
tracker.ReportRow.PHOTO_VERSION = 0;
tracker.GraphVariable = function (name, unit, invalidValue, ascending, useGlobalMax, statuses, toY, toVal) {
    var __package = tracker;
    this.name = name;
    this.unit = unit;
    this.ascending = ascending;
    this.invalidValue = invalidValue;
    this.useGlobalMax = useGlobalMax;
    this.toY = toY || function (val) {
        return val
    };
    this.toVal = toVal || function (y) {
        return y
    };
    this.globalMax = Number.MIN_VALUE;
    this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.tag.setAttribute("id", "graph_" + name);
    this.gridTag = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.gridTag.setAttribute("class", "grid");
    this.tag.appendChild(this.gridTag);
    this.statuses = {};
    for (var i = 0; i < statuses.length; i++) this.statuses[statuses[i]] = true;
    if (!__package.__classGraphVariableIsInit) {
        var __class = __package.GraphVariable;
        var __proto = __class.prototype;
        __package.__classClass_nameIsInit = true
    };
};
tracker.Waypoint = function (id, name, type, lat, lng) {
    var __package = tracker;
    this.id = id;
    this.name = name;
    this.type = type;
    this.tag = null;
    this.lat = lat;
    this.lng = lng;
    this.x = 0;
    this.y = 0;
    this._position = "";
    this._scale = "";
    if (!__package.__classWaypointIsInit) {
        var __class = __package.Waypoint;
        var __proto = __class.prototype;
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
        __proto.updateScale = function () {
            this._scale = 1 / sig.mapScale;
            this._updateTag()
        };
        __proto.display = function () {
            $(this.tag).show()
        };
        __proto.hide = function () {
            $(this.tag).hide()
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("id", "wp_" + this.id);
            var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = this.name;
            this.tag.appendChild(text);
            text.setAttribute("x", 7);
            text.setAttribute("y", -5);
            var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("class", this.type);
            this.tag.appendChild(g);
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", 0);
            circle.setAttribute("cy", 0);
            circle.setAttribute("r", 4);
            g.appendChild(circle);
            var arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
            arrow.setAttribute("d", "M7.641-7.346c-1.92-1.984-4.613-3.217-7.591-3.217c-3.616,0-6.808,1.816-8.713,4.586c0.349,0.271,1.274,0.993,1.579,1.24c1.53-2.301,4.146-3.818,7.116-3.818c2.317,0,4.418,0.922,5.956,2.419C5.084-5.459,3.85-4.555,3.85-4.555l6.41,2.489L9.745-8.945C9.745-8.945,8.135-7.727,7.641-7.346z");
            arrow.setAttribute("class", "arrow");
            g.appendChild(arrow);
            var start = document.createElementNS("http://www.w3.org/2000/svg", "path");
            start.setAttribute("d", "M-4 -7h8L0 -11zM-4 7h8L0 11zM-7 -4v8L-11 0zM7 -4v8L11 0z");
            start.setAttribute("class", "start");
            g.appendChild(start)
        };
        __proto._updateTag = function () {
            this.tag.setAttribute("transform", this._position + " scale(" + this._scale + ")")
        };
        __package.__classWaypointIsInit = true
    };
    this._buildTag();
    this.updatePosition()
};