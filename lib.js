/*
	Headless World of Text Renderer
*/

var node_canvas = require("canvas");
var fs = require("fs");
var path = require("path");
var createCanvas = node_canvas.createCanvas;
var registerFont = node_canvas.registerFont;

registerFont(path.resolve("./LegacyComputing.ttf"), {
	family: "LegacyComputing"
});

var offset_coordX = 0;
var offset_coordY = 0;

var tileC = 16;
var tileR = 8;
var tileArea = tileC * tileR;
var textDecorationOffset = 0x20F0;

var opt = {
	worldWritability: 0,
	font: "Courier New",
	zoom: 1,
	fontSize: 16,
	coordLinkColor: "#008000",
	URLLinkColor: "#0000FF"
};

var offsetX = 0;
var offsetY = 0;

var cellW = 10;
var cellH = 18;

var b1, b2, tileX1, tileY1, tileX2, tileY2;

function applySettings() {
	cellW = 10 * opt.zoom;
	cellH = 18 * opt.zoom;
	opt.fontSize *= opt.zoom;
	offsetX = -(160 * opt.zoom * offset_coordX * 4);
	offsetY = -(144 * opt.zoom * -offset_coordY * 4);
	
	b1 = getTileAt(0, 0);
	b2 = getTileAt(canvasWidth - 1, canvasHeight - 1);
	tileX1 = b1[0];
	tileY1 = b1[1];
	tileX2 = b2[0];
	tileY2 = b2[1];
}

var styles = {
	owner: "#ddd",
	member: "#eee",
	public: "#fff",
	text: "#000"
};

var canvasWidth = 0;
var canvasHeight = 0;

var canvas = null;
var ctx = null;

function getTileAt(x, y) {
	x -= offsetX;
	y -= offsetY;
	x -= (canvasWidth/2);
	y -= (canvasHeight/2);
	x /= opt.zoom;
	y /= opt.zoom;
	return [Math.floor(x / 160), Math.floor(y / 144)];
}

function getCharTextDecorations(char) {
	var code = char.charCodeAt(char.length - 1);
	code -= textDecorationOffset;
	if(code <= 0 || code > 16) return null;
	return {
		bold: code >> 3 & 1,
		italic: code >> 2 & 1,
		under: code >> 1 & 1,
		strike: code & 1
	};
}

// trim off all text decoration modifiers at the end
function clearCharTextDecorations(char) {
	var len = char.length;
	var decoCount = 0;
	for(var i = 0; i < len; i++) {
		var pos = len - 1 - i;
		var code = char.charCodeAt(pos);
		if(code >= textDecorationOffset + 1 && code <= textDecorationOffset + 16) {
			decoCount++;
		} else {
			break;
		}
	}
	if(decoCount > 0) {
		return char.slice(0, len - decoCount);
	}
	return char;
}

function isTileInRange(x, y) {
	return tileX1 <= x && x <= tileX2 && tileY1 <= y && y <= tileY2;
}


function decodeCharProt(str) {
	const base64table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var res = new Array(tileArea).fill(0);
	var encoding = str.charAt(0);
	str = str.substr(1);
	if(encoding == "@") {
		for(var i = 0; i < str.length; i++) {
			var code = base64table.indexOf(str.charAt(i));
			var char1 = Math.trunc(code / (4*4) % 4);
			var char2 = Math.trunc(code / (4) % 4);
			var char3 = Math.trunc(code / (1) % 4);
			res[i*3 + 0] = char1;
			if(i*3 + 1 > tileArea - 1) break;
			res[i*3 + 1] = char2;
			if(i*3 + 2 > tileArea - 1) break;
			res[i*3 + 2] = char3;
		}
	} else if(encoding == "#") {
		var temp = str.split(",");
		for(var i = 0; i < temp.length; i++) {
			res[i] = parseInt(temp[i], 10);
		}
	} else if(encoding == "x") {
		for(var i = 0; i < str.length / 2; i++) {
			var code = parseInt(str.charAt(i * 2) + str.charAt(i * 2 + 1), 16);
			res[i] = code;
		}
	}
	// convert from base64-format to writability-format
	for(var c = 0; c < res.length; c++) {
		switch(res[c]) {
			case 0: res[c] = null; continue;
			case 1: res[c] = 0; continue;
			case 2: res[c] = 1; continue;
			case 3: res[c] = 2; continue;
		}
	}
	return res;
}


