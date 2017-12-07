var active_school = d3.select(null);
var active_route = d3.select(null);

// Define tooltip
var div = d3.select('body').append('div')
	.attr('class', 'tooltip')
	.style('opacity', 0);

// TO DO: Fix margin convention
// Set spacing for info panel
var margin = {top: 20, right: 20, bottom: 10, left: 20}
var width = 550 - margin.left - margin.right;
var height = 700 - margin.top - margin.bottom;

// Set spacing for charts in info panel
var chart_margin = {left: 50, right:10, top: 10, bottom:100}
var chart_width = width/2 - chart_margin.left - chart_margin.right
var chart_height = height*0.6 - chart_margin.bottom - chart_margin.top
	
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

/*
var heat = new L.HeatLayer([
	[41.8256, -87.62, 10], // lat, lng, intensity
	[41.83, -87.8, 10],
	[41.2, -87.7, 10],
	]).addTo(map);*/
/*

// Alternative way to create map
var base = new L.TileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 20,
	ext: 'png'
	});

var heat = new L.HeatLayer([
	[41.8256, -87.62, 10], // lat, lng, intensity
	[41.83, -87.8, 10],
	[41.2, -87.7, 10],
	], {radius: 35});

var heat = new L.heatLayer(addressPoints);

console.log(base)
console.log(heat)
var map = new L.Map('map', {
	center: [41.8256, -87.62], 
	zoom: 11,
	layers: [base, heat]
}); */

// Map and contents are svg1
var svg1 = d3.select(map.getPanes().overlayPane).append("svg");
var g1 = svg1.append("g").attr("class", "leaflet-zoom-hide");

// Info panel is svg2
var svg2 = d3.select('#info-panel')
	.append('svg')
	.attr("preserveAspectRatio", "xMinYMin meet")
  	.attr("viewBox", "0 0 550 700")

var g2a = svg2.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var g2b = svg2.append("g")
	.attr("transform", "translate(" + (margin.left + 0.5*width) + "," + margin.top + ")");



// Load multiple data files in parallel
var schools, passage, crimes, remaining = 3;

d3.json("data/locations_updated.geojson", function(error, collection) {
	if (error) {
	console.log(error);
	} else {
		// Create LatLng property
		collection.features.forEach(function(d) {
			d.schoolID = d.properties.school_id
			d.LatLng = new L.LatLng(d.geometry.coordinates[1], d.geometry.coordinates[0])
			d.shortName = d.properties.short_name
			d.longName = d.properties.longName
			d.numCrimes = d.properties.numCrimes
			d.commArea = d.properties.commarea
			d.safetyRating = d.properties.safetyRating
			d.enrollment = d.properties.enrollment
			d.safePassage = d.properties.safePassage
			d.attendance = d.properties.attendance
			d.safety = d.properties.safety
		});
		schools = collection;
		console.log(schools)
		
  		if (!--remaining) loadMap(), startAuto("Search States - Start typing here");
  		// TO DO: showPanel should be triggered when a school is selected
  	};
});

d3.json("data/Chicago Public Schools - Safe Passage Routes SY1617.geojson", function(error, collection) {
	if (error) { 
    	console.log(error);
  	} else {
  		collection.features.forEach(function(d) {
			d.schoolID = d.properties.schoolid
			d.shortName = d.properties.school_nam
		});
  		routes = collection;
  		console.log(routes)
  		if (!--remaining) loadMap(), startAuto("Search States - Start typing here");
  	};
});

function rowConverter(d) {
			return { 
				id: +d.ID,
				lat: +d.Latitude,
				lon: +d.Longitude,
			};
		}

d3.csv('data/crimes_2016.csv', rowConverter, function(error, collection) {
	if (error) { 
    	console.log(error);
  	} else {
  		collection.forEach(function(d) {
			d.LatLng = new L.LatLng(d.lat,
									d.lon)
		})
  		crimes = collection;
  		console.log(crimes)

  		if (!--remaining) loadMap(), startAuto("Search States - Start typing here");
  	};
});


