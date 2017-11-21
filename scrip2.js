// Autocomplete options
var keys = [];

//Create a tooltip, hidden at the start
var tooltip = d3.select("map").append("div").attr("class","tooltip");

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
			d.LatLng = new L.LatLng(d.geometry.coordinates[1], d.geometry.coordinates[0])
			d.shortName = d.properties.short_name
		});
		schools = collection;

  		// Add school names to keys variable for autocomplete
  		for (var i = 0; i < schools.features.length; i++) { 
		    keys.push({"shortName":schools.features[i].shortName});
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
    }

function startAuto() {
	var mc = autocomplete(document.getElementById('search'))
                .keys(keys)
                .dataField("shortName")
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

	// Option 1: Use circles as icons
	var feature_schools = g.selectAll("circle")
		.data(schools.features)
		.enter().append("circle")
		.attr('fill', '#ffd800')
		.attr('fill-opacity', .6)
		.attr('r', 5)
		.on("mouseover", showTooltip)
		.on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

	// Option 2: Use school house as icons. Can't change colors easily.
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
		feature_schools.attr("transform", function(d) { 
			return "translate("+ 
				map.latLngToLayerPoint(d.LatLng).x +","+ 
				map.latLngToLayerPoint(d.LatLng).y +")";
			});
		// Plot routes as line paths
		feature_routes.attr("d", path);
	}
	
	//Position of the tooltip relative to the cursor
	var tooltipOffset = {x: 5, y: -25};
	
	// Show school name on hover
	function showTooltip(d) {
		moveTooltip();
		console.log(d.properties.schoolName)
		tooltip.style("display","block")
		.text(d.properties.schoolName);

	}

	//Move the tooltip to track the mouse
	function moveTooltip() {
  		tooltip.style("top",(d3.event.pageY+tooltipOffset.y)+"px")
  		.style("left",(d3.event.pageX+tooltipOffset.x)+"px");
	}

	//Create a tooltip, hidden at the start
	function hideTooltip() {
		tooltip.style("display","none");
	}
	

  	/*feature_schools.on("mouseover", hover)

  	function hover() {
		var school_name = d3.select(this).attr('shortName');
		var xPosition = parseFloat(d3.select(this).attr('x'));
		var yPosition = parseFloat(d3.select(this).attr('y'));
		
		svg.append('text')
			.attr('id', 'tooltip')
			.attr('x', xPosition)
			.attr('y', yPosition)
			.attr('text-anchor', 'middle')
			.text(d);
	}

	feature_schools.on('mouseout', function() {
		d3.select('#tooltip').remove();
	})*/
}