function splitContent(content) {
	const comb = [[0x0300, 0x036F], [0x1DC0, 0x1DFF], [0x20D0, 0x20FF], [0xFE20, 0xFE2F]];
	return [...content].reduce(function(prev, next) {
		var ar = prev;
		if(typeof ar != "object") ar = [ar];
		var code = next.charCodeAt();
		if(comb.findIndex(range => range[0] <= code && range[1] >= code) != -1) {
			ar[ar.length - 1] += next;
		} else {
			ar.push(next);
		}
		return ar;
	});
}





var lcsShardCharVectors = [
	[[0,3],[1,4],[0,4],[0,3]],
	[[0,3],[2,4],[0,4],[0,3]],
	[[0,1],[1,4],[0,4],[0,1]],
	[[0,1],[2,4],[0,4],[0,1]],
	[[0,0],[1,4],[0,4],[0,0]],
	[[1,0],[2,0],[2,4],[0,4],[0,1],[1,0]],
	[[2,0],[2,4],[0,4],[0,1],[2,0]],
	[[1,0],[2,0],[2,4],[0,4],[0,3],[1,0]],
	[[2,0],[2,4],[0,4],[0,3],[2,0]],
	[[1,0],[2,0],[2,4],[0,4],[1,0]],
	[[2,1],[2,4],[0,4],[0,3],[2,1]],
	[[2,3],[2,4],[1,4],[2,3]],
	[[2,3],[2,4],[0,4],[2,3]],
	[[2,1],[2,4],[1,4],[2,1]],
	[[2,1],[2,4],[0,4],[2,1]],
	[[2,0],[2,4],[1,4],[2,0]],
	[[0,0],[1,0],[2,1],[2,4],[0,4],[0,0]],
	[[0,0],[2,1],[2,4],[0,4],[0,0]],
	[[0,0],[1,0],[2,3],[2,4],[0,4],[0,0]],
	[[0,0],[2,3],[2,4],[0,4],[0,0]],
	[[0,0],[1,0],[2,4],[0,4],[0,0]],
	[[0,1],[2,3],[2,4],[0,4],[0,1]],
	[[0,0],[2,0],[2,4],[1,4],[0,3],[0,0]],
	[[0,0],[2,0],[2,4],[0,3],[0,0]],
	[[0,0],[2,0],[2,4],[1,4],[0,1],[0,0]],
	[[0,0],[2,0],[2,4],[0,1],[0,0]],
	[[0,0],[2,0],[2,4],[1,4],[0,0]],
	[[0,0],[1,0],[0,1],[0,0]],
	[[0,0],[2,0],[0,1],[0,0]],
	[[0,0],[1,0],[0,3],[0,0]],
	[[0,0],[2,0],[0,3],[0,0]],
	[[0,0],[1,0],[0,4],[0,0]],
	[[0,0],[2,0],[2,1],[0,3],[0,0]],
	[[0,0],[2,0],[2,3],[1,4],[0,4],[0,0]],
	[[0,0],[2,0],[2,3],[0,4],[0,0]],
	[[0,0],[2,0],[2,1],[1,4],[0,4],[0,0]],
	[[0,0],[2,0],[2,1],[0,4],[0,0]],
	[[0,0],[2,0],[1,4],[0,4],[0,0]],
	[[1,0],[2,0],[2,1],[1,0]],
	[[0,0],[2,0],[2,1],[0,0]],
	[[1,0],[2,0],[2,3],[1,0]],
	[[0,0],[2,0],[2,3],[0,0]],
	[[1,0],[2,0],[2,4],[1,0]],
	[[0,0],[2,0],[2,3],[0,1],[0,0]],
	[[0,0],[2,0],[2,4],[0,4],[1,2],[0,0]],
	[[0,0],[1,2],[2,0],[2,4],[0,4],[0,0]],
	[[0,0],[2,0],[1,2],[2,4],[0,4],[0,0]],
	[[0,0],[2,0],[2,4],[1,2],[0,4],[0,0]],
	[[0,0],[1,2],[0,4],[0,0]],
	[[0,0],[2,0],[1,2],[0,0]],
	[[2,0],[2,4],[1,2],[2,0]],
	[[1,2],[2,4],[0,4],[1,2]],
	// skip (lcs)
	[[0,0],[2,4],[0,4],[2,0],[0,0]],
	[[2,0],[2,4],[0,0],[0,4],[2,0]],
	// box-drawing bold mode; four 90-deg, four iso
	[[2,0],[2,4],[0,4],[2,0]], // 54
	[[0,0],[2,4],[0,4],[0,0]],
	[[0,0],[2,0],[0,4],[0,0]],
	[[0,0],[2,0],[2,4],[0,0]],
	[[1,0],[2,4],[0,4],[1,0]], // 58
	[[0,0],[2,2],[0,4],[0,0]],
	[[0,0],[2,0],[1,4],[0,0]],
	[[2,0],[2,4],[0,2],[2,0]] 
];

