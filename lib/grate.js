Grate = {};

Grate.great_circle_route = function(pt1, pt2, ttl, bounds) {
    var gc = new arc.GreatCircle(new arc.Coord(pt1[0], pt1[1]), new arc.Coord(pt2[0], pt2[1]));	    
	var line = gc.Arc(200);	   
	return [bezier(line.geometries[0].coords)];
}
function bezier(pts) {
    function curve(points) {
        var c = [];
        var steps = 40;

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;

            var pt = [
                Math.pow(1 - t, 3) * points[0][0]
                 + 3 * t * Math.pow(1 - t, 2) * points[1][0]
                 + 3 * (1 - t) * Math.pow(t, 2) * points[2][0]
                 + Math.pow(t, 3) * points[3][0],
                Math.pow(1 - t, 3) * points[0][1]
                 + 3 * t * Math.pow(1-t,2) * points[1][1]
                 + 3 * (1-t) * Math.pow(t,2) * points[2][1]
                 + Math.pow(t, 3) * points[3][1]
            ];
            c.push(pt);
        }
        return c;
    }

    var c = [];

    if (pts.length < 4) return pts;

    for (var i = 0; i < pts.length; i += 3) {
        if (i + 4 <= pts.length) {
            c = c.concat(curve(pts.slice(i, i + 4)));
        }
    }

    return c;
}

Grate.bezier_route = function(from, to) {
    var x0 = from[0];
    var y0 = from[1];
    var x1 = to[0];
    var y1 = to[1];

    var dx = x1 - x0;
    var dy = y1 - y0;

    var bzx = x0 + dx/4;
    var bzy = y1;

    var res = 100;

    var pts = [];
    for(var t=0.0; t<1.0; t += 1.0/res) {
        var x = (1-t) * (1-t) * x0 + 2 * (1-t) * t * bzx + t * t * x1;
        var y = (1-t) * (1-t) * y0 + 2 * (1-t) * t * bzy + t * t * y1;
        pts.push([x, y]);
    }
    if(!(to[0] == pts[pts.length-1][0] && to[1] == pts[pts.length-1][1])) {
		var to_clone = [to[0],to[1]];
        pts.push(to_clone);
		
	}
    return [pts];
}
