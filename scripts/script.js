var active_school = d3.select(null);
var active_route = d3.select(null);

// Define tooltips
var div = d3.select('body').append('div')
	.attr('class', 'tooltip')
	.style('opacity', 0);

var div_q = d3.select('body').append('div')
	.attr('class', 'tooltip')
	.style('opacity', 0);

// Set spacing for info panel
var margin = {top: 20, right: 20, bottom: 10, left: 10}
var width = 400 - margin.left - margin.right;
var height = 700 - margin.top - margin.bottom;

// Set spacing for charts in info panel
var chart_margin = {left: 50, right:10, top: 10, bottom:50}
var chart_width = width - chart_margin.left - chart_margin.right
var chart_height = height*0.33 - chart_margin.bottom - chart_margin.top

// Create map object from Leaflet
var map = new L.Map("map", {center: [41.8256, -87.65], zoom: 11})
    .addLayer(new L.TileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	subdomains: 'abcd',
	minZoom: 10,
	maxZoom: 20,
	ext: 'png'
	}));

// Add a map legend
var legend = L.control();

legend.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'legend'); 
    this._div.innerHTML = '<img src=data/school_icon_full.png align = left width = 18 height = 18 hspace = 10>' +
    '<h4> School Location </h4>' + 
    '<img src=data/sp_route.png align = left width = 18 height = 15 hspace = 10>' +  
    '<h4> Safe Passage Route </h4>' + 
    '<img src=data/crime.png align = left width = 18 height = 18 hspace = 10>' +  
    '<span> 2016 Gun Crime </span>' +
    '<img src=data/question.png id="question">' + 
    '<table><tr><td></td><td></td><td><h4><b> View Crimes </b></h4></td>' + 
    '<td><label class="switch" onclick="plotCrimes()"> <input type="checkbox" id="crimeSwitch"> <span class="slider round"></span></label></td></tr></table>';
    return this._div;
};

legend.addTo(map);

// Info box above definition of crime
d3.select('#question')
	.on("mouseover", function(d) {
			div_q.transition()
  				.duration(100)
  				.style('opacity', .9)
  			div_q.html('Reported incident of crime <br> in 2016, where description <br> contains "handgun" or "firearm"')
  				.style("left", (d3.event.pageX) + "px")		
            	.style("top", (d3.event.pageY - 28) + "px")
            	.style('height', '80px')
            	.style('font-weight', 'normal')
		})
	.on('mouseout', function(d) {
			div_q.transition()
				.duration(100)
				.style('opacity', 0);
		});


// Map and contents are svg1
var svg1 = d3.select(map.getPanes().overlayPane).append("svg");
var g1 = svg1.append("g").attr("class", "leaflet-zoom-hide");

// Info panel is svg2
var svg2 = d3.select('#info-panel')
	.append('svg')
	.attr('width', width + margin.left + margin.right)
	.attr('height', height + margin.top + margin.bottom)

var g2a = svg2.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var g2b = svg2.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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
			d.schoolProfile = d.properties.schoolProfile
		});
		schools = collection;
		console.log(schools)
		
  		if (!--remaining) loadMap(), hidePanel(), startAuto("Search States - Start typing here");
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
  		if (!--remaining) loadMap(), hidePanel(), startAuto("Search States - Start typing here");
  	};
});

function rowConverter(d) {
			return { 
				id: +d.ID,
				lat: +d.Latitude,
				lon: +d.Longitude,
			};
		}