// 2x4 octant character lookup (relative char code -> bit pattern)
// range: 0x1CD00 - 0x1CDE5
var lcsOctantCharPoints = [
	4, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
	32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
	55, 56, 57, 58, 59, 60, 61, 62, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,
	79, 81, 82, 83, 84, 86, 87, 88, 89, 91, 92, 93, 94, 96, 97, 98, 99, 100, 101, 102, 103,
	104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121,
	122, 123, 124, 125, 126, 127, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
	141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158,
	159, 161, 162, 163, 164, 166, 167, 168, 169, 171, 172, 173, 174, 176, 177, 178, 179, 180,
	181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 193, 194, 195, 196, 197, 198, 199,
	200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217,
	218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235,
	236, 237, 238, 239, 241, 242, 243, 244, 246, 247, 248, 249, 251, 253, 254
];

var fracBlockTransforms = [
	// relative offset: 0x2580 (until 0x2590)
	[[2, 4/8],
	[3, 1/8],
	[3, 2/8],
	[3, 3/8],
	[3, 4/8],
	[3, 5/8],
	[3, 6/8],
	[3, 7/8],
	[0, 8/8],
	[0, 7/8],
	[0, 6/8],
	[0, 5/8],
	[0, 4/8],
	[0, 3/8],
	[0, 2/8],
	[0, 1/8],
	[1, 4/8]],

	// relative offset: 0x2594 (until 0x2595)
	[[2, 1/8],
	[1, 1/8]],
	
	// relative offset: 0x1FB82 (until 0x1FB8B)
	[[2, 2/8],
	[2, 3/8],
	[2, 5/8],
	[2, 6/8],
	[2, 7/8],
	[1, 2/8],
	[1, 3/8],
	[1, 5/8],
	[1, 6/8],
	[1, 7/8]]
];

function isValidSpecialSymbol(charCode) {
	if(charCode >= 0x2580 && charCode <= 0x2590) return true;
	if(charCode >= 0x2591 && charCode <= 0x2593) return true;
	if(charCode >= 0x2594 && charCode <= 0x259F) return true;
	if(charCode >= 0x25E2 && charCode <= 0x25E5) return true;
	if(charCode >= 0x1CD00 && charCode <= 0x1CDE5) return true;
	if(charCode >= 0x1FB00 && charCode <= 0x1FB3B) return true;
	if(charCode >= 0x1FB3C && charCode <= 0x1FB6F) return true;
	if(charCode >= 0x1FB82 && charCode <= 0x1FB8B) return true;

	switch(charCode) {
		case 0x25B2: return true;
		case 0x25BA: return true;
		case 0x25BC: return true;
		case 0x25C4: return true;
		case 0x1CEA0: return true;
		case 0x1CEA3: return true;
		case 0x1CEA8: return true;
		case 0x1CEAB: return true;
		case 0x1FB9A: return true;
		case 0x1FB9B: return true;
		case 0x1FBE6: return true;
		case 0x1FBE7: return true;
	}

	return false;
}

