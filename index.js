var fs = require("fs");
var wotRenderer = require("./lib.js");

var world_data = JSON.parse(fs.readFileSync("./sample-data.json").toString("utf8"));

function percentToFrac(x) {
	return x / 100;
}

var setings = {
	tiles: world_data,
	coordX: 0,
	coordY: 0,
	zoom: percentToFrac(100),
	width: 800,
	height: 600,
	font: "Courier New",
	fontSize: 16,
	ownerColor: "#ddd",
	memberColor: "#eee",
	publicColor: "#fff",
	textColor: "#000",
	worldWritability: 0, // 0 = public, 1 = member, 2 = owner
	glyphDrawingMode: false // a more 'true' rendering mode, but cuts off characters at the bottom
};

console.log("Rendering...");

var { canvas, ctx } = wotRenderer.render(setings);

var streamOut = fs.createWriteStream("./output.png");
var stream = canvas.createPNGStream();
stream.pipe(streamOut);
streamOut.on("finish", function() {
	console.log("Saved image");
	streamOut.end();
});