d3.csv('data/gun_crimes_2016.csv', rowConverter, function(error, collection) {
	if (error) { 
    	console.log(error);
  	} else {
  		collection.forEach(function(d) {
			d.LatLng = new L.LatLng(d.lat,
									d.lon)
		})
  		crimes = collection;
  		console.log(crimes)

  		if (!--remaining) loadMap(), hidePanel(), startAuto("Search Schools - Start typing here");
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
		
	// Plot schools
	var feature_schools = g1.selectAll("image")
		.data(schools.features)
		.enter().append("image")
		.attr('class', 'school-location')
		.attr('xlink:href', 'data/school_icon_full.png')
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
            	.style("top", (d3.event.pageY - 40) + "px");
		})
		.on('mouseout', function(d) {
			// Remove hover formatting for school and corresponding route
			d3.select(this)
				.classed('hovered', false);
			d3.selectAll('.route-location')
				.filter(function(e) {return e.schoolID == d.schoolID})
				.classed('hovered', false);
			div.transition()
				.duration(500)
				.style('opacity', 0);
		})
		.on('click', clicked)

	var feature_routes = g1.selectAll("path")
		.data(routes.features)
		.enter().append("path")
		.attr('class', 'route-location')
		.on("mouseover", function(d) {
			// Make route and corresponding school hover-formatted
			d3.select(this)
				.classed('hovered', true);
			d3.selectAll('.school-location')
				.filter(function(e) {return e.schoolID == d.schoolID})
				.classed('hovered', true);
				
			div.transition()
  				.duration(100)
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
				.duration(100)
				.style('opacity', 0);
		})
		.on('click', clicked);

	// Ensure that data moves with the map
	map.on("viewreset", reset);  	
	map.on('zoomstart', function(d) {
		document.getElementById("crimeSwitch").checked = false;
		d3.select("#map").selectAll("circle").remove();})
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
	active_school.classed('active', false)
		.style('opacity', 0.5);
	active_school = d3.selectAll('.school-location')
		.filter(function(e) {return d.schoolID == e.schoolID})
		.classed('active', true)
		.style('opacity', 1);

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

function plotCrimes() {	
	if (document.getElementById("crimeSwitch").checked == true) {
		var feature_crimes = g1.selectAll("circle")
			.data(crimes)
			.enter().append("circle")
			.attr('class', 'crime-location')
			.attr('fill', '#F54D42')
			.attr('fill-opacity', .6)
			.attr('r', 4)

		// Plot crimes, with random vertical and horizontal jitter between -5 and 5 pixels
		feature_crimes.attr("transform", function(d) { 
			return "translate("+ 
				(map.latLngToLayerPoint(d.LatLng).x + Math.random()*10 - 5)+","+ 
				(map.latLngToLayerPoint(d.LatLng).y + Math.random()*10 - 5) +")";
		});
	} else {
		d3.select("#map").selectAll("circle").remove();
	}
}

function hidePanel() {
	d3.select("#info-panel").selectAll("text, path, image, line, axis axis-left, axis axis-right").remove();
	
	g2a.append('text')
			.attr('class', 'placeholderText')
			.attr('transform', 'translate(' + (margin.left) + " ," + (height / 2 ) + ")")
			.text('Begin by selecting a school on the map') 
	
	g2a.append('text')
			.attr('class', 'placeholderText')
			.attr('transform', 'translate(' + (margin.left + 100) + " ," + (height / 2 + 24) + ")")
			.text('or searching above')
}

function showPanel(selection) {
	// Remove placeholder
	d3.select("#info-panel").selectAll("text").remove();

	// Exit button
	var exit = g2a.append('image')
		.attr('xlink:href', 'data/exit.png')
		.attr('width', 20)
		.attr('height', 20)
		.attr('transform', 'translate(' + (width - margin.right - margin.left - 10) + " ," + 3 + ")")
		.on('click', function(d) {
			hidePanel(); 
			active_school.classed('active', false);
			map.setView(L.latLng(41.8256, -87.62), 11);
		})
		.on("mouseover", function(d) {
			d3.select(this).style("cursor", "pointer");
		})

	// Fill in text info about selected school
	var textFields = [[selection.commArea, 'Community Area: '], 
		[selection.safePassage, "Safe Passage School: "],
		[selection.enrollment, 'Student Enrollment: ']]
	
	for (var i = 0; i < textFields.length; i++) { 
		g2a.append('text')
			.attr('font-size', 18)
			.attr("transform", "translate(" + margin.left + " ," + (margin.top + 25*(i+2) + 10) + ")")
			.text(textFields[i][1] + textFields[i][0])
		}

	g2a.append('text')
		.attr('font-size', 18)
		.style('fill', "#57b2a0")
		.attr("transform", "translate(" + margin.left + " ," + (margin.top + 25*5 + 10) + ")")
		.html("<a href=" + selection.schoolProfile + " target='_blank'>Link to school profile </a>")

	// Break out long name into two lines if necessary
	if (selection.longName.length < 30) {
		var nameSpliced = [selection.longName]
	} else {
		var first_substring = selection.longName.substring(0,30)
		var splice_index = first_substring.lastIndexOf(' ')
		var nameSpliced = [selection.longName.substring(0,splice_index), selection.longName.substring(splice_index + 1,)]
	}

	for (var i = 0; i < nameSpliced.length; i++) { 
		g2a.append('text')
			.attr('font-size', 20)
			.attr('font-weight', 'bold')
			.style('fill', '#406f65')
			.attr("transform", "translate(" + margin.left + " ," + (margin.top + 30*(i)) + ")")
			.text(nameSpliced[i])
	}
	
	// Legend for two charts
	g2a.append('line')
		.attr('class', 'grayline')
		.attr('transform', "translate(" + (margin.left + 15) + "," + (height - margin.bottom - 5) + ")")
		.attr('x1', 60)
		.attr('x2', 100)
		.attr('stroke-width', 2.5)

	g2a.append('text')
		.attr('font-size', 12)
		.attr('transform', "translate(" + (width/2 + 50) + "," + (height - margin.bottom) + ")")
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
		.rangeRound([(height-chart_margin.bottom - 260) , (height-chart_margin.bottom-chart_height - 260)]);
	var line = d3.line()
		.x(function(d) { return x(d.year); })
		.y(function(d) { return y(d.att); });
	x.domain(d3.extent(attendance, function(d) { return d.year; }));
	y.domain([0, 100]);

	//Set axes
	g2a.append('g')
		.attr('class', 'axis axis--x')
		.attr('transform', 'translate(' + 0 + ',' + (chart_height*2 + margin.top + chart_margin.top + 8) + ')')
		.call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

	g2a.append('g')
		.attr('class', 'axis axis--y')
		.attr('transform', 'translate(' + chart_margin.left + ',' + 0 + ')')
		.call(d3.axisLeft(y).ticks(10));
	 
	//Label axes
	g2a.append('text')
		.attr('transform', 'translate(' + (chart_width/2 + chart_margin.left) + ',' + (chart_height*2 + margin.top + chart_margin.top + 38) + ')')
		.attr('text-anchor', 'middle')
		.text('Year')
		.style('font-size', 14)
	
	g2a.append('text')
		.attr('transform', "translate(" + 15 + "," + (height * 0.4) + ")" + "rotate(-90)")
		.attr('text-anchor', 'middle')
		.text('Attendance Rate (%)')
		.style('font-size', 14)

	// Label chart
	g2a.append('text')
		.attr('transform', "translate(" + (chart_width/2 + chart_margin.left) + "," + (height * .28) + ")")
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
      	.attr('class', 'grayline')
      	.on("mouseover", function(d) {
			// Make school and corresponding route hover-formatted
			d3.select(this)
				.classed('hovered', true);
			div.transition()
  				.duration(200)
  				.style('opacity', .9);
  			div.html(d.shortName)
  				.style("left", (d3.event.pageX) + "px")		
            	.style("top", (d3.event.pageY - 40) + "px");
		})
		.on('mouseout', function(d) {
			// Remove hover formatting for school and corresponding route
			d3.select(this)
				.classed('hovered', false);
			div.transition()
				.duration(500)
				.style('opacity', 0);
		})
		.on('click', clicked);

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
		.range([(height-chart_margin.bottom-margin.bottom) , (height-chart_margin.bottom-chart_height-margin.bottom)]);
	var line = d3.line()
		.x(function(d) { return x(d.year); })
		.y(function(d) { return y(d.safety); });
	x.domain(d3.extent(safety, function(d) { return d.year; }));
	y.domain([0,5]);

	//Set axes
	g2b.append('g')
		.attr('class', 'axis axis--x')
		.attr('transform', 'translate(' + 0 + ',' + (height - chart_margin.bottom - margin.bottom) + ')')
		.call(d3.axisBottom(x).ticks(1));

	g2b.append('g')
		.attr('class', 'axis axis--y')
		.attr('transform', 'translate(' + chart_margin.left + ',' + (0) + ')')
		.call(d3.axisLeft(y).ticks(5));
	
	//Label axes
	g2b.append('text')
		.attr('transform', 'translate(' + (chart_width/2 + chart_margin.left) + ',' + (height - chart_margin.bottom/1.5) + ')')
		.attr('text-anchor', 'middle')
		.text('Year')
		.style('font-size', 14)
	
	g2b.append('text')
		.attr('transform', "translate(" + 15 + "," + (height * 0.8) + ")" + "rotate(-90)")
		.attr('text-anchor', 'middle')
		.text('Safety Rating')
		.style('font-size', 14)
	g2b.append('text')
		.attr('transform', "translate(" + 30 + "," + (height * 0.8) + ")" + "rotate(-90)")
		.attr('text-anchor', 'middle')
		.text('(0 = weak, 5 = strong)')
		.style('font-size', 14)
	
	
	// Label chart
	g2a.append('text')
		.attr('transform', "translate(" + (chart_width/2 + chart_margin.left) + "," + (height - margin.bottom - chart_height - chart_margin.bottom - chart_margin.top - 15) + ")")
		.attr('text-anchor', 'middle')
		.text('School Safety Rating')
		.style('font-size', 18)
	g2a.append('text')
		.attr('transform', "translate(" + (chart_width/2 + chart_margin.left) + "," + (height - margin.bottom - chart_height - chart_margin.bottom - chart_margin.top) + ")")
		.attr('text-anchor', 'middle')
		.text('(based on student survey)')
		.style('font-size', 12)

	// Draw lines
	g2b.selectAll('path')
      	.data(schools.features.filter(function (d) {
      		return d.commArea == selection.commArea;
      	}))
      	.enter().append('path')
      	.attr('d', function(d) { return line(d.safety); })
      	.attr('fill', 'none')
      	.attr('class', 'grayline')
      	.on("mouseover", function(d) {
			// Make school and corresponding route hover-formatted
			d3.select(this)
				.classed('hovered', true);
			div.transition()
  				.duration(200)
  				.style('opacity', .9);
  			div.html(d.shortName)
  				.style("left", (d3.event.pageX) + "px")		
            	.style("top", (d3.event.pageY - 40) + "px");
		})
		.on('mouseout', function(d) {
			// Remove hover formatting for school and corresponding route
			d3.select(this)
				.classed('hovered', false);
			div.transition()
				.duration(500)
				.style('opacity', 0);
		})
		.on('click', clicked);;

    g2b.append('path')
    	.attr('class', 'specialline')
      	.datum(safety)
      	.attr("fill", "none")
      	.attr("d", line);
}
