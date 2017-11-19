var map = new L.Map("map", {center: [41.8256, -87.6846], zoom: 11})
    .addLayer(new L.TileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
  attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abcd',
  minZoom: 0,
  maxZoom: 20,
  ext: 'png'
  }));

var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");


d3.json("data/Chicago Public Schools - School Locations SY1617.geojson", function(error, schools) {
  
  schools.forEach(function(d) {
    d.LatLng = new L.LatLng(d.geometry['coordinates'][0], d.geometry['coordinates'][1])
  });

  if (error) { 
      console.log(error);
    } else {
      console.log(schools) 
      loadMap(schools);
    };
});

function loadMap(schools) {

  // Projection function with Leaflet
  var transform = d3.geoTransform({point: projectPoint}),
      path = d3.geoPath().projection(transform);

  var feature = g.selectAll("path")
    .data(schools)
    .enter().append("path");

  map.on("viewreset", reset);
    reset();
  
  function reset() {
  // compute bounding box
  
    var bounds = path.bounds(schools),
        topLeft = bounds[0],
        bottomRight = bounds[1];
    console.log(bounds)
    /*svg.attr("width", bottomRight[0] - topLeft[0])
      .attr("height", bottomRight[1] - topLeft[1])
      .style("left", topLeft[0] + "px")
      .style("top", topLeft[1] + "px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
  */
    feature.attr("d", path);
    }

    function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  };
};