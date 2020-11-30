var xhr = new XMLHttpRequest();
xhr.open("GET",'https://tracking2020.vendeeglobe.org/data/race/tracker_tracks.hwx?v=20201125135939' , true);
xhr.responseType = "arraybuffer";
xhr.onload = function (e) {
    if (this.status == 200) {
        var uInt8Array = new UInt8Array(this.response);
        var data = new TextDecoder("utf-8").decode(uInt8Array);
        return data
    }
};
xhr.send()

#Extracted from Chrom Developper Interface

window.key = ["\x6C\x65\x6E\x67\x74\x68"];
window.UInt8Array = function(buffer) {
    var uInt8Array = new Uint8Array(buffer);
    var func = decode_func(uInt8Array[0]);
    var shiftedArray = (func(uInt8Array[1]) << 16) + (func(uInt8Array[2]) << 8) + (func(uInt8Array[3]));
    var n = 4;
    var result = new Uint8Array(shiftedArray);
    var i = 0;
    while (n < uInt8Array[key[0]] && i < shiftedArray) {
        var elt = uInt8Array[n];
        elt = (elt ^ (n & 0xFF)) ^ 0xA3;
        ++n;
        for (var j = 7; j >= 0; j--) {
            if ((elt & (1 << j)) == 0) {
                result[i++] = func(uInt8Array[n++])
            } else {
                var a = func(uInt8Array[n]);
                var b = (a >> 4) + 3;
                var index = (((a & 0xF) << 8) | func(uInt8Array[n + 1])) + 1;
                n += 2;
                for (var k = 0; k < b; k++) {
                    result[i] = result[i++ - index]
                }
            }
            ;if (n >= uInt8Array[key[0]] && result[key[0]] >= shiftedArray) {
                break
            }
        }
    }
    ;return result
}

window.decode_func = function(len) {
    var key1 = _0x88FE88;
    var key2 = _0xFE88AA;
    var key3 = _0xEE8080;
    var key4 = _0xA0A0F0;
    for (var i = 0; i < len; ++i) {
        shift_key()
    }
    ;function shift_key() {
        var curr_key = key1;
        curr_key ^= (curr_key << 11) & 0xFFFFFF;
        curr_key ^= (curr_key >> 8) & 0xFFFFFF;
        key1 = key2;
        key2 = key3;
        key3 = key4;
        key4 ^= (key4 >> 19) & 0xFFFFFF;
        key4 ^= curr_key
    }
    return function(data) {
        var decode = data ^ (key1 & 0xFF);
        shift_key();
        return decode
    }
}