function drawShadeChar(charCode, textRender, x, y, clampW, clampH, flags) {
	let isLight = charCode == 0x2591;
	let factor = isLight ? 3 : 5;
	textRender.beginPath();
	for(let i = 0; i < factor; i++) {
		for(let j = 0; j < 10; j++) {
			textRender.rect(
				x + (i * clampW / factor) + (!(j%2)) * (clampW / (factor * 2)),
				y + j * clampH/ 10,
				clampW / 10,
				clampH / 20);
		}
	}
	if(charCode == 0x2593) {
		for(let j = 0; j < 10; j++) {
			textRender.rect(x, y + clampH / 20 + j * clampH / 10,
				clampW, clampH / 20);
		}
	}
	textRender.fill();
}

function draw2by2Char(charCode, textRender, x, y, width, height) {
	// relative offset: 0x2596 - 0x259F
	var pattern = [2, 1, 8, 11, 9, 14, 13, 4, 6, 7][charCode - 0x2596];
	textRender.beginPath();
	if(pattern & 8) textRender.rect(x, y, width / 2, height / 2);
	if(pattern & 4) textRender.rect(x + width / 2, y, width / 2, height / 2);
	if(pattern & 2) textRender.rect(x, y + height / 2, width / 2, height / 2);
	if(pattern & 1) textRender.rect(x + width / 2, y + height / 2, width / 2, height / 2);
	textRender.fill();
}

function draw2by3Char(charCode, textRender, x, y, width, height) {
	var code = 0;
	if(charCode >= 0x1FB00 && charCode <= 0x1FB13) code = charCode - 0x1FB00 + 1;
	if(charCode >= 0x1FB14 && charCode <= 0x1FB27) code = charCode - 0x1FB00 + 2;
	if(charCode >= 0x1FB28 && charCode <= 0x1FB3B) code = charCode - 0x1FB00 + 3;
	textRender.beginPath();
	for(var i = 0; i < 6; i++) {
		if(!(code >> i & 1)) continue;
		textRender.rect(x + (width / 2) * (i & 1), y + (height / 3) * (i >> 1), width / 2, height / 3);
	}
	textRender.fill();
}

function drawTriangleShardChar(charCode, textRender, x, y, width, height) {
	var is90degTri = charCode >= 0x25E2 && charCode <= 0x25E5;
	var isIsoTri = charCode == 0x25B2 || charCode == 0x25BA || charCode == 0x25BC || charCode == 0x25C4;

	var vecIndex = charCode - 0x1FB3C;
	if(charCode >= 0x1FB9A && charCode <= 0x1FB9B) {
		vecIndex -= 42;
	} else if(is90degTri) {
		vecIndex = (charCode - 0x25E2) + 54;
	} else if(isIsoTri) {
		switch(charCode) {
			case 0x25B2: vecIndex = 58; break;
			case 0x25BA: vecIndex = 59; break;
			case 0x25BC: vecIndex = 60; break;
			case 0x25C4: vecIndex = 61; break;
		}
	}
	var vecs = lcsShardCharVectors[vecIndex];
	var gpX = [0, width / 2, width];
	var gpY = [0, height / 3, height / 2, (height / 3) * 2, height];
	textRender.beginPath();
	for(var i = 0; i < vecs.length; i++) {
		var vec = vecs[i];
		var gx = gpX[vec[0]];
		var gy = gpY[vec[1]];
		if(i == 0) {
			textRender.moveTo(x + gx, y + gy);
		} else {
			textRender.lineTo(x + gx, y + gy);
		}
	}
	textRender.closePath();
	textRender.fill();
}

