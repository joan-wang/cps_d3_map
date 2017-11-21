// Autocomplete options
var keys = [];

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

// Map and contents are svg1
var svg1 = d3.select(map.getPanes().overlayPane).append("svg");
var g1 = svg1.append("g").attr("class", "leaflet-zoom-hide");

// Info panel info is svg2
var svg2 = d3.select('#info-panel')
	.append('svg')
	.attr("preserveAspectRatio", "xMinYMin meet")
  	.attr("viewBox", "0 0 550 700")

var g2a = svg2.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var g2b = svg2.append("g")
	.attr("transform", "translate(" + (margin.left + 0.5*width) + "," + margin.top + ")");



// Load multiple data files in parallel
var schools, passage, remaining = 2;

d3.json("data/locations_updated.geojson", function(error, collection) {
	if (error) {
	console.log(error);
	} else {
		// Create LatLng property
		collection.features.forEach(function(d) {
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
		dummy_school = schools.features[4]; 
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
		.attr('r', 5)
		.on("mouseover", function(d) {
			console.log(d.shortName);
			d3.select(this).style("cursor", "pointer");
			div.transition()
  				.duration(200)
  				.style('opacity', .9);
  			div.html(d.shortName)
  				.style("left", (d3.event.pageX) + "px")		
            	.style("top", (d3.event.pageY - 28) + "px");
		})
		.on('mouseout', function(d) {
			div.transition()
				.duration(500)
				.style('opacity', 0);
		})
		.on('click', function(d) {
			console.log('clicked ' + d.shortName)
		});

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
	console.log(selection.attendance)
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
  	school_att = g2a.selectAll('.school_att')
      	.data(schools.features.filter(function (d) {
      		return d.commArea == selection.commArea;
      	}))
      	.enter().append('g')
      		.attr('class', 'school_att')
    
    school_att.append('path')
      	.attr("fill", "none")
      	.attr('class', 'grayline')
      	.attr('d', function(d) { console.log(d.attendance); return line(d.attendance); });

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
	console.log(selection.safety)
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
    school_att = g2b.selectAll('.school_safety')
      	.data(schools.features.filter(function (d) {
      		return d.commArea == selection.commArea;
      	}))
      	.enter().append('g')
      		.attr('class', 'school_safety')

    school_att.append('path')
      	.attr("fill", "none")
      	.attr('class', 'grayline')
      	.attr('d', function(d) { console.log(d.safety); return line(d.safety); });

    g2b.append('path')
    	.attr('class', 'specialline')
      	.datum(safety)
      	.attr("fill", "none")
      	.attr("d", line);
}