function startAuto(placeholder) {
	var mc = autocomplete(document.getElementById('search'))
                .keys(schools.features)
                .dataField("shortName")
                .placeHolder(placeholder)
                .width(960)
                .height(500)
                .onSelected(clicked)
                .render();
}

function loadMap() {
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
		.attr('r', 5)
		.on("mouseover", function(d) {
			// Make school and corresponding route hover-formatted
			d3.select(this)
				.classed('hovered', true);
			d3.selectAll('.route-location')
				.filter(function(e) {return e.schoolID == d.schoolID})
				.classed('hovered', true);

			div.transition()
  				.duration(200)
  				.style('opacity', .9);
  			div.html(d.shortName)
  				.style("left", (d3.event.pageX) + "px")		
            	.style("top", (d3.event.pageY - 28) + "px");
		})
		.on('mouseout', function(d) {
			// Remove hover formatting for school and corresponding route
			d3.select(this).classed('hovered', false);
			d3.selectAll('.route-location')
				.filter(function(e) {return e.schoolID == d.schoolID})
				.classed('hovered', false);
				
			div.transition()
				.duration(500)
				.style('opacity', 0);
		})
		.on('click', clicked)	

	// Option 2: Use school house as icons. TO DO: change colors
	/*var feature_schools = g1.selectAll("myPoint")
		.data(schools.features)
		.enter().append("image")
		.attr('xlink:href', 'data/school_icon.png')
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
		.attr('stroke-width', 3)
		.attr('stroke-opacity', .6)
		.attr('fill', 'none')
		.on("mouseover", function(d) {
			// Make route and corresponding school hover-formatted
			d3.select(this)
				.classed('hovered', true);
			d3.selectAll('.school-location')
				.filter(function(e) {return e.schoolID == d.schoolID})
				.classed('hovered', true);
				
			div.transition()
  				.duration(200)
  				.style('opacity', .9);
  			div.html(d.shortName)
  				.style("left", (d3.event.pageX) + "px")		
            	.style("top", (d3.event.pageY - 28) + "px");
		})
		.on('mouseout', function(d) {
			// Remove hover formatting for route and corresponding school
			d3.select(this).classed('hovered', false);
			d3.selectAll('.school-location')
				.filter(function(e) {return e.schoolID == d.schoolID})
				.classed('hovered', false);

			div.transition()
				.duration(500)
				.style('opacity', 0);
		})
		.on('click', clicked);

	// Ensure that data moves with the map
	map.on("viewreset", reset);
	map.on('zoomstart', function(d) {
		console.log('deleting');
		d3.select("#map").selectAll("image").remove();})
  	map.on('movestart', function(d) {
  		console.log('deleting');
  		d3.select("#map").selectAll("image").remove();})
  	
  	reset();

	function reset() {
		// Get current map bounds
		console.log('map was reset')
		
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

function clicked(d) {
	// Make school dot active
	active_school.classed('active', false);
	active_school = d3.selectAll('.school-location')
		.filter(function(e) {return d.schoolID == e.schoolID})
		.classed('active', true);

	// Make path active
	active_route.classed('active', false);
	active_route = d3.selectAll('.route-location')
		.filter(function(e) {return d.schoolID == e.schoolID})
		.classed('active', true);

	// Update panel by hiding old stuff and adding new stuff
	hidePanel();
	showPanel(active_school.data()[0]);

	// Zoom to selected school on the map
	map.setView(L.latLng(active_school.data()[0].LatLng), 14);
}

function plotCrimes(d) {	
	var map_bounds = map.getBounds();
	console.log(map_bounds);
	
	feature_crimes = g1.selectAll("myPoint")
		.data(crimes.filter(function(d) {
			//return (d.lat == 41.88065818 && d.lon == -87.73121214)
			return (map_bounds._southWest.lat < d.lat) && (d.lat < map_bounds._northEast.lat) 
				&& (map_bounds._southWest.lng < d.lon) && (d.lon < map_bounds._northEast.lng);
		}))
		.enter().append("image")
		.attr('class', 'crime-location')
		.attr('xlink:href', 'data/red_x_icon.png')
		.attr('width', 5)
		.attr('height', 5)
	
	feature_crimes.attr("transform", function(d) { 
		return "translate("+ 
			map.latLngToLayerPoint(d.LatLng).x +","+ 
			map.latLngToLayerPoint(d.LatLng).y +")";
		});
	
	console.log(feature_crimes)
}

function hidePanel() {
	d3.select("#info-panel").selectAll("text, path").remove();
	d3.select('#info-panel').classed('active', false)
}

function showPanel(selection) {
	d3.select('#info-panel').classed('active', true)

	// Exit button
	var exit = g2a.append('image')
		.attr('xlink:href', 'data/exit.png')
		.attr('width', 20)
		.attr('height', 20)
		.attr('transform', 'translate(' + (width-20) + " ," + 5 + ")")
		.on('click', function(d) {
			hidePanel(); 
			active_school.classed('active', false);
			map.setView(L.latLng(41.8256, -87.62), 11);
		})
		.on("mouseover", function(d) {
			d3.select(this).style("cursor", "pointer");
		})

	// Fill in text info about selected school
	var textFields = [[selection.shortName, 'School name: '], 
		[selection.commArea, 'Community Area: '], 
		[selection.safePassage, "Safe Passage School: "],
		[selection.enrollment, 'Student enrollment: '],
		[selection.numCrimes, 'Number of crimes within 1 mile in 2016: ']]
	
	for (var i = 0; i < textFields.length; i++) { 
		g2a.append('text')
			.attr('font-size', 20)
			.attr("transform", "translate(" + margin.left + " ," + (margin.top + 27*i) + ")")
			.text(textFields[i][1] + textFields[i][0])
		}

	// Button to show crime around a school
	/*g2a.append('rect')
			.attr('width', 100)
			.attr('height', 30)
			.attr('x', margin.left)
			.attr('y', 140)
			.attr('fill', '#440154ff')*/

	g2a.append('text')
			.attr("transform", "translate(" + margin.left + " ," + 155 + ")")
			.attr('font-size', 20)
			.attr('fill', 'red')
			.text('View crimes')
		.on('click', plotCrimes)
		.on("mouseover", function(d) {
			d3.select(this)
				.attr('cursor', 'pointer');	
		})
		

	g2a.append('text')
		.attr('font-size', 12)
		.attr("transform", "translate(" + margin.left + " ," + (height - 30) + ")")
		.text('Sources: Chicago Public Schools Safe Passage Routes SY16-17, City of Chicago Crimes 2016, ')
	
	g2a.append('text')
		.attr('font-size', 12)
		.attr("transform", "translate(" + margin.left + " ," + (height - 15) + ")")
		.text('Chicago Public Schools Progress Reports and Attendance Rates ')
	
	// Legend for two charts
	g2a.append('line')
		.attr('class', 'grayline')
		.attr('transform', "translate(" + (margin.left + 60) + "," + (height * 1/3 + 25) + ")")
		.attr('x1', 60)
		.attr('x2', 100)
		.attr('stroke-width', 2.5)

	g2a.append('text')
		.attr('font-size', 14)
		.attr('transform', "translate(" + (width/2 + 50) + "," + (height * 1/3 + 30) + ")")
		.attr('text-anchor', 'middle')
		.text(' = Other schools in Community Area')
	

	attendanceChart(selection);
	safetyChart(selection);
}