function draw2by4Char(charCode, textRender, x, y, width, height) {
	var code = 0;
	if(charCode >= 0x1CD00 && charCode <= 0x1CDE5) {
		code = lcsOctantCharPoints[charCode - 0x1CD00];
	} else {
		switch(charCode) {
			case 0x1CEA8: code = 1; break;
			case 0x1CEAB: code = 2; break;
			case 0x1CEA3: code = 64; break;
			case 0x1CEA0: code = 128; break;
			case 0x1FBE6: code = 20; break;
			case 0x1FBE7: code = 40; break;
		}
	}
	if(!code) return false;
	textRender.beginPath();
	for(var py = 0; py < 4; py++) {
		for(var px = 0; px < 2; px++) {
			var idx = py * 2 + px;
			if(code >> idx & 1) {
				textRender.rect(x + px * (width / 2), y + py * (height / 4), width / 2, height / 4);
			}
		}
	}
	textRender.fill();
}

function drawFractionalBlockChar(charCode, textRender, x, y, width, height) {
	var transform = null;
	// basic fractional blocks
	if(charCode >= 0x2580 && charCode <= 0x2590) {
		transform = fracBlockTransforms[0][charCode - 0x2580];
	} else if(charCode >= 0x2594 && charCode <= 0x2595) {
		transform = fracBlockTransforms[1][charCode - 0x2594];
	} else if(charCode >= 0x1FB82 && charCode <= 0x1FB8B) {
		transform = fracBlockTransforms[2][charCode - 0x1FB82];
	}
	if(!transform) return;

	var dir = transform[0];
	var frac = transform[1];
	var x2 = x + width - 1;
	var y2 = y + height - 1;

	switch(dir) {
		case 0: x2 -= width - (width * frac); break;
		case 1: x += width - (width * frac); break;
		case 2: y2 -= height - (height * frac); break;
		case 3: y += height - (height * frac); break;
	}

	textRender.fillRect(x, y, x2 - x + 1, y2 - y + 1);
}

function drawBlockChar(charCode, textRender, x, y, cellW, cellH) {
	var isShade = charCode >= 0x2591 && charCode <= 0x2593;
	var isFractionalBlock = (charCode >= 0x2580 && charCode <= 0x2590) ||
							(charCode >= 0x2594 && charCode <= 0x2595) ||
							(charCode >= 0x1FB82 && charCode <= 0x1FB8B);
	var is2by2 = charCode >= 0x2596 && charCode <= 0x259F;
	var is2by3 = charCode >= 0x1FB00 && charCode <= 0x1FB3B;
	var is2by4 = (charCode >= 0x1CD00 && charCode <= 0x1CDE5) ||
					charCode == 0x1CEA8 || charCode == 0x1CEAB || charCode == 0x1CEA3 || 
					charCode == 0x1CEA0 || charCode == 0x1FBE6 || charCode == 0x1FBE7;
	var is90degTri = charCode >= 0x25E2 && charCode <= 0x25E5;
	var isIsoTri = charCode == 0x25B2 || charCode == 0x25BA || charCode == 0x25BC || charCode == 0x25C4;
	var isTriangleShard = (charCode >= 0x1FB3C && charCode <= 0x1FB6F) ||
							(charCode >= 0x1FB9A && charCode <= 0x1FB9B) ||
							(is90degTri || isIsoTri);

	if(isFractionalBlock) { // basic fractional blocks (full, half, n/8)
		drawFractionalBlockChar(charCode, textRender, x, y, cellW, cellH);
	} else if(is2by2) { // 2x2 blocks
		draw2by2Char(charCode, textRender, x, y, cellW, cellH);
	} else if(is2by3) { // 2x3 blocks
		draw2by3Char(charCode, textRender, x, y, cellW, cellH);
	} else if(isTriangleShard) { // LCS shard characters
		drawTriangleShardChar(charCode, textRender, x, y, cellW, cellH);
	} else if(is2by4) { // 2x4 LCS octant characters
		draw2by4Char(charCode, textRender, x, y, cellW, cellH);
	} else if(isShade) { // shades (light, medium, dark)
		drawShadeChar(charCode, textRender, x, y, cellW, cellH);
    }
}





