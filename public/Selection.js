class Selection {
	constructor(position, color) {
		this.position = position;
		this.color = color;
		this.elem = document.createElement('div');
	}
	update(trash,markerLayer,session,layerConfig) {
		var scrRange = this.position.toScreenRange(session);
		this.scrRange = scrRange;
		this.layerConfig = layerConfig;
		this.elem.innerHTML = '';

		var top = Math.min(markerLayer.$getTop(scrRange.start.row, layerConfig),markerLayer.$getTop(scrRange.end.row, layerConfig));
		var height = layerConfig.lineHeight;
		var width = 0, left = 0;

		if(scrRange.isMultiLine()) {
			left = scrRange.start.row < scrRange.end.row ? markerLayer.$padding + scrRange.start.column * layerConfig.characterWidth : markerLayer.$padding + scrRange.end.column * layerConfig.characterWidth;
			this.renderLine({height,top,left}, 'first');
			var inBetween = Math.max(scrRange.start.row,scrRange.end.row) - Math.min(scrRange.start.row,scrRange.end.row) - 1;
			left = markerLayer.$padding;
			if(inBetween > 0) {
				this.renderLine({height:height*inBetween,top:top+height,left},'mid');
			}
			top = Math.max(markerLayer.$getTop(scrRange.start.row, layerConfig),markerLayer.$getTop(scrRange.end.row, layerConfig));
			width = scrRange.start.row < scrRange.end.row ? scrRange.end.column * layerConfig.characterWidth : scrRange.start.column * layerConfig.characterWidth;
			this.renderLine({top,width,height,left}, 'last');
		}
		else {
			left = Math.min(markerLayer.$padding + scrRange.start.column * layerConfig.characterWidth,markerLayer.$padding + scrRange.end.column * layerConfig.characterWidth);
			width = Math.abs(scrRange.start.column - scrRange.end.column) * layerConfig.characterWidth;
			this.renderLine({height,width,top,left}, 'singular');
		}
		this.elem.remove();
    markerLayer.elt("slice_selection", "");
    const parentNode = markerLayer.element.childNodes[markerLayer.i - 1] || markerLayer.element.lastChild;
    parentNode.appendChild(this.elem);
	}
	renderLine(bounds,place) {
    var line = document.createElement("div");
    line.style.position = 'absolute';
		line.style.zIndex = 5;
    line.style.backgroundColor = this.color;
		line.style.opacity = .1;
		line.style.left = bounds.left + 'px';
		line.style.top = bounds.top + 'px';
		line.style.height = bounds.height + 'px';
		if(!isNaN(bounds.width)) {line.style.width = bounds.width + 'px';}
		else {line.style.right = '0px';}
		if(place === 'first') {line.style.borderRadius = '2px 0 0 0';}
		else if(place === 'last') {line.style.borderRadius = '0 0 2px 2px';}
		else if(place === 'singular') {line.style.borderRadius = '2px';}
		else {
			var first = this.position.start.row < this.position.end.row ? this.scrRange.start : this.scrRange.end;
			if(bounds.left < first.column * this.layerConfig.characterWidth) {
				line.style.borderRadius = '2px 0 0 0';
			}
		}
    this.elem.append(line);
	}
	remove(session) {
		this.elem.remove();
		session.removeMarker(this.id);
	}
}