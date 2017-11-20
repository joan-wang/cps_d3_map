// Autocomplete options
var keys = [];

// Set spacing guidelines for info panel
var margin = {top: 20, right: 10, bottom: 10, left: 10}
var width = 550 - margin.left - margin.right;
var height = 700 - margin.top - margin.bottom;

// Define custom icon
var schoolIcon = L.icon({
	iconUrl: 'data/school_icon.png',
	iconSize: [38, 95],
	});

// Create map object from Leaflet
var map = new L.Map("map", {center: [41.8256, -87.62], zoom: 11})
    .addLayer(new L.TileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 20,
	ext: 'png'
	}));

// Map and contents are svg1
var svg1 = d3.select(map.getPanes().overlayPane).append("svg");
var g1 = svg1.append("g").attr("class", "leaflet-zoom-hide");

// Info panel and contents are svg2
var svg2 = d3.select('#info-panel')
	.append('svg')
	.attr("preserveAspectRatio", "xMinYMin meet")
  	.attr("viewBox", "0 0 450 450")
var g2 = svg2.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Load multiple data files in parallel
var schools, passage, remaining = 2;

d3.json("data/Chicago Public Schools - School Locations SY1617.geojson", function(error, collection) {
	if (error) {
	console.log(error);
	} else {
		// Create LatLng property
		collection.features.forEach(function(d) {
			d.LatLng = new L.LatLng(d.geometry.coordinates[1], d.geometry.coordinates[0])
			d.shortName = d.properties.short_name
			d.numCrimes = "TBD"
			d.commArea = d.properties.commarea
			d.safetyRating = "TBD"
			d.enrollment = "TBD"
			d.safePassage = "TBD"
			d.att12 = 90
			d.att13 = 92
			d.att14 = 94
			d.att15 = 96
			d.att16 = 98
			d.att17 = 100
			d.safety16 = 1
			d.safety17 = 3
		});
		schools = collection;
		dummy_school = schools.features[0]; 
		// TO DO: showPanel should be triggered when a school is selected
		// Using dummy data for now

  		// Add school names to keys variable for autocomplete
  		for (var i = 0; i < schools.features.length; i++) { 
		    keys.push({"short_name":schools.features[i].properties.short_name});
		}
  		if (!--remaining) loadMap(), startAuto(), showPanel(dummy_school);
  		// TO DO: showPanel should be triggered when a school is selected
  	};
});

d3.json("data/Chicago Public Schools - Safe Passage Routes SY1617.geojson", function(error, collection) {
	if (error) { 
    	console.log(error);
  	} else {
  		routes = collection;
  		console.log(routes)
  		if (!--remaining) loadMap(), startAuto(), showPanel(dummy_school);
  	};
});

function onSelect(d) {
        alert(d.School);
    }

function startAuto() {
	var mc = autocomplete(document.getElementById('search'))
                .keys(keys)
                .dataField("short_name")
                .placeHolder("Search States - Start typing here")
                .width(960)
                .height(500)
                .onSelected(onSelect)
                .render();
}

function loadMap() {
	console.log("I JUST RESET THE MAP")

	// Projection function with Leaflet for routes
	var transform = d3.geoTransform({point: projectPoint});
	var path = d3.geoPath().projection(transform);

	function projectPoint(x, y) {
		var point = map.latLngToLayerPoint(new L.LatLng(y, x));
		this.stream.point(point.x, point.y);
	}

	// Option 1: Use circles as icons
	var feature_schools = g1.selectAll("circle")
		.data(schools.features)
		.enter().append("circle")
		.attr('class', 'school-location')
		.attr('fill', '#ffd800')
		.attr('fill-opacity', .6)
		.attr('r', 5);

	// Option 2: Use school house as icons. TO DO: change colors
	/*var feature_schools = g.selectAll("myPoint")
		.data(schools.features)
		.enter().append("image")
		.attr('xlink:href', 'school_icon.png')
		.attr('width', 20)
		.attr('height', 20)
		.attr('color', '#ffd800')
		.style('opacity', .5)
		.style('color', 'ffd800');*/
	
	var feature_routes = g1.selectAll("path")
		.data(routes.features)
		.enter().append("path")
		.attr('class', 'route-location')
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
	    
	    svg1.attr("width", bottomRight[0] - topLeft[0])
		    .attr("height", bottomRight[1] - topLeft[1])
		    .style("left", topLeft[0] + "px")
		    .style("top", topLeft[1] + "px");

	    g1.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
		
		// Plot schools as points
		feature_schools.attr("transform", function(d) { 
			return "translate("+ 
				map.latLngToLayerPoint(d.LatLng).x +","+ 
				map.latLngToLayerPoint(d.LatLng).y +")";
			});
		//Plot routes as line paths
		feature_routes.attr("d", path);
	}
}

function showPanel(selection) {
	// Fill in text info about selected school
	textFields = [[selection.shortName, 'School name: '], 
		[selection.safePassage, "Safe Passage School: "],
		[selection.commArea, 'Neighborhood: '], 
		[selection.enrollment, 'Student enrollment: '],
		[selection.numCrimes, 'Number of crimes within 1 mile in 2016: ']]
	
	for (var i = 0; i < textFields.length; i++) { 
		g2.append('text')
			.attr('font-size', 18)
			.attr("transform", "translate(" + margin.left + " ," + (margin.top + 27*i) + ")")
			.text(textFields[i][1] + textFields[i][0])
		}

	attendanceChart(selection);
	safetyChart(selection);
}

function attendanceChart(selection) {

}

function safetyChart(selection) {

}
	