function renderTile(tx, ty, content, color, bgcolor, cell_props, char, writability) {
	var textYOffset = cellH - (5 * opt.zoom);
	
	if(char) char = decodeCharProt(char);
	
	content = splitContent(content);
	
	var offX = offsetX + (canvasWidth/2) + (tx * 160) * opt.zoom;
	var offY = offsetY + (canvasHeight/2) + (ty * 144) * opt.zoom;
	
	if(writability == null) {
		writability = opt.worldWritability;
	}
	if(writability == 0) {
		ctx.fillStyle = styles.public;
	} else if(writability == 1) {
		ctx.fillStyle = styles.member;
	} else if(writability == 2) {
		ctx.fillStyle = styles.owner;
	}
	ctx.fillRect(offX, offY, 160 * opt.zoom, 144 * opt.zoom);
	
	if(char) {
		for(var y = 0; y < 8; y++) {
			for(var x = 0; x < 16; x++) {
				var idx = y * 16 + x;
				var chr = content[idx];
				
				var char_offX = offsetX + (canvasWidth/2) + (tx * 160 + x * 10) * opt.zoom;
				var char_offY = offsetY + (canvasHeight/2) + (ty * 144 + y * 18) * opt.zoom;
				
				var char_writability = writability;
				if(char && char[idx]) char_writability = char[idx];
				if(char_writability == null) char_writability = writability;
				if(char_writability == null) char_writability = opt.worldWritability;
				
				if(char) {
					if(char_writability == null) {
						char_writability = writability;
					}
					if(char_writability == 0) {
						ctx.fillStyle = styles.public;
					} else if(char_writability == 1) {
						ctx.fillStyle = styles.member;
					} else if(char_writability == 2) {
						ctx.fillStyle = styles.owner;
					}
					ctx.fillRect(char_offX, char_offY, 10 * opt.zoom, 18 * opt.zoom);
				}
			}
		}
	}
	
	if(bgcolor) {
		for(var y = 0; y < 8; y++) {
			for(var x = 0; x < 16; x++) {
				var idx = y * 16 + x;
				var bclr = bgcolor[idx];
				if(bclr == -1) continue;
				
				var char_offX = offsetX + (canvasWidth/2) + (tx * 160 + x * 10) * opt.zoom;
				var char_offY = offsetY + (canvasHeight/2) + (ty * 144 + y * 18) * opt.zoom;
				
				var r = (bclr >> 16) & 255;
				var g = (bclr >> 8) & 255;
				var b = bclr & 255;

				ctx.fillStyle = `rgb(${r},${g},${b})`;
				ctx.fillRect(char_offX, char_offY, 10 * opt.zoom, 18 * opt.zoom);
			}
		}
	}
	
	for(var y = 0; y < 8; y++) {
		for(var x = 0; x < 16; x++) {
			var idx = y * 16 + x;
			var chr = content[idx];
			
			var clr = color ? color[idx] : 0;
			var char_offX = offsetX + (canvasWidth/2) + (tx * 160 + x * 10) * opt.zoom;
			var char_offY = offsetY + (canvasHeight/2) + (ty * 144 + y * 18) * opt.zoom;
			var r = (clr >> 16) & 255;
			var g = (clr >> 8) & 255;
			var b = clr & 255;
			
			
			if(clr > 0) {
				ctx.fillStyle = `rgb(${r},${g},${b})`;
			} else {
				ctx.fillStyle = styles.text;
			}
			
			var deco = getCharTextDecorations(chr);
			chr = clearCharTextDecorations(chr);
			
			var lineDecoHeight = Math.max(Math.round(opt.zoom), 1);
			
			ctx.font = opt.fontSize + "px legacycomputing, '" + opt.font + "', sans-serif";
			if(deco) {
				ctx.font = opt.fontSize + "px '" + opt.font + "', sans-serif";
				if(deco.bold) ctx.font = "bold " + ctx.font;
				if(deco.italic) ctx.font = "italic " + ctx.font;
				if(deco.under) {
					ctx.fillRect(char_offX, Math.floor(char_offY + textYOffset + opt.zoom), cellW, lineDecoHeight);
				}
				if(deco.strike) {
					ctx.fillRect(char_offX, Math.floor(char_offY + Math.floor((16 * opt.zoom) / 2)), cellW, lineDecoHeight);
				}
			}
			
			var cCode = chr.codePointAt();
			
			var link = cell_props && cell_props[y] && cell_props[y][x] && cell_props[y][x].link;
			if(link && clr == 0) {
				if(link.type == "url") {
					ctx.fillStyle = opt.URLLinkColor;
				} else if(link.type == "coord") {
					ctx.fillStyle = opt.coordLinkColor;
				}
			}
			
			if(link) {
				ctx.fillRect(char_offX, Math.floor(char_offY + textYOffset + opt.zoom), cellW, lineDecoHeight);
			}
			
			var isBold = deco && deco.bold;
			var isItalic = deco && deco.italic;
			var isHalfShard = ((cCode >= 0x25E2 && cCode <= 0x25E5) ||
								cCode == 0x25B2 || cCode == 0x25C4 || cCode == 0x25BA || cCode == 0x25BC);
			
			if(isValidSpecialSymbol(cCode) && !(isHalfShard && !isBold)) {
				drawBlockChar(cCode, ctx, char_offX, char_offY, cellW, cellH);
			} else if(chr != "\u0020" && chr != "\u00a0") {
				ctx.fillText(chr, Math.floor(char_offX), Math.floor(char_offY + textYOffset));
			}
		}
	}
}