function attendanceChart(selection) {
	var attendance = selection.attendance
	var x = d3.scaleLinear()
		.rangeRound([chart_margin.left, chart_margin.left + chart_width]);
	var y = d3.scaleLinear()
		.rangeRound([(height-chart_margin.bottom) , (height-chart_margin.bottom-chart_height)]);
	var line = d3.line()
		.x(function(d) { return x(d.year); })
		.y(function(d) { return y(d.att); });
	x.domain(d3.extent(attendance, function(d) { return d.year; }));
	y.domain([0, 100]);

	//Set axes
	g2a.append('g')
		.attr('class', 'axis axis--x')
		.attr('transform', 'translate(' + 0 + ',' + (height-chart_margin.bottom) + ')')
		.call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

	g2a.append('g')
		.attr('class', 'axis axis--y')
		.attr('transform', 'translate(' + chart_margin.left + ',' + 0 + ')')
		.call(d3.axisLeft(y).ticks(10));
	 
	
	//Label axes
	g2a.append('text')
		.attr('transform', 'translate(' + (chart_width/2 + chart_margin.left) + ',' + (height - chart_margin.bottom/1.7) + ')')
		.attr('text-anchor', 'middle')
		.text('Year')
		.style('font-size', 14)
	
	g2a.append('text')
		.attr('transform', "translate(" + 20 + "," + (height * 0.63) + ")" + "rotate(-90)")
		.attr('text-anchor', 'middle')
		.text('Attendance Rate (%)')
		.style('font-size', 14)

	// Label chart
	g2a.append('text')
		.attr('transform', "translate(" + (chart_width/2 + chart_margin.left) + "," + (height * 1/3) + ")")
		.attr('text-anchor', 'middle')
		.text('Historical Attendace Rate')
		.style('font-size', 18)

	// Draw lines
	g2a.selectAll('path')
      	.data(schools.features.filter(function (d) {
      		return d.commArea == selection.commArea;
      	}))
      	.enter().append('path')
      	.attr('d', function(d) { return line(d.attendance); })
      	.attr('fill', 'none')
      	.attr('class', 'grayline');

    g2a.append('path')
    	.attr('class', 'specialline')
      	.datum(attendance)
      	.attr("fill", "none")
      	.attr("d", line);

}

