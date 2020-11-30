tracker.extra = {
    _vrBoat: null,
    onReady: function () {
        var that = this;
        this._moveVR();
        this._addVrButton();
        $(document).on(µ.events.ICON_BUTTON_CLICK, function (evt, button) {
            that._onIconButtonClick(button)
        })
    },
    _moveVR: function () {
        $("#sig").append($("#vr"))
    },
    _addVrButton: function () {
        var svg = "<svg viewBox='0 0 26 26'>" + "<path stroke='none' d='M16.626,19.952l1.04,3.619h-3.204l-1.028-3.608h-0.542l-0.764,3.608H8.984l1.997-9.458 " + "h6.594c0.618-0.019,1.216,0.223,1.649,0.666c0.434,0.434,0.67,1.025,0.656,1.641c0,0.182-0.02,0.361-0.058,0.54l-0.026,0.152 " + "c-0.165,0.742-0.57,1.408-1.154,1.895c-0.562,0.51-1.267,0.835-2.021,0.932 M16.16,16.364h-2.503l-0.283,1.328h2.493 " + "c0.214-0.002,0.418-0.097,0.563-0.255c0.155-0.146,0.245-0.349,0.249-0.563c0.034-0.249-0.142-0.479-0.392-0.512 " + "C16.246,16.357,16.201,16.357,16.16,16.364'/> " + "<path stroke='none' d='M13.889,3.283l-1.53,6.313c-0.037,0.171-0.366,0.637-0.53,0.637h-0.057 " + "c-0.163,0-0.492-0.466-0.529-0.637L9.672,2.104H6.322L7.9,9.977c0.412,1.761,2.071,2.939,3.869,2.748 " + "c1.81,0.187,3.48-0.984,3.926-2.748l1.536-6.693H13.889z'/> " + "</svg>";
        var link = $("<a id='bt_vr' class='iconbutton off' href='' title='" + ($("body").attr("rel") == "fr" ? "Premier joueur" : "First player") + "' data='1,1'>" + svg + "</a>");
        $("#buttons #bt_distance").after(link)
    },
    _onIconButtonClick: function (button) {
        var that = this;
        switch (button.id) {
        case "vr":
            if (button.isActive) {
                µ.get("https://z307734galvx.live.gamesparks.net/callback/z307734GALvx/getFirstOfFleet/CXx3xxtwWf3klK30ihp4K2GTSsTnX3AG", function (data) {
                    that._onVrDataLoaded(data)
                })
            } else {
                this._hideVrBoat()
            }
            break
        }
    },
    _onVrDataLoaded: function (data) {
        if (data == null || data.rc == null || data.rc != "ok") return;
        try {
            var name = data.res[0].personal.displayName;
            var heading = data.res[0].heading;
            var lat = data.res[0].pos.lat;
            var lng = data.res[0].pos.lon;
            if (isNaN(heading) || isNaN(lat) || isNaN(lng)) return;
            if (this._vrBoat == null) {
                this._vrBoat = new tracker.extra.VrBoat();
                sig.addTimeElement("miscLayer", this._vrBoat)
            }
            this._vrBoat.placeAt(lat, lng);
            this._vrBoat.setHeading(heading);
            this._vrBoat.setName(name);
            $("#miscLayer").addClass("on");
            sig.centerOn(lat, lng)
        } catch (err) {
            console.log(err)
        }
    },
    _hideVrBoat: function () {
        $("#miscLayer").removeClass("on")
    }
};
tracker.extra.VrBoat = function () {
    var __package = tracker.extra;
    sig.PointElement.call(this, 85, 0);
    this.tag = null;
    this._name = name;
    if (!__package.__classVrBoatIsInit) {
        var __class = __package.VrBoat;
        var __proto = __class.prototype;
        __proto.setHeading = function (heading) {
            this._icon.setAttribute("transform", "rotate(" + heading + ")")
        };
        __proto.setName = function (name) {
            this._text.textContent = name
        };
        __proto._buildTag = function () {
            this.tag = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.tag.setAttribute("id", "vrboat");
            this._icon = sig.getSvgModel("boat_hull_1");
            this.tag.appendChild(this._icon);
            this._text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            this._text.textContent = "VR";
            this._text.setAttribute("x", 9);
            this._text.setAttribute("y", -7);
            this.tag.appendChild(this._text);
            this.$tag = $(this.tag);
            this.updateScale(1)
        };
        __package.__classVrBoatIsInit = true
    };
    this._buildTag()
};
tracker.extra.VrBoat.prototype = Object.create(sig.PointElement.prototype);
document.addEventListener("DOMContentLoaded", function () {
    tracker.extra.onReady()
});