module.exports.render = function(settings) {
	var tiles = settings.tiles;
	var worldWritability = settings.worldWritability || 0;
	var coordX = settings.coordX || 0;
	var coordY = settings.coordY || 0;
	var zoom = settings.zoom || 1;
	var width = settings.width || 800;
	var height = settings.height || 600;
	var font = settings.font || "Courier New";
	var fontSize = settings.fontSize || 16;
	var ownerColor = settings.ownerColor || "#ddd";
	var memberColor = settings.memberColor || "#eee";
	var publicColor = settings.publicColor || "#fff";
	var textColor = settings.textColor || "#000";
	var glyphDrawingMode = settings.glyphDrawingMode || false;
	
	offset_coordX = coordX;
	offset_coordY = coordY;
	opt.zoom = zoom;
	opt.font = font;
	opt.fontSize = fontSize;
	opt.worldWritability = worldWritability;
	styles.owner = ownerColor;
	styles.member = memberColor;
	styles.public = publicColor;
	styles.text = textColor;
	
	if(canvasWidth != width || canvasHeight != height) {
		canvasWidth = width;
		canvasHeight = height;
		if(canvas) {
			canvas.height = 0;
			canvas = null;
			ctx = null;
		}
		canvas = createCanvas(canvasWidth, canvasHeight);
		ctx = canvas.getContext("2d");
	}
	
	applySettings();
	
	if(glyphDrawingMode) {
		ctx.textDrawingMode = "glyph";
	}
	
	ctx.fillStyle = styles.public;
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);
	
	if(Array.isArray(tiles)) {
		// world download (as an array of tiles)
		for(var i = 0; i < tiles.length; i++) {
			var tile = tiles[i];
			var tileX = tile.tileX;
			var tileY = tile.tileY;
			if(!isTileInRange(tileX, tileY)) continue;
			var properties = JSON.parse(tile.properties);
			var writability = tile.writability;
			renderTile(tileX, tileY, tile.content, properties.color, properties.bgcolor, properties.cell_props, properties.char, writability);
		}
	} else {
		// tile object (with "tileY,tileX" keying)
		for(var i in tiles) {
			var pos = i.split(",").map(Number);
			var tileX = pos[1];
			var tileY = pos[0];
			if(!isTileInRange(tileX, tileY)) continue;
			var tile = tiles[i];
			if(!tile) {
				continue;
			}
			renderTile(tileX, tileY, tile.content, tile.properties.color, tile.properties.bgcolor, tile.properties.cell_props, tile.properties.char, tile.properties.writability);
		}
	}
	
	return { canvas, ctx };
}