function safetyChart(selection) {
	var safety = selection.safety
	var x = d3.scaleOrdinal()
		.range([chart_margin.left, chart_margin.left + chart_width]);
	var y = d3.scaleLinear()
		.range([(height-chart_margin.bottom) , (height-chart_margin.bottom-chart_height)]);
	var line = d3.line()
		.x(function(d) { return x(d.year); })
		.y(function(d) { return y(d.safety); });
	x.domain(d3.extent(safety, function(d) { return d.year; }));
	y.domain([0,5]);

	//Set axes
	g2b.append('g')
		.attr('class', 'axis axis--x')
		.attr('transform', 'translate(' + 0 + ',' + (height-chart_margin.bottom) + ')')
		.call(d3.axisBottom(x).ticks(1));

	g2b.append('g')
		.attr('class', 'axis axis--y')
		.attr('transform', 'translate(' + chart_margin.left + ',' + 0 + ')')
		.call(d3.axisLeft(y).ticks(5));
	
	//Label axes
	g2b.append('text')
		.attr('transform', 'translate(' + (chart_width/2 + chart_margin.left) + ',' + (height - chart_margin.bottom/1.7) + ')')
		.attr('text-anchor', 'middle')
		.text('Year')
		.style('font-size', 14)
	
	g2b.append('text')
		.attr('transform', "translate(" + 25 + "," + (height * 0.63) + ")" + "rotate(-90)")
		.attr('text-anchor', 'middle')
		.text('School Survey Safety Rating')
		.style('font-size', 14)
	
	// Label chart
	g2a.append('text')
		.attr('transform', "translate(" + (chart_width*1.5 + chart_margin.left*2) + "," + (height * 1/3) + ")")
		.attr('text-anchor', 'middle')
		.text('Change in Safety Rating')
		.style('font-size', 18)

	// Draw lines
	g2b.selectAll('path')
      	.data(schools.features.filter(function (d) {
      		return d.commArea == selection.commArea;
      	}))
      	.enter().append('path')
      	.attr('d', function(d) { return line(d.safety); })
      	.attr('fill', 'none')
      	.attr('class', 'grayline');

    g2b.append('path')
    	.attr('class', 'specialline')
      	.datum(safety)
      	.attr("fill", "none")
      	.attr("d", line);
}
