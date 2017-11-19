// Autocomplete options
var keys = [];

// Define custom icon
var schoolIcon = L.icon({
	iconUrl: 'school_icon.png',
	iconSize: [38, 95],
	});

// Create map object from Leaflet
var map = new L.Map("map", {center: [41.8256, -87.6846], zoom: 11})
    .addLayer(new L.TileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 20,
	ext: 'png'
	}));

var svg = d3.select(map.getPanes().overlayPane).append("svg");

var g = svg.append("g").attr("class", "leaflet-zoom-hide");
	
// Load multiple data files in parallel
var schools, passage, remaining = 2;

d3.json("data/Chicago Public Schools - School Locations SY1617.geojson", function(error, collection) {
	if (error) { 
    	console.log(error);
  	} else {
  		// Create LatLng property
  		collection.features.forEach(function(d) {
			d.LatLng = new L.LatLng(d.geometry.coordinates[1],
									d.geometry.coordinates[0])
			d.short_name = d.properties.short_name
		});
  		schools = collection;
  		
  		// Add school names to keys variable for autocomplete
  		for (var i = 0; i < schools.features.length; i++) { 
		    keys.push({"short_name":schools.features[i].properties.short_name});
		}
  		if (!--remaining) loadMap(), startAuto();
  	};
});

d3.json("data/Chicago Public Schools - Safe Passage Routes SY1617.geojson", function(error, collection) {
	if (error) { 
    	console.log(error);
  	} else {
  		routes = collection;
  		console.log(routes)
  		if (!--remaining) loadMap(), startAuto();
  	};
});

function onSelect(d) {
        alert(d.School);
    };

function startAuto() {
	var mc = autocomplete(document.getElementById('search'))
                .keys(keys)
                .dataField("short_name")
                .placeHolder("Search States - Start typing here")
                .width(960)
                .height(500)
                .onSelected(onSelect)
                .render();
};

function loadMap() {
	console.log("I JUST RESET THE MAP")

	// Projection function with Leaflet for routes
	var transform = d3.geoTransform({point: projectPoint});
	var path = d3.geoPath().projection(transform);

	// Use circles as icons
	var feature_schools = g.selectAll("circle")
		.data(schools.features)
		.enter().append("circle")
		.attr('fill', '#ffd800')
		.attr('fill-opacity', .6)
		.attr('r', 5);

	// Use school house as icons
	/*var feature_schools = g.selectAll("myPoint")
		.data(schools.features)
		.enter().append("image")
		.attr('xlink:href', 'school_icon.png')
		.attr('width', 20)
		.attr('height', 20)
		.attr('color', '#ffd800')
		.style('opacity', .5)
		.style('color', 'ffd800');*/

	var feature_routes = g.selectAll("path")
		.data(routes.features)
		.enter().append("path")
		.attr('stroke', '#1696d2')
		.attr('stroke-width', 2)
		.attr('stroke-opacity', .6)
		.attr('fill', 'none');
	
	// Ensure that data moves with the map
	map.on("viewreset", reset);
  	reset();
	
	function reset() {
		// Compute bounding box
	    var bounds = path.bounds(schools),
	        topLeft = bounds[0],
	        bottomRight = bounds[1];
	    
	    svg.attr("width", bottomRight[0] - topLeft[0])
		    .attr("height", bottomRight[1] - topLeft[1])
		    .style("left", topLeft[0] + "px")
		    .style("top", topLeft[1] + "px");

	    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
		
	    // Plot schools as points
	    feature_schools.attr("transform", 
			function(d) { 
				return "translate("+ 
					map.latLngToLayerPoint(d.LatLng).x +","+ 
					map.latLngToLayerPoint(d.LatLng).y +")";
				});
		// Plot routes as line paths
		feature_routes.attr("d", path);
	}

  	function projectPoint(x, y) {
	  var point = map.latLngToLayerPoint(new L.LatLng(y, x));
	  this.stream.point(point.x, point.y);